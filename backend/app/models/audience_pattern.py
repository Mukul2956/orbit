"""
audience_pattern – time-series table (TimescaleDB hypertable on time_slot).
Stores per-platform hourly engagement data used by the Timing Engine.
"""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AudiencePattern(Base):
    __tablename__ = "audience_patterns"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    audience_segment: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # The hourly time slot this row represents
    time_slot: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    # Engagement metrics
    engagement_rate: Mapped[float] = mapped_column(Float, default=0.0)
    reach: Mapped[int] = mapped_column(Integer, default=0)
    interactions: Mapped[int] = mapped_column(Integer, default=0)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<AudiencePattern user={self.user_id} platform={self.platform} slot={self.time_slot}>"
