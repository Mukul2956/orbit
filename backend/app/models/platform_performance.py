"""
platform_performance – records performance metrics after a post is published.
Used by the Timing Engine to continuously improve predictions.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PlatformPerformance(Base):
    __tablename__ = "platform_performance"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    queue_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    platform: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    content_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Timing columns
    scheduled_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actual_publish_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Engagement metrics
    engagement_score: Mapped[float] = mapped_column(Float, default=0.0)
    reach: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)
    likes: Mapped[int] = mapped_column(Integer, default=0)

    # Platform post reference
    post_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    post_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Raw platform metrics JSON
    performance_metrics: Mapped[dict] = mapped_column(JSONB, default=dict)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<PlatformPerformance platform={self.platform} content={self.content_id} score={self.engagement_score}>"
