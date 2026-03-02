"""
ORBIT – Intelligent Distribution & Scheduling Nexus
FastAPI application entrypoint.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    analytics_router,
    queue_router,
    schedule_router,
    reddit_router,
    auth_router,
    platforms_router,
    youtube_router,
    ingest_router,
    content_router,
)
from app.config import settings

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description=(
        "ORBIT is SYNAPSE's intelligent content distribution engine. "
        "It predicts optimal posting times, manages multi-platform queues, "
        "and orchestrates publishing workflows."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS (loosen for hackathon demo; tighten for production) ───────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(queue_router)
app.include_router(schedule_router)
app.include_router(analytics_router)
app.include_router(reddit_router)
app.include_router(auth_router)
app.include_router(platforms_router)
app.include_router(youtube_router)
app.include_router(ingest_router)
app.include_router(content_router)


# ─── APScheduler: auto-publish items that are due ────────────────────────────
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore

_scheduler: AsyncIOScheduler | None = None
logger_main = __import__("logging").getLogger("orbit.scheduler")

async def _auto_publish_tick():
    """Every 5 min: fetch pending queue items whose time has arrived and publish them."""
    try:
        from app.database import AsyncSessionLocal
        from app.services.queue_manager import QueueManager
        from app.services.orchestrator import CrossPlatformOrchestrator
        import uuid as _uuid

        # Use demo user for now; extend to all active users when auth is live
        DEMO_USER = _uuid.UUID("00000000-0000-0000-0000-000000000001")

        async with AsyncSessionLocal() as db:
            qm = QueueManager(db)
            due = await qm.get_next_ready(DEMO_USER, limit=10)
            if not due:
                return
            logger_main.info("Auto-publish tick: %d item(s) due", len(due))
            orch = CrossPlatformOrchestrator(db)
            for entry in due:
                try:
                    result = await orch.orchestrate(entry.id)
                    await db.commit()
                    logger_main.info("Published queue entry %s → %s", entry.id, result)
                except Exception as exc:
                    await db.rollback()
                    logger_main.warning("Failed to publish %s: %s", entry.id, exc)
    except Exception as exc:
        logger_main.warning("Auto-publish tick error: %s", exc)


@app.on_event("startup")
async def start_scheduler():
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(_auto_publish_tick, "interval", minutes=5, id="auto_publish")
    _scheduler.start()
    logger_main.info("APScheduler started — auto-publish checks every 5 minutes.")


@app.on_event("shutdown")
async def stop_scheduler():
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)


# ─── Health / status ─────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "ORBIT", "version": settings.APP_VERSION}


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "ORBIT",
        "description": "Intelligent Distribution & Scheduling Nexus",
        "docs": "/docs",
    }
