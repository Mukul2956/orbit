"""
Scheduler tasks – periodic queue maintenance and batch dispatch.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime

from app.tasks import celery_app

logger = logging.getLogger(__name__)


def _run(coro):
    """Run an async coroutine from a sync Celery task."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ─── Helper to get an async DB session inside a Celery task ─────────────────

async def _get_session():
    from app.database import AsyncSessionLocal
    return AsyncSessionLocal()


# ─── Tasks ───────────────────────────────────────────────────────────────────

@celery_app.task(name="app.tasks.scheduler.update_queue_priorities")
def update_queue_priorities():
    """
    Hourly: apply relevance decay to all pending queue items.
    In a real multi-tenant system we'd page through all users.
    """
    async def _inner():
        from app.services.queue_manager import QueueManager
        from app.models.content_queue import ContentQueue
        from sqlalchemy import select

        async with await _get_session() as db:
            # Get distinct user IDs with pending items
            stmt = select(ContentQueue.user_id).where(ContentQueue.status == "pending").distinct()
            result = await db.execute(stmt)
            user_ids = [row[0] for row in result.fetchall()]

            total_updated = 0
            for user_id in user_ids:
                qm = QueueManager(db)
                n = await qm.apply_decay_to_all(user_id)
                total_updated += n
            await db.commit()

        logger.info("Priority decay applied; %d entries updated.", total_updated)
        return {"updated": total_updated, "timestamp": datetime.utcnow().isoformat()}

    return _run(_inner())


@celery_app.task(name="app.tasks.scheduler.schedule_next_batch")
def schedule_next_batch():
    """
    Every 15 min: find queue items that are ready to publish and fire
    individual publish tasks.
    """
    async def _inner():
        from app.services.queue_manager import QueueManager
        from app.models.content_queue import ContentQueue
        from sqlalchemy import select

        async with await _get_session() as db:
            stmt = select(ContentQueue.user_id).where(ContentQueue.status == "pending").distinct()
            result = await db.execute(stmt)
            user_ids = [row[0] for row in result.fetchall()]

            dispatched = 0
            for user_id in user_ids:
                qm = QueueManager(db)
                items = await qm.get_next_ready(user_id, limit=20)
                for item in items:
                    from app.tasks.publisher import publish_content
                    publish_content.delay(str(item.id))
                    dispatched += 1

        logger.info("Dispatched %d publish tasks.", dispatched)
        return {"dispatched": dispatched}

    return _run(_inner())


@celery_app.task(name="app.tasks.scheduler.republish_evergreen_content")
def republish_evergreen_content():
    """Daily: re-queue evergreen content that is due for republishing."""
    async def _inner():
        from app.services.repurposing_engine import RepurposingEngine
        from app.models.content_queue import ContentQueue
        from sqlalchemy import select

        async with await _get_session() as db:
            stmt = select(ContentQueue.user_id).distinct()
            result = await db.execute(stmt)
            user_ids = [row[0] for row in result.fetchall()]

            requeued = 0
            for user_id in user_ids:
                engine = RepurposingEngine(db)
                due = await engine.get_due_for_republish(user_id)
                for entry in due:
                    await engine.schedule_republish(entry, platforms=list(entry.performance_history.get("platforms", ["linkedin"])))
                    requeued += 1
            await db.commit()

        logger.info("Re-queued %d evergreen items.", requeued)
        return {"requeued": requeued}

    return _run(_inner())
