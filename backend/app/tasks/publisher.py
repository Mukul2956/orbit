"""
Publisher tasks – execute the actual cross-platform publish workflow.
"""

from __future__ import annotations

import asyncio
import logging
import uuid

from app.tasks import celery_app

logger = logging.getLogger(__name__)


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


async def _get_session():
    from app.database import AsyncSessionLocal
    return AsyncSessionLocal()


@celery_app.task(
    name="app.tasks.publisher.publish_content",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def publish_content(self, queue_entry_id: str, content_data: dict | None = None):
    """
    Publish a single queue entry across all its configured platforms.
    Retries up to 3 times with exponential back-off on failure.
    """
    async def _inner():
        from app.services.orchestrator import CrossPlatformOrchestrator

        async with await _get_session() as db:
            orchestrator = CrossPlatformOrchestrator(db)
            result = await orchestrator.orchestrate(
                uuid.UUID(queue_entry_id),
                content_data=content_data,
            )
            await db.commit()
        return result

    try:
        logger.info("Publishing queue entry %s …", queue_entry_id)
        result = _run(_inner())
        logger.info("Queue entry %s publish result: %s", queue_entry_id, result)
        return result
    except Exception as exc:
        logger.error("Publish failed for %s: %s", queue_entry_id, exc)
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)
