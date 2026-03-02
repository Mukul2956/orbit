"""
content_queue – tracks every piece of content earmarked for distribution.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ContentQueue(Base):
    __tablename__ = "content_queue"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # References to sister services (loose coupling via UUID only)
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    # Scheduling state
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False, index=True
    )  # pending | scheduled | published | partial | failed | cancelled

    # Priority & decay
    priority_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    relevance_decay_rate: Mapped[float] = mapped_column(Float, default=0.05, nullable=False)

    # Timing
    optimal_publish_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Per-platform state
    # Example: {"twitter": {"status": "pending", "publish_time": "...", "post_id": null}}
    platforms: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Approval workflow
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Retry tracking
    retry_count: Mapped[int] = mapped_column(default=0)
    last_error: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<ContentQueue id={self.id} status={self.status} user={self.user_id}>"
