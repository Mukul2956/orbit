"""
Monitor tasks – detect platform algorithm changes.
"""

from __future__ import annotations

import asyncio
import logging

from app.tasks import celery_app

logger = logging.getLogger(__name__)

PLATFORMS = ["reddit", "linkedin", "youtube"]


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


async def _get_session():
    from app.database import AsyncSessionLocal
    return AsyncSessionLocal()


@celery_app.task(name="app.tasks.monitor.check_algorithm_changes")
def check_algorithm_changes():
    """Daily: run AlgorithmMonitor across all platforms."""
    async def _inner():
        from app.services.algorithm_monitor import AlgorithmMonitor

        all_changes: dict[str, list] = {}
        async with await _get_session() as db:
            monitor = AlgorithmMonitor(db)
            for platform in PLATFORMS:
                changes = await monitor.detect_changes(platform)
                all_changes[platform] = changes
                if changes:
                    logger.warning(
                        "%d algorithm anomalies detected on %s", len(changes), platform
                    )
            await db.commit()
        return all_changes

    return _run(_inner())
