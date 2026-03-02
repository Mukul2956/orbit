"""
Pydantic schemas for the content queue.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PlatformScheduleItem(BaseModel):
    platform: str
    scheduled_time: datetime | None = None
    status: str = "pending"
    post_id: str | None = None
    post_url: str | None = None


# ─── Request schemas ─────────────────────────────────────────────────────────

class QueueCreate(BaseModel):
    content_id: uuid.UUID
    user_id: uuid.UUID
    platforms: list[str] = Field(..., min_length=1)
    scheduled_time: datetime | None = None
    priority: int | None = Field(None, ge=1, le=10)
    requires_approval: bool = False
    content_type: str = "general"
    is_time_sensitive: bool = False
    is_evergreen: bool = False


class QueueUpdate(BaseModel):
    status: str | None = None
    priority_score: float | None = Field(None, ge=0.0, le=1.0)
    optimal_publish_time: datetime | None = None
    platforms: dict[str, Any] | None = None


class PublishNowRequest(BaseModel):
    queue_id: uuid.UUID


# ─── Response schemas ────────────────────────────────────────────────────────

class QueueResponse(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    priority_score: float
    optimal_publish_time: datetime | None
    platforms: dict[str, Any]
    requires_approval: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QueueCreateResponse(BaseModel):
    queue_id: uuid.UUID
    status: str
    message: str


class OptimalTimeResponse(BaseModel):
    platform: str
    optimal_time: datetime
    confidence_score: float
    is_default_time: bool
    reasoning: str | None = None


class PublishResult(BaseModel):
    queue_id: uuid.UUID
    platform: str
    status: str  # success | failed
    post_id: str | None = None
    post_url: str | None = None
    error: str | None = None
    published_at: datetime | None = None
