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
        # First add the steam_id column if it doesn't exist
        batch_op.add_column(sa.Column('steam_id', sa.String(length=17), nullable=True))
        # Then create the unique constraint
        batch_op.create_unique_constraint(
            'uq_user_steam_id',  # NAME the constraint
            ['steam_id']
        )


def downgrade():
    with op.batch_alter_table('user') as batch_op:
        batch_op.drop_constraint('uq_user_steam_id', type_='unique')
        batch_op.drop_column('steam_id')