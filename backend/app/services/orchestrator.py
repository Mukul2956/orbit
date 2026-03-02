"""
CrossPlatformOrchestrator – coordinates multi-platform publishing.

Flow:
1. Load the ContentQueue entry.
2. Sort platforms by their scheduled_time.
3. Publish to each platform in order (waiting for the right moment if needed).
4. Update queue status after every attempt.
5. Log each action to distribution_log.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import settings
from app.models.content_queue import ContentQueue
from app.models.distribution_log import DistributionLog

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ─── Placeholder content object (will come from FORGE / Content DNA) ────────

class ContentDTO:
    """Lightweight content container passed to platform publishers."""

    def __init__(self, data: dict) -> None:
        self.id: uuid.UUID = data.get("id", uuid.uuid4())
        self.text: str = data.get("text", "")
        self.media_urls: list[str] = data.get("media_urls", [])
        self.hashtags: list[str] = data.get("hashtags", [])
        self.content_type: str = data.get("content_type", "text")
        self.title: str = data.get("title", "")
        self.description: str = data.get("description", "")


# ─── Orchestrator ────────────────────────────────────────────────────────────

class CrossPlatformOrchestrator:
    """
    Orchestrates the full cross-platform publish workflow for one queue entry.
    """

    INTER_PLATFORM_DELAY_SECONDS: int = 45  # strategic delay between platforms

    def __init__(self, db: "AsyncSession") -> None:
        self.db = db
        self._publishers: dict | None = None  # lazy-loaded

    def _get_publishers(self) -> dict:
        """Lazy-load platform publishers to avoid import cycles."""
        if self._publishers is None:
            from app.integrations.linkedin import LinkedInPublisher
            from app.integrations.youtube import YouTubePublisher

            self._publishers = {
                "linkedin": LinkedInPublisher(),
                "youtube": YouTubePublisher(),
            }
        return self._publishers

    # ─── Public API ──────────────────────────────────────────────────────────

    async def orchestrate(
        self,
        queue_entry_id: uuid.UUID,
        content_data: dict | None = None,
    ) -> dict[str, Any]:
        """
        Main entry point.  Returns a dict keyed by platform::

            {
                "twitter": {"status": "success", "post_id": "...", ...},
                "instagram": {"status": "failed", "error": "..."},
            }
        """
        from sqlalchemy import select
        from app.models.content_queue import ContentQueue

        stmt = select(ContentQueue).where(ContentQueue.id == queue_entry_id)
        row = await self.db.execute(stmt)
        entry: ContentQueue | None = row.scalar_one_or_none()

        if not entry:
            raise ValueError(f"Queue entry {queue_entry_id} not found")

        if entry.requires_approval and not entry.approved_at:
            logger.info("Skipping %s – awaiting approval.", queue_entry_id)
            return {}

        content = ContentDTO(content_data or {})
        platform_schedule = entry.platforms  # dict[platform -> {scheduled_time, status, ...}]

        # Sort by scheduled_time ascending
        sorted_platforms = sorted(
            platform_schedule.items(),
            key=lambda x: x[1].get("scheduled_time", ""),
        )

        results: dict[str, Any] = {}

        for platform, schedule in sorted_platforms:
            if schedule.get("status") in ("published", "skipped"):
                continue

            # Wait until the right time
            scheduled_str = schedule.get("scheduled_time")
            if scheduled_str:
                target = datetime.fromisoformat(scheduled_str)
                diff = (target - datetime.utcnow()).total_seconds()
                if diff > 0:
                    logger.info("Waiting %.0fs before publishing to %s …", diff, platform)
                    await asyncio.sleep(min(diff, 30))  # cap to 30s during hackathon demo

            # Attempt publish
            result = await self._safe_publish(platform, content, entry.user_id)
            results[platform] = result

            # Persist per-platform state
            await self._update_platform_state(entry, platform, result)

            # Log audit trail
            await self._log(entry.id, entry.content_id, platform, result)

            # Tactical delay between platforms
            if platform != sorted_platforms[-1][0]:
                await asyncio.sleep(self.INTER_PLATFORM_DELAY_SECONDS)

        # Overall queue status
        statuses = [r.get("status") for r in results.values()]
        if all(s == "success" for s in statuses):
            entry.status = "published"
        elif any(s == "success" for s in statuses):
            entry.status = "partial"
        else:
            entry.status = "failed"

        await self.db.flush()
        return results

    # ─── Internal helpers ────────────────────────────────────────────────────

    async def _safe_publish(
        self, platform: str, content: ContentDTO, user_id: uuid.UUID
    ) -> dict:
        """Publish to one platform; returns a result dict (never raises)."""
        publishers = self._get_publishers()
        publisher = publishers.get(platform)
        if not publisher:
            return {"status": "failed", "error": f"No publisher for '{platform}'"}

        config = await self._get_platform_config(user_id, platform)
        if not config:
            return {"status": "failed", "error": "Platform not connected – missing credentials"}

        formatted = self._format_content(content, platform)

        try:
            result = await publisher.publish(config.access_token, formatted)
            return {
                "status": "success",
                "post_id": result.get("id"),
                "post_url": result.get("url"),
                "published_at": datetime.utcnow().isoformat(),
            }
        except Exception as exc:
            logger.error("Publishing to %s failed: %s", platform, exc)
            return {"status": "failed", "error": str(exc), "attempted_at": datetime.utcnow().isoformat()}

    async def _get_platform_config(self, user_id: uuid.UUID, platform: str):
        from sqlalchemy import select
        from app.models.platform_config import PlatformConfig

        stmt = select(PlatformConfig).where(
            PlatformConfig.user_id == user_id,
            PlatformConfig.platform == platform,
            PlatformConfig.is_active == True,  # noqa: E712
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    def _format_content(content: ContentDTO, platform: str) -> dict:
        """Format content according to each platform's constraints."""
        formatters = {
            "reddit": lambda c: {
                "title": (c.title or c.text[:300]),
                "text": c.text[:40000],
                "subreddit": c.subreddit if hasattr(c, "subreddit") else "test",
            },
            "linkedin": lambda c: {
                "text": c.text[:3000],
                "media": c.media_urls[:1] or None,
            },
            "youtube": lambda c: {
                "title": c.title[:100],
                "description": c.description[:5000],
                "video_url": c.media_urls[0] if c.media_urls else None,
            },
        }
        formatter = formatters.get(platform, lambda c: {"text": c.text})
        return formatter(content)

    async def _update_platform_state(
        self, entry: ContentQueue, platform: str, result: dict
    ) -> None:
        platforms_copy = dict(entry.platforms)
        platforms_copy[platform] = {**platforms_copy.get(platform, {}), **result}
        entry.platforms = platforms_copy

    async def _log(
        self,
        queue_id: uuid.UUID,
        content_id: uuid.UUID,
        platform: str,
        result: dict,
    ) -> None:
        action = result.get("status", "unknown")
        log_entry = DistributionLog(
            queue_id=queue_id,
            content_id=content_id,
            platform=platform,
            action=action,
            result=result,
        )
        self.db.add(log_entry)
        await self.db.flush()
