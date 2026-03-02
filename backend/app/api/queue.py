"""
/api/v1/queue – CRUD and status management for the content distribution queue.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.queue import (
    QueueCreate,
    QueueCreateResponse,
    QueueResponse,
)
from app.services.queue_manager import QueueManager

router = APIRouter(prefix="/api/v1/queue", tags=["Queue"])


# ─── Create ──────────────────────────────────────────────────────────────────

@router.post("/", response_model=QueueCreateResponse, status_code=status.HTTP_201_CREATED)
async def add_to_queue(
    body: QueueCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a piece of content to the distribution queue."""
    qm = QueueManager(db)
    queue_id = await qm.add_to_queue(
        content_id=body.content_id,
        user_id=body.user_id,
        platforms=body.platforms,
        scheduled_time=body.scheduled_time,
        priority=body.priority,
        requires_approval=body.requires_approval,
        is_time_sensitive=body.is_time_sensitive,
        is_evergreen=body.is_evergreen,
        content_type=body.content_type,
    )
    return QueueCreateResponse(
        queue_id=queue_id, status="pending", message="Content queued successfully"
    )


# ─── Read ────────────────────────────────────────────────────────────────────

@router.get("/{queue_id}", response_model=QueueResponse)
async def get_queue_entry(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single queue entry by ID."""
    qm = QueueManager(db)
    entry = await qm.get_by_id(queue_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    return entry


@router.get("/user/{user_id}", response_model=list[QueueResponse])
async def list_user_queue(
    user_id: uuid.UUID,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all queue entries for a user, optionally filtered by status."""
    qm = QueueManager(db)
    items = await qm.list_for_user(user_id, status=status, skip=skip, limit=limit)
    return items


# ─── Cancel ──────────────────────────────────────────────────────────────────

@router.delete("/{queue_id}")
async def cancel_queue_entry(
    queue_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending queue entry."""
    qm = QueueManager(db)
    success = await qm.cancel(queue_id, user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot cancel this entry")
    return {"message": "Queue entry cancelled"}


# ─── Approve ─────────────────────────────────────────────────────────────────

@router.post("/{queue_id}/approve")
async def approve_queue_entry(
    queue_id: uuid.UUID,
    approved_by: str,
    db: AsyncSession = Depends(get_db),
):
    """Mark a queue entry as approved (moves it to schedulable state)."""
    from datetime import datetime
    qm = QueueManager(db)
    entry = await qm.get_by_id(queue_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    entry.approved_by = approved_by
    entry.approved_at = datetime.utcnow()
    await db.flush()
    return {"message": "Approved", "queue_id": str(queue_id)}
