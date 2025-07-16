"""merge multiple heads

Revision ID: 768872acda2e
Revises: 066b66b38ed7, 06f37ca9533e
Create Date: 2025-07-16 21:53:40.987435

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '768872acda2e'
down_revision = ('066b66b38ed7', '06f37ca9533e')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
