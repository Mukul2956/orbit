"""
RepurposingEngine – identifies evergreen content and schedules re-distribution.

Scoring heuristics:
- High engagement score relative to mean  → higher evergreen score
- Wide time spread of engagement          → content ages well
- Not time-sensitive                      → qualifies for recycling
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import select

from app.models.algorithm_change import EvergreenContent

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class RepurposingEngine:
    """
    Analyses published content performance and marks high-performers as
    evergreen, then automatically re-queues them after a configurable interval.
    """

    DEFAULT_REPUBLISH_DAYS = 90
    EVERGREEN_SCORE_THRESHOLD = 0.65

    def __init__(self, db: "AsyncSession") -> None:
        self.db = db

    # ─── Public API ──────────────────────────────────────────────────────────

    async def evaluate_content(
        self,
        content_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict:
        """
        Calculate an evergreen score for a piece of content and persist it.
        Returns the score dict.
        """
        scores = await self._gather_performance(content_id)
        evergreen_score = self._compute_evergreen_score(scores)

        # Upsert in evergreen_content table
        existing_stmt = select(EvergreenContent).where(
            EvergreenContent.content_id == content_id
        )
        result = await self.db.execute(existing_stmt)
        record: EvergreenContent | None = result.scalar_one_or_none()

        next_publish = datetime.utcnow() + timedelta(days=self.DEFAULT_REPUBLISH_DAYS)

        if record:
            record.evergreen_score = evergreen_score
            record.next_publish_date = next_publish
            record.performance_history = scores
            record.active = evergreen_score >= self.EVERGREEN_SCORE_THRESHOLD
        else:
            record = EvergreenContent(
                content_id=content_id,
                user_id=user_id,
                evergreen_score=evergreen_score,
                republish_interval_days=self.DEFAULT_REPUBLISH_DAYS,
                next_publish_date=next_publish,
                performance_history=scores,
                active=evergreen_score >= self.EVERGREEN_SCORE_THRESHOLD,
            )
            self.db.add(record)

        await self.db.flush()

        return {
            "content_id": str(content_id),
            "evergreen_score": round(evergreen_score, 3),
            "qualifies": evergreen_score >= self.EVERGREEN_SCORE_THRESHOLD,
            "next_publish_date": next_publish.isoformat(),
        }

    async def get_due_for_republish(self, user_id: uuid.UUID) -> list[EvergreenContent]:
        """Return all evergreen entries whose next_publish_date has passed."""
        stmt = select(EvergreenContent).where(
            EvergreenContent.user_id == user_id,
            EvergreenContent.active == True,  # noqa: E712
            EvergreenContent.next_publish_date <= datetime.utcnow(),
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def schedule_republish(
        self,
        evergreen_entry: EvergreenContent,
        platforms: list[str],
    ) -> uuid.UUID:
        """Re-queue an evergreen piece of content."""
        from app.services.queue_manager import QueueManager

        qm = QueueManager(self.db)
        queue_id = await qm.add_to_queue(
            content_id=evergreen_entry.content_id,
            user_id=evergreen_entry.user_id,
            platforms=platforms,
            is_evergreen=True,
        )

        # Update next publish window
        evergreen_entry.last_published = datetime.utcnow()
        evergreen_entry.next_publish_date = datetime.utcnow() + timedelta(
            days=evergreen_entry.republish_interval_days
        )
        await self.db.flush()

        logger.info(
            "Re-queued evergreen content %s → queue %s",
            evergreen_entry.content_id, queue_id,
        )
        return queue_id

    # ─── Internals ───────────────────────────────────────────────────────────

    async def _gather_performance(self, content_id: uuid.UUID) -> dict:
        from app.models.platform_performance import PlatformPerformance

        stmt = select(PlatformPerformance).where(
            PlatformPerformance.content_id == content_id
        )
        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        if not rows:
            return {}

        return {
            "total_reach": sum(r.reach for r in rows),
            "avg_engagement_score": sum(r.engagement_score for r in rows) / len(rows),
            "total_clicks": sum(r.clicks for r in rows),
            "total_shares": sum(r.shares for r in rows),
            "platforms": list({r.platform for r in rows}),
            "publish_count": len(rows),
        }

    @staticmethod
    def _compute_evergreen_score(scores: dict) -> float:
        if not scores:
            return 0.0

        avg_eng = scores.get("avg_engagement_score", 0)
        reach_factor = min(1.0, scores.get("total_reach", 0) / 10_000)
        click_factor = min(1.0, scores.get("total_clicks", 0) / 1_000)
        platform_breadth = min(1.0, len(scores.get("platforms", [])) / 5)

        score = (
            0.40 * avg_eng
            + 0.25 * reach_factor
            + 0.20 * click_factor
            + 0.15 * platform_breadth
        )
        return min(1.0, max(0.0, score))
