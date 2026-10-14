"""add agencies table

Revision ID: 20260502_0003
Revises: 20260502_0002
Create Date: 2026-05-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260502_0003"
down_revision: Union[str, None] = "20260502_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agencies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("source_id", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("short_name", sa.String(length=64)),
        sa.Column("slug", sa.String(length=255)),
        sa.Column("level", sa.String(length=16), nullable=False, server_default="federal"),
        sa.Column("jurisdiction_id", sa.Integer(), sa.ForeignKey("jurisdictions.id", ondelete="SET NULL")),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("agencies.id", ondelete="SET NULL")),
        sa.Column("description", sa.Text()),
        sa.Column("website", sa.String(length=512)),
        sa.Column("wikipedia_url", sa.String(length=512)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("extra_data", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("source", "source_id", name="uq_agency_source"),
    )
    for col in ("name", "short_name", "slug", "level", "jurisdiction_id", "parent_id"):
        op.create_index(f"ix_agencies_{col}", "agencies", [col])


def downgrade() -> None:
    for col in ("parent_id", "jurisdiction_id", "level", "slug", "short_name", "name"):
        op.drop_index(f"ix_agencies_{col}", table_name="agencies")
    op.drop_table("agencies")
