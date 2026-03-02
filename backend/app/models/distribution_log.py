"""
distribution_log – append-only audit log of every action on a queue item.
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
import uuid


class DistributionLog(Base):
    __tablename__ = "distribution_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    content_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    queue_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    platform: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # scheduled | published | failed | retried | cancelled
    action: Mapped[str] = mapped_column(String(50), nullable=False)

    result: Mapped[dict] = mapped_column(JSONB, default=dict)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    def __repr__(self) -> str:
        return f"<DistributionLog queue={self.queue_id} platform={self.platform} action={self.action}>"
