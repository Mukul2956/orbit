"""
Schemas for distribution, analytics, and algorithm monitoring responses.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class DistributionLogResponse(BaseModel):
    id: int
    queue_id: uuid.UUID | None
    platform: str
    action: str
    result: dict
    timestamp: datetime

    model_config = {"from_attributes": True}


class PlatformPerformanceResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    content_id: uuid.UUID
    platform: str
    engagement_score: float
    reach: int
    clicks: int
    shares: int
    comments: int
    likes: int
    actual_publish_time: datetime | None
    post_url: str | None

    model_config = {"from_attributes": True}


class AudienceHeatmapPoint(BaseModel):
    hour: int        # 0-23
    day_of_week: int # 0=Mon … 6=Sun
    engagement_rate: float
    reach: int


class AlgorithmChangeResponse(BaseModel):
    id: uuid.UUID
    platform: str
    detected_at: datetime
    change_type: str
    impact_score: float
    description: str | None
    confirmed: bool

    model_config = {"from_attributes": True}


class AnalyticsSummary(BaseModel):
    total_published: int
    total_failed: int
    avg_engagement_score: float
    top_platform: str | None
    heatmap: list[AudienceHeatmapPoint]
