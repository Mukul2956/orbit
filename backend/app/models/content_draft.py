"""
content_drafts – stores the actual post content before/after it enters the queue.

Every ContentQueue entry references a content_id which points here.
This is the single source of truth for post title, body, and type.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ContentDraft(Base):
    __tablename__ = "content_drafts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)

    # text | image | video | carousel | thread | article | email
    content_type: Mapped[str] = mapped_column(String(50), default="text", nullable=False)

    # draft | queued | published | archived
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False, index=True)

    # Optional platform-specific overrides (hashtags, mentions, etc.)
    post_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    # Whether this is evergreen content worth republishing
    is_evergreen: Mapped[bool] = mapped_column(Boolean, default=False)
    is_time_sensitive: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
