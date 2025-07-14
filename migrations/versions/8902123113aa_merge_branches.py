"""merge branches

Revision ID: 8902123113aa
Revises: 56f38dfa28bc, fd370ea4c3a0
Create Date: 2025-07-04 01:16:30.437539

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8902123113aa'
down_revision = ('56f38dfa28bc', 'fd370ea4c3a0')
branch_labels = None
depends_on = None


def upgrade():
    # 1. add NULLABLE column
    op.add_column(
        'user',
        sa.Column('username', sa.String(length=80), nullable=True)
    )

    # 2. back-fill existing rows
    op.execute('UPDATE "user" SET username = \'temp_user_\' || id')

    # 3. now make it NOT NULL
    op.alter_column('user', 'username', nullable=False)


def downgrade():
    op.drop_column('user', 'username')
