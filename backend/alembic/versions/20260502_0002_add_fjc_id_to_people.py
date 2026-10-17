"""add fjc_id to people

Revision ID: 20260502_0002
Revises: 20260502_0001
Create Date: 2026-05-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260502_0002"
down_revision: Union[str, None] = "20260502_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("people") as batch:
        batch.add_column(sa.Column("fjc_id", sa.String(length=32), nullable=True))
        batch.create_index("ix_people_fjc_id", ["fjc_id"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("people") as batch:
        batch.drop_index("ix_people_fjc_id")
        batch.drop_column("fjc_id")
