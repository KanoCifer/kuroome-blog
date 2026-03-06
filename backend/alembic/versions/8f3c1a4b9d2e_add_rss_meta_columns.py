"""add rss meta columns

Revision ID: 8f3c1a4b9d2e
Revises: 056d80d30f9d
Create Date: 2026-03-06 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8f3c1a4b9d2e"
down_revision: str | Sequence[str] | None = "056d80d30f9d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "rss_info",
        sa.Column("feed_title", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "rss_info",
        sa.Column("feed_link", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "rss_info",
        sa.Column("feed_description", sa.Text(), nullable=True),
    )
    op.add_column(
        "rss_info",
        sa.Column(
            "feed_published_at", sa.DateTime(timezone=True), nullable=True
        ),
    )
    op.add_column(
        "rss_info",
        sa.Column(
            "entry_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "rss_info",
        sa.Column(
            "last_fetched_at", sa.DateTime(timezone=True), nullable=True
        ),
    )
    op.add_column(
        "rss_info",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.add_column(
        "rss_info",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        op.f("ix_rss_info_created_at"),
        "rss_info",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_rss_info_created_at"), table_name="rss_info")
    op.drop_column("rss_info", "updated_at")
    op.drop_column("rss_info", "created_at")
    op.drop_column("rss_info", "last_fetched_at")
    op.drop_column("rss_info", "entry_count")
    op.drop_column("rss_info", "feed_published_at")
    op.drop_column("rss_info", "feed_description")
    op.drop_column("rss_info", "feed_link")
    op.drop_column("rss_info", "feed_title")
