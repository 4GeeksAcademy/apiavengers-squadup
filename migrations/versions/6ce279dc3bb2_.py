"""empty message

Revision ID: 6ce279dc3bb2
Revises: 93a4f76d79b5
Create Date: 2025-07-05 21:18:58.584120

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import Boolean

# revision identifiers, used by Alembic.
revision = '6ce279dc3bb2'
down_revision = '93a4f76d79b5'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('user', 'created_at',
                    existing_type=sa.TIMESTAMP(),
                    nullable=False)
