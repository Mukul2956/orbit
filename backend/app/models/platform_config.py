"""
platform_config – stores OAuth tokens / API credentials per user per platform.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PlatformConfig(Base):
    __tablename__ = "platform_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Tokens (encrypted at-rest in production)
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    account_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Platform-specific rate limits, restrictions, etc.
    posting_rules: Mapped[dict] = mapped_column(JSONB, default=dict)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<PlatformConfig user={self.user_id} platform={self.platform} active={self.is_active}>"
