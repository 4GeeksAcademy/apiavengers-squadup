"""Add enhanced live voting fields with proper defaults

Revision ID: 790d2dea8791
Revises: f225232c1d58
Create Date: 2025-07-18 00:14:48.186651

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '790d2dea8791'
down_revision = 'f225232c1d58'
branch_labels = None
depends_on = None


def upgrade():
    # ### Fixed migration with proper default values ###
    
    # Add columns to game_session with proper defaults
    with op.batch_alter_table('game_session', schema=None) as batch_op:
        # Add nullable columns first, then update with defaults, then make non-nullable
        batch_op.add_column(sa.Column('auto_complete_threshold', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('max_choices', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('winner_game_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('winner_votes', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('winner_points', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('completed_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('votable_games', sa.Text(), nullable=True))
    
    # Set default values for existing records
    op.execute("UPDATE game_session SET auto_complete_threshold = 0.8 WHERE auto_complete_threshold IS NULL")
    op.execute("UPDATE game_session SET max_choices = 3 WHERE max_choices IS NULL")
    op.execute("UPDATE game_session SET winner_votes = 0 WHERE winner_votes IS NULL")
    op.execute("UPDATE game_session SET winner_points = 0 WHERE winner_points IS NULL")
    
    # Now make the appropriate columns non-nullable
    with op.batch_alter_table('game_session', schema=None) as batch_op:
        batch_op.alter_column('auto_complete_threshold', nullable=False)
        batch_op.alter_column('max_choices', nullable=False)
        batch_op.alter_column('winner_votes', nullable=False)
        batch_op.alter_column('winner_points', nullable=False)
        batch_op.create_foreign_key(None, 'steam_game', ['winner_game_id'], ['id'])

    # Add columns to gaming_group with proper defaults
    with op.batch_alter_table('gaming_group', schema=None) as batch_op:
        batch_op.add_column(sa.Column('total_sessions', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('active_sessions', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('default_auto_complete_threshold', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('allow_member_create_sessions', sa.Boolean(), nullable=True))
    
    # Set default values for existing records
    op.execute("UPDATE gaming_group SET total_sessions = 0 WHERE total_sessions IS NULL")
    op.execute("UPDATE gaming_group SET active_sessions = 0 WHERE active_sessions IS NULL")
    op.execute("UPDATE gaming_group SET default_auto_complete_threshold = 0.8 WHERE default_auto_complete_threshold IS NULL")
    op.execute("UPDATE gaming_group SET allow_member_create_sessions = true WHERE allow_member_create_sessions IS NULL")
    
    # Make columns non-nullable
    with op.batch_alter_table('gaming_group', schema=None) as batch_op:
        batch_op.alter_column('total_sessions', nullable=False)
        batch_op.alter_column('active_sessions', nullable=False)
        batch_op.alter_column('default_auto_complete_threshold', nullable=False)
        batch_op.alter_column('allow_member_create_sessions', nullable=False)

    # Add columns to user with proper defaults
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('steam_connected', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('total_games', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('total_votes_cast', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('favorite_game_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('gaming_activity_level', sa.String(length=20), nullable=True))
    
    # Set default values for existing records
    op.execute("UPDATE \"user\" SET steam_connected = false WHERE steam_connected IS NULL")
    op.execute("UPDATE \"user\" SET total_games = 0 WHERE total_games IS NULL")
    op.execute("UPDATE \"user\" SET total_votes_cast = 0 WHERE total_votes_cast IS NULL")
    op.execute("UPDATE \"user\" SET gaming_activity_level = 'moderate' WHERE gaming_activity_level IS NULL")
    
    # Make columns non-nullable (except favorite_game_id which should remain nullable)
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('steam_connected', nullable=False)
        batch_op.alter_column('total_games', nullable=False)
        batch_op.alter_column('total_votes_cast', nullable=False)
        batch_op.alter_column('gaming_activity_level', nullable=False)
        batch_op.create_foreign_key(None, 'steam_game', ['favorite_game_id'], ['id'])

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('gaming_activity_level')
        batch_op.drop_column('favorite_game_id')
        batch_op.drop_column('total_votes_cast')
        batch_op.drop_column('total_games')
        batch_op.drop_column('steam_connected')

    with op.batch_alter_table('gaming_group', schema=None) as batch_op:
        batch_op.drop_column('allow_member_create_sessions')
        batch_op.drop_column('default_auto_complete_threshold')
        batch_op.drop_column('active_sessions')
        batch_op.drop_column('total_sessions')

    with op.batch_alter_table('game_session', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('votable_games')
        batch_op.drop_column('completed_at')
        batch_op.drop_column('winner_points')
        batch_op.drop_column('winner_votes')
        batch_op.drop_column('winner_game_id')
        batch_op.drop_column('max_choices')
        batch_op.drop_column('auto_complete_threshold')

    # ### end Alembic commands ###