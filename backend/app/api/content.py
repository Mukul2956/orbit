"""
/api/v1/content – CRUD for content drafts.

Flow:
  1. POST /  →  create draft, returns content_id
  2. POST /{id}/queue  →  send draft to QueueManager (calls TimingEngine),
                          returns queue_id + optimal_publish_time
  3. GET /user/{user_id}  →  list drafts with their queue status
  4. PATCH /{id}  →  update title/body/type before queuing
  5. DELETE /{id}  →  delete a draft (only if not yet published)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.content_draft import ContentDraft

router = APIRouter(prefix="/api/v1/content", tags=["Content"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class DraftCreate(BaseModel):
    user_id: uuid.UUID
    title: str = Field(..., min_length=1, max_length=500)
    body: str | None = None
    content_type: str = "text"
    is_evergreen: bool = False
    is_time_sensitive: bool = False
    post_metadata: dict = Field(default_factory=dict)


class DraftUpdate(BaseModel):
    title: str | None = Field(None, max_length=500)
    body: str | None = None
    content_type: str | None = None
    is_evergreen: bool | None = None
    is_time_sensitive: bool | None = None
    post_metadata: dict | None = None


class DraftQueueRequest(BaseModel):
    platforms: list[str] = Field(..., min_length=1)
    scheduled_time: datetime | None = None
    priority: int | None = Field(None, ge=1, le=10)


class DraftResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    body: str | None
    content_type: str
    status: str
    is_evergreen: bool
    is_time_sensitive: bool
    post_metadata: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QueuedDraftResponse(BaseModel):
    content_id: uuid.UUID
    queue_id: uuid.UUID
    status: str
    optimal_publish_time: datetime | None
    platforms: dict[str, Any]
    message: str


# ─── Create ──────────────────────────────────────────────────────────────────

@router.post("/", response_model=DraftResponse, status_code=status.HTTP_201_CREATED)
async def create_draft(body: DraftCreate, db: AsyncSession = Depends(get_db)):
    """Create a new content draft."""
    draft = ContentDraft(
        user_id=body.user_id,
        title=body.title,
        body=body.body,
        content_type=body.content_type,
        is_evergreen=body.is_evergreen,
        is_time_sensitive=body.is_time_sensitive,
        post_metadata=body.post_metadata,
        status="draft",
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


# ─── Queue a draft ───────────────────────────────────────────────────────────

@router.post("/{content_id}/queue", response_model=QueuedDraftResponse)
async def queue_draft(
    content_id: uuid.UUID,
    body: DraftQueueRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a draft to the distribution queue. Calls TimingEngine for optimal time."""
    from app.services.queue_manager import QueueManager

    # Load draft
    result = await db.execute(select(ContentDraft).where(ContentDraft.id == content_id))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status == "published":
        raise HTTPException(status_code=400, detail="Already published")

    qm = QueueManager(db)
    queue_id = await qm.add_to_queue(
        content_id=content_id,
        user_id=draft.user_id,
        platforms=body.platforms,
        scheduled_time=body.scheduled_time,
        priority=body.priority,
        is_time_sensitive=draft.is_time_sensitive,
        is_evergreen=draft.is_evergreen,
        content_type=draft.content_type,
    )

    # Load the created queue entry to get back the optimal time + platforms
    from app.models.content_queue import ContentQueue
    q_result = await db.execute(select(ContentQueue).where(ContentQueue.id == queue_id))
    entry = q_result.scalar_one_or_none()

    # Mark draft as queued
    draft.status = "queued"
    draft.updated_at = datetime.utcnow()
    await db.commit()

    return QueuedDraftResponse(
        content_id=content_id,
        queue_id=queue_id,
        status="pending",
        optimal_publish_time=entry.optimal_publish_time if entry else None,
        platforms=entry.platforms if entry else {},
        message="Content queued successfully. Orbit will publish at the optimal time.",
    )


# ─── Read ────────────────────────────────────────────────────────────────────

@router.get("/user/{user_id}", response_model=list[DraftResponse])
async def list_user_drafts(
    user_id: uuid.UUID,
    status_filter: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all drafts for a user."""
    stmt = (
        select(ContentDraft)
        .where(ContentDraft.user_id == user_id)
        .order_by(ContentDraft.created_at.desc())
        .limit(limit)
    )
    if status_filter:
        stmt = stmt.where(ContentDraft.status == status_filter)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{content_id}", response_model=DraftResponse)
async def get_draft(content_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ContentDraft).where(ContentDraft.id == content_id))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


# ─── Update ──────────────────────────────────────────────────────────────────

@router.patch("/{content_id}", response_model=DraftResponse)
async def update_draft(
    content_id: uuid.UUID,
    body: DraftUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ContentDraft).where(ContentDraft.id == content_id))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status == "published":
        raise HTTPException(status_code=400, detail="Cannot edit a published draft")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(draft, field, value)
    draft.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(draft)
    return draft


# ─── Delete ──────────────────────────────────────────────────────────────────

@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_draft(content_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ContentDraft).where(ContentDraft.id == content_id))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status == "published":
        raise HTTPException(status_code=400, detail="Cannot delete a published draft")
    await db.delete(draft)
    await db.commit()
