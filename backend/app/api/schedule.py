"""
/api/v1/schedule – optimal timing predictions and direct publish triggers.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.queue import OptimalTimeResponse, PublishResult
from app.services.orchestrator import CrossPlatformOrchestrator
from app.services.timing_engine import TimingEngine

router = APIRouter(prefix="/api/v1/schedule", tags=["Schedule"])


@router.get("/optimal-time", response_model=OptimalTimeResponse)
async def get_optimal_time(
    user_id: uuid.UUID,
    platform: str,
    content_type: str = "general",
    timezone: str = "UTC",
    db: AsyncSession = Depends(get_db),
):
    """Return the ML-predicted optimal posting time for a given platform."""
    engine = TimingEngine(db)
    result = await engine.get_optimal_time(
        str(user_id), platform, content_type, target_tz=timezone
    )
    return OptimalTimeResponse(
        platform=platform,
        optimal_time=result["optimal_time"],
        confidence_score=result["confidence_score"],
        is_default_time=result["is_default_time"],
        reasoning=result.get("reasoning"),
    )


@router.get("/top-slots")
async def get_top_slots(
    user_id: uuid.UUID,
    platform: str,
    n: int = 5,
    db: AsyncSession = Depends(get_db),
):
    """Return the top-n ranked posting slots for a platform (7-day window)."""
    engine = TimingEngine(db)
    slots = await engine.get_top_slots(str(user_id), platform, n=n)
    return {"platform": platform, "slots": slots}


@router.post("/publish-now/{queue_id}")
async def publish_now(
    queue_id: uuid.UUID,
    content_data: dict | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Immediately trigger publishing for a queued item (bypass scheduled time)."""
    orchestrator = CrossPlatformOrchestrator(db)
    try:
        result = await orchestrator.orchestrate(queue_id, content_data=content_data)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"queue_id": str(queue_id), "results": result}


@router.post("/publish-async/{queue_id}")
async def publish_async(
    queue_id: uuid.UUID,
):
    """Enqueue a publish task via Celery (non-blocking)."""
    from app.tasks.publisher import publish_content

    task = publish_content.delay(str(queue_id))
    return {"task_id": task.id, "status": "queued", "queue_id": str(queue_id)}
