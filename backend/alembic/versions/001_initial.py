"""Initial ORBIT schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-02-25 00:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── content_queue ────────────────────────────────────────────────────────
    op.create_table(
        "content_queue",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("content_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("priority_score", sa.Float, nullable=False, server_default="0.5"),
        sa.Column("relevance_decay_rate", sa.Float, nullable=False, server_default="0.05"),
        sa.Column("optimal_publish_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scheduled_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("platforms", JSONB, nullable=False, server_default="{}"),
        sa.Column("requires_approval", sa.Boolean, server_default="false"),
        sa.Column("approved_by", sa.String(255), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("retry_count", sa.Integer, server_default="0"),
        sa.Column("last_error", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_queue_status_priority", "content_queue", ["status", "priority_score"])
    op.create_index("idx_queue_user_status", "content_queue", ["user_id", "status"])
    op.create_index("idx_queue_publish_time", "content_queue", ["optimal_publish_time"])

    # ── audience_patterns (TimescaleDB hypertable) ───────────────────────────
    op.create_table(
        "audience_patterns",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("audience_segment", sa.String(100), nullable=True),
        sa.Column("time_slot", sa.DateTime(timezone=True), nullable=False),
        sa.Column("engagement_rate", sa.Float, server_default="0"),
        sa.Column("reach", sa.Integer, server_default="0"),
        sa.Column("interactions", sa.Integer, server_default="0"),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_patterns_user_platform", "audience_patterns", ["user_id", "platform", "time_slot"])
    # Convert to TimescaleDB hypertable – Supabase doesn't support this extension.
    # We use a savepoint so that when the statement fails, only the savepoint rolls back
    # rather than aborting the entire transaction (plain try/except is not enough in PG).
    conn = op.get_bind()
    conn.execute(sa.text("SAVEPOINT before_hypertable"))
    try:
        conn.execute(sa.text("SELECT create_hypertable('audience_patterns', 'time_slot', if_not_exists => TRUE)"))
        conn.execute(sa.text("RELEASE SAVEPOINT before_hypertable"))
    except Exception:
        conn.execute(sa.text("ROLLBACK TO SAVEPOINT before_hypertable"))
        # TimescaleDB not available on Supabase – table works fine as plain PostgreSQL table

    # ── platform_configs ─────────────────────────────────────────────────────
    op.create_table(
        "platform_configs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("access_token", sa.Text, nullable=True),
        sa.Column("refresh_token", sa.Text, nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("account_id", sa.String(255), nullable=True),
        sa.Column("account_name", sa.String(255), nullable=True),
        sa.Column("posting_rules", JSONB, server_default="{}"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # ── platform_performance ─────────────────────────────────────────────────
    op.create_table(
        "platform_performance",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("content_id", UUID(as_uuid=True), nullable=False),
        sa.Column("queue_id", UUID(as_uuid=True), nullable=True),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("content_type", sa.String(50), nullable=True),
        sa.Column("scheduled_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_publish_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("engagement_score", sa.Float, server_default="0"),
        sa.Column("reach", sa.Integer, server_default="0"),
        sa.Column("clicks", sa.Integer, server_default="0"),
        sa.Column("shares", sa.Integer, server_default="0"),
        sa.Column("comments", sa.Integer, server_default="0"),
        sa.Column("likes", sa.Integer, server_default="0"),
        sa.Column("post_id", sa.String(255), nullable=True),
        sa.Column("post_url", sa.String(500), nullable=True),
        sa.Column("performance_metrics", JSONB, server_default="{}"),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_performance_user_platform", "platform_performance", ["user_id", "platform", "recorded_at"])

    # ── distribution_log ─────────────────────────────────────────────────────
    op.create_table(
        "distribution_log",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("content_id", UUID(as_uuid=True), nullable=True),
        sa.Column("queue_id", UUID(as_uuid=True), nullable=True),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("result", JSONB, server_default="{}"),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_dist_log_queue", "distribution_log", ["queue_id", "timestamp"])

    # ── algorithm_changes ────────────────────────────────────────────────────
    op.create_table(
        "algorithm_changes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("change_type", sa.String(100), nullable=False),
        sa.Column("impact_score", sa.Float, server_default="0"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("adjustments_made", JSONB, server_default="{}"),
        sa.Column("confirmed", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    # ── evergreen_content ────────────────────────────────────────────────────
    op.create_table(
        "evergreen_content",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("content_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("evergreen_score", sa.Float, server_default="0"),
        sa.Column("last_published", sa.DateTime(timezone=True), nullable=True),
        sa.Column("republish_interval_days", sa.Integer, server_default="90"),
        sa.Column("next_publish_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("performance_history", JSONB, server_default="{}"),
        sa.Column("active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("evergreen_content")
    op.drop_table("algorithm_changes")
    op.drop_table("distribution_log")
    op.drop_table("platform_performance")
    op.drop_table("platform_configs")
    op.drop_table("audience_patterns")
    op.drop_table("content_queue")
