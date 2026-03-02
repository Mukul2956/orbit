"""
QueueManager – adds, retrieves, prioritises, and ages the content queue.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import select, update

from app.config import settings
from app.models.content_queue import ContentQueue

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class QueueManager:
    """
    Manages the lifecycle of every ContentQueue entry.

    - add_to_queue   – creates a new entry (calls TimingEngine internally)
    - get_next       – fetches entries ready to be published now
    - update_status  – moves status forward/backward
    - apply_decay    – ages priority scores based on relevance decay
    """

    def __init__(self, db: "AsyncSession") -> None:
        self.db = db

    # ─── Public API ──────────────────────────────────────────────────────────

    async def add_to_queue(
        self,
        content_id: uuid.UUID,
        user_id: uuid.UUID,
        platforms: list[str],
        scheduled_time: datetime | None = None,
        priority: float | None = None,
        requires_approval: bool = False,
        is_time_sensitive: bool = False,
        is_evergreen: bool = False,
        content_type: str = "general",
    ) -> uuid.UUID:
        """
        Create a new queue entry and return its UUID.
        Calls TimingEngine per-platform unless `scheduled_time` is supplied.
        """
        from app.services.timing_engine import TimingEngine

        timing = TimingEngine(self.db)

        # Calculate priority if not provided
        if priority is None:
            priority = self._calculate_initial_priority(is_time_sensitive, is_evergreen)
        elif isinstance(priority, int) and priority > 1:
            # Normalize from 1-10 user scale to 0.0-1.0 internal float
            priority = (priority - 1) / 9.0

        decay_rate = self._build_decay_rate(is_time_sensitive, is_evergreen)

        # Build platform schedule
        platform_schedule: dict = {}
        earliest_time: datetime | None = scheduled_time

        for platform in platforms:
            if scheduled_time:
                slot = scheduled_time
                is_default = False
            else:
                result = await timing.get_optimal_time(
                    str(user_id), platform, content_type
                )
                slot = result["optimal_time"]
                is_default = result["is_default_time"]

            platform_schedule[platform] = {
                "status": "pending",
                "scheduled_time": slot.isoformat(),
                "is_default_time": is_default,
                "post_id": None,
            }

            if earliest_time is None or slot < earliest_time:
                earliest_time = slot

        entry = ContentQueue(
            content_id=content_id,
            user_id=user_id,
            priority_score=priority,
            relevance_decay_rate=decay_rate,
            optimal_publish_time=earliest_time,
            platforms=platform_schedule,
            requires_approval=requires_approval,
            status="pending",
        )

        self.db.add(entry)
        await self.db.flush()  # get the generated id without full commit
        logger.info("Queued content %s for user %s on platforms %s", content_id, user_id, platforms)
        return entry.id

    async def get_next_ready(
        self, user_id: uuid.UUID, limit: int = 10
    ) -> list[ContentQueue]:
        """
        Return up to `limit` entries that:
        - are pending
        - have optimal_publish_time within the next 15 minutes
        - ordered by priority DESC, publish_time ASC
        """
        from sqlalchemy.sql.expression import func

        stmt = (
            select(ContentQueue)
            .where(
                ContentQueue.user_id == user_id,
                ContentQueue.status == "pending",
                ContentQueue.optimal_publish_time
                <= func.now() + __import__("sqlalchemy").text("INTERVAL '15 minutes'"),
            )
            .order_by(
                ContentQueue.priority_score.desc(),
                ContentQueue.optimal_publish_time.asc(),
            )
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, queue_id: uuid.UUID) -> ContentQueue | None:
        stmt = select(ContentQueue).where(ContentQueue.id == queue_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        status: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ContentQueue]:
        stmt = (
            select(ContentQueue)
            .where(ContentQueue.user_id == user_id)
            .order_by(ContentQueue.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if status:
            stmt = stmt.where(ContentQueue.status == status)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_status(
        self,
        queue_id: uuid.UUID,
        status: str,
        platform: str | None = None,
        platform_data: dict | None = None,
        error: str | None = None,
    ) -> None:
        """Update queue entry status (optionally update per-platform data too)."""
        entry = await self.get_by_id(queue_id)
        if not entry:
            raise ValueError(f"Queue entry {queue_id} not found")

        entry.status = status
        if error:
            entry.last_error = error

        if platform and platform_data and isinstance(entry.platforms, dict):
            platforms_copy = dict(entry.platforms)
            platforms_copy[platform] = {**platforms_copy.get(platform, {}), **platform_data}
            entry.platforms = platforms_copy

        await self.db.flush()

    async def apply_decay_to_all(self, user_id: uuid.UUID) -> int:
        """
        Recalculate priority for all pending entries belonging to a user.
        Returns the number of entries updated.
        """
        entries = await self.list_for_user(user_id, status="pending", limit=500)
        updated = 0
        for entry in entries:
            new_priority = self._decay_priority(
                entry.priority_score,
                entry.relevance_decay_rate,
                entry.created_at,
            )
            if abs(new_priority - entry.priority_score) > 0.001:
                entry.priority_score = new_priority
                updated += 1

        await self.db.flush()
        return updated

    async def cancel(self, queue_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        entry = await self.get_by_id(queue_id)
        if not entry or entry.user_id != user_id:
            return False
        if entry.status in ("published", "cancelled"):
            return False
        entry.status = "cancelled"
        await self.db.flush()
        return True

    # ─── Internal helpers ────────────────────────────────────────────────────

    @staticmethod
    def _calculate_initial_priority(is_time_sensitive: bool, is_evergreen: bool) -> float:
        if is_time_sensitive:
            return 0.9
        if is_evergreen:
            return 0.4
        return 0.6

    @staticmethod
    def _build_decay_rate(is_time_sensitive: bool, is_evergreen: bool) -> float:
        if is_time_sensitive:
            return 0.10   # drops 10% per hour
        if is_evergreen:
            return 0.001  # almost no decay
        return settings.RELEVANCE_DECAY_DEFAULT

    @staticmethod
    def _decay_priority(
        current_priority: float,
        decay_rate: float,
        created_at: datetime,
    ) -> float:
        hours_elapsed = (datetime.utcnow() - created_at).total_seconds() / 3600
        decayed = current_priority - (decay_rate * hours_elapsed)
        return max(0.05, round(decayed, 4))
