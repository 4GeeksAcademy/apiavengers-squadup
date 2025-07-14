"""merge heads 066b66b38ed7 and 811fa5326585

Revision ID: 10036baa922b
Revises: 066b66b38ed7, 811fa5326585
Create Date: 2025-07-14 23:38:49.426265

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '10036baa922b'
down_revision = ('066b66b38ed7', '811fa5326585')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
