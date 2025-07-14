"""empty message

Revision ID: 06227019e3ea
Revises: 0763d677d453
Create Date: 2025-06-17 00:31:20.942801

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '06227019e3ea'
down_revision = '0763d677d453'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user') as batch_op:
        batch_op.create_unique_constraint(
            'uq_user_steam_id',  # NAME the constraint
            ['steam_id']
        )