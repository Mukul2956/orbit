"""
algorithm_change – records detected algorithm changes on social platforms.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AlgorithmChange(Base):
    __tablename__ = "algorithm_changes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # e.g. "engagement_rate_anomaly", "reach_drop"
    change_type: Mapped[str] = mapped_column(String(100), nullable=False)
    impact_score: Mapped[float] = mapped_column(Float, default=0.0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    adjustments_made: Mapped[dict] = mapped_column(JSONB, default=dict)

    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<AlgorithmChange platform={self.platform} type={self.change_type} impact={self.impact_score}>"


class EvergreenContent(Base):
    __tablename__ = "evergreen_content"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    evergreen_score: Mapped[float] = mapped_column(Float, default=0.0)
    last_published: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    republish_interval_days: Mapped[int] = mapped_column(default=90)
    next_publish_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    performance_history: Mapped[dict] = mapped_column(JSONB, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<EvergreenContent content={self.content_id} score={self.evergreen_score}>"
