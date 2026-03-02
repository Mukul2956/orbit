"""Add content_drafts table

Revision ID: 002_content_drafts
Revises: 001_initial
Create Date: 2026-03-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from alembic import op

revision: str = "002_content_drafts"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "content_drafts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("content_type", sa.String(50), nullable=False, server_default="text"),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("metadata", JSONB, server_default="{}"),
        sa.Column("is_evergreen", sa.Boolean, server_default="false"),
        sa.Column("is_time_sensitive", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_drafts_user_status", "content_drafts", ["user_id", "status"])
    op.create_index("idx_drafts_created", "content_drafts", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_drafts_created")
    op.drop_index("idx_drafts_user_status")
    op.drop_table("content_drafts")
