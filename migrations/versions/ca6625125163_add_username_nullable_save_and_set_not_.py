"""add username nullable save and set not null

Revision ID: ca6625125163
Revises: 7bdd888fc710
Create Date: 2025-07-04 01:42:35.589521

"""
from alembic import op
import sqlalchemy as sa
from werkzeug.security import generate_password_hash
temp = generate_password_hash('TempPass123')

# revision identifiers, used by Alembic.
revision = 'ca6625125163'
down_revision = '7bdd888fc710'
branch_labels = None
depends_on = None


def upgrade():

    # Step 1 – add with default & NOT NULL
    op.add_column(
        'user',
        sa.Column('username', sa.String(80),
                nullable=False,
                server_default='temp_user')
    )

    op.add_column('user', sa.Column('password_hash', sa.String(200), nullable=True))
    op.execute(f"UPDATE \"user\" SET password_hash = '{temp}'")
    op.alter_column('user', 'password_hash', nullable=False)

