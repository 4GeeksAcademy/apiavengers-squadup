# src/api/models.py - ENHANCED with Vote model for production-ready voting

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, DateTime, Text, Integer, Table, Column, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
import json
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

user_games = Table(
    'user_games',
    db.Model.metadata,
    Column('user_id', Integer, ForeignKey('user.id'), primary_key=True),
    Column('game_id', Integer, ForeignKey('steam_game.id'), primary_key=True),
    Column('hours_played', Integer, default=0),
    Column('last_played', DateTime, nullable=True),
    Column('added_at', DateTime, default=datetime.utcnow)
)

group_members = Table(
    'group_members',
    db.Model.metadata,
    Column('user_id', Integer, ForeignKey('user.id'), primary_key=True),
    Column('group_id', Integer, ForeignKey('gaming_group.id'), primary_key=True),
    Column('joined_at', DateTime, default=datetime.utcnow),
    Column('role', String(20), default='member')
)

class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    avatar_url: Mapped[str] = mapped_column(String(300), nullable=True)
    bio: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)

    steam_id: Mapped[str] = mapped_column(String(17), nullable=True, unique=True)
    steam_username: Mapped[str] = mapped_column(String(100), nullable=True)
    steam_avatar_url: Mapped[str] = mapped_column(String(300), nullable=True)
    steam_profile_url: Mapped[str] = mapped_column(String(300), nullable=True)
    is_steam_connected: Mapped[bool] = mapped_column(Boolean(), default=False)
    steam_library_synced_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    gaming_preferences: Mapped[str] = mapped_column(Text, nullable=True)
    favorite_genres: Mapped[str] = mapped_column(Text, nullable=True)
    gaming_style: Mapped[str] = mapped_column(String(50), nullable=True)

    # Relationships
    owned_games = relationship('SteamGame', secondary=user_games, back_populates='owners')
    member_of_groups = relationship('GamingGroup', secondary=group_members, back_populates='members')
    created_groups = relationship('GamingGroup', back_populates='creator', foreign_keys='GamingGroup.creator_id')
    
    # 🚀 NEW: Vote relationship
    votes = relationship('Vote', back_populates='user', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "avatar_url": self.avatar_url or self.steam_avatar_url,
            "bio": self.bio,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "is_active": self.is_active,
            "steam_connected": self.is_steam_connected,
            "steam_username": self.steam_username,
            "steam_avatar": self.steam_avatar_url,
            "gaming_style": self.gaming_style,
            "favorite_genres": json.loads(self.favorite_genres) if self.favorite_genres else [],
            "total_games": len(self.owned_games) if self.owned_games else 0
        }

class SteamGame(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    steam_appid: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_description: Mapped[str] = mapped_column(Text, nullable=True)
    header_image: Mapped[str] = mapped_column(String(500), nullable=True)
    website: Mapped[str] = mapped_column(String(300), nullable=True)
    genres: Mapped[str] = mapped_column(Text, nullable=True)
    categories: Mapped[str] = mapped_column(Text, nullable=True)
    tags: Mapped[str] = mapped_column(Text, nullable=True)
    supported_languages: Mapped[str] = mapped_column(Text, nullable=True)
    multiplayer: Mapped[bool] = mapped_column(Boolean(), default=False)
    co_op: Mapped[bool] = mapped_column(Boolean(), default=False)
    max_players: Mapped[int] = mapped_column(Integer, nullable=True)
    min_players: Mapped[int] = mapped_column(Integer, default=1)
    price: Mapped[str] = mapped_column(String(20), nullable=True)
    release_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owners = relationship('User', secondary=user_games, back_populates='owned_games')
    
    # 🚀 NEW: Vote relationship
    votes = relationship('Vote', back_populates='game', cascade='all, delete-orphan')

    def serialize(self):
        return {
            "id": self.id,
            "steam_appid": self.steam_appid,
            "name": self.name,
            "short_description": self.short_description,
            "header_image": self.header_image,
            "website": self.website,
            "genres": json.loads(self.genres) if self.genres else [],
            "categories": json.loads(self.categories) if self.categories else [],
            "tags": json.loads(self.tags) if self.tags else [],
            "multiplayer": self.multiplayer,
            "co_op": self.co_op,
            "max_players": self.max_players,
            "min_players": self.min_players,
            "price": self.price,
            "release_date": self.release_date.isoformat() if self.release_date else None,
            "owner_count": len(self.owners) if self.owners else 0
        }

class GamingGroup(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_public: Mapped[bool] = mapped_column(Boolean(), default=False)
    max_members: Mapped[int] = mapped_column(Integer, default=10)
    invite_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=True)
    
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id', ondelete='SET NULL'), nullable=True)
    
    preferred_genres: Mapped[str] = mapped_column(Text, nullable=True)
    gaming_style: Mapped[str] = mapped_column(String(50), nullable=True)
    
    # Relationships
    creator = relationship('User', back_populates='created_groups', foreign_keys=[creator_id])
    members = relationship('User', secondary=group_members, back_populates='member_of_groups')
    sessions = relationship('GameSession', back_populates='group', cascade='all, delete-orphan', passive_deletes=True)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "is_public": self.is_public,
            "max_members": self.max_members,
            "current_members": len(self.members),
            "invite_code": self.invite_code,
            "creator": self.creator.serialize() if self.creator else {"username": "Deleted User", "id": None},
            "members": [member.serialize() for member in self.members] if self.members else [],
            "preferred_genres": json.loads(self.preferred_genres) if self.preferred_genres else [],
            "gaming_style": self.gaming_style
        }

class GameSession(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey('gaming_group.id', ondelete='CASCADE'), nullable=False)
    
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id'), nullable=True)
    session_name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='planning')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    vote_results: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Relationships
    group = relationship('GamingGroup', back_populates='sessions')
    game = relationship('SteamGame')
    
    # 🚀 NEW: Vote relationship
    votes = relationship('Vote', back_populates='session', cascade='all, delete-orphan')

    def serialize(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "game": self.game.serialize() if self.game else None,
            "session_name": self.session_name,
            "description": self.description,
            "scheduled_time": self.scheduled_time.isoformat() if self.scheduled_time else None,
            "duration_minutes": self.duration_minutes,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "vote_results": json.loads(self.vote_results) if self.vote_results else {},
            # 🚀 NEW: Include vote count
            "vote_count": len(self.votes) if self.votes else 0
        }

# 🚀 NEW: Vote Model for Atomic Vote Storage
class Vote(db.Model):
    """
    Individual vote records for atomic, race-condition-free vote storage.
    Replaces JSON-based voting with proper relational data.
    """
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey('game_session.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id', ondelete='CASCADE'), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, or 3 points
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # 🔧 CRITICAL: Database-level constraints to prevent race conditions
    __table_args__ = (
        # Prevent duplicate votes: one vote per user per game per session
        UniqueConstraint('session_id', 'user_id', 'game_id', name='unique_user_game_vote'),
        # Ensure valid priority values
        CheckConstraint('priority >= 1 AND priority <= 3', name='valid_priority'),
        # Index for fast lookups
        {'mysql_charset': 'utf8mb4'}
    )
    
    # Relationships
    session = relationship('GameSession', back_populates='votes')
    user = relationship('User', back_populates='votes')
    game = relationship('SteamGame', back_populates='votes')
    
    def serialize(self):
        """Serialize vote for API responses"""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "priority": self.priority,
            "points": self.priority,  # Alias for clarity
            "created_at": self.created_at.isoformat(),
            "user": {
                "id": self.user.id,
                "username": self.user.username,
                "avatar_url": self.user.avatar_url or self.user.steam_avatar_url
            } if self.user else None,
            "game": {
                "id": self.game.id,
                "name": self.game.name,
                "header_image": self.game.header_image
            } if self.game else None
        }
    
    @staticmethod
    def get_session_results(session_id):
        """
        Calculate voting results using SQL aggregation (much faster than JSON parsing)
        Returns list of games with vote totals, sorted by points
        """
        from sqlalchemy import func
        
        results = db.session.query(
            SteamGame,
            func.sum(Vote.priority).label('total_points'),
            func.count(Vote.id).label('vote_count'),
            func.avg(Vote.priority).label('average_score')
        ).join(Vote).filter(
            Vote.session_id == session_id
        ).group_by(
            SteamGame.id
        ).order_by(
            func.sum(Vote.priority).desc()
        ).all()
        
        return [
            {
                "game": game.serialize(),
                "total_points": int(total_points or 0),
                "vote_count": int(vote_count or 0),
                "average_score": float(average_score or 0)
            }
            for game, total_points, vote_count, average_score in results
        ]
    
    @staticmethod
    def has_user_voted(session_id, user_id):
        """Check if user has already voted in this session"""
        return Vote.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first() is not None
    
    @staticmethod
    def get_user_votes(session_id, user_id):
        """Get all votes for a specific user in a session"""
        return Vote.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).order_by(Vote.priority.desc()).all()
    
    @staticmethod
    def get_voter_count(session_id):
        """Get number of unique voters in a session"""
        return db.session.query(Vote.user_id).filter_by(
            session_id=session_id
        ).distinct().count()
    
    def __repr__(self):
        return f'<Vote {self.user.username if self.user else self.user_id} -> {self.game.name if self.game else self.game_id} ({self.priority} pts)>'

# 🚀 HELPER FUNCTIONS for easier vote management

def create_vote_transaction(session_id, user_id, game_votes):
    """
    Create multiple votes in a single atomic transaction
    
    Args:
        session_id: ID of the voting session
        user_id: ID of the user voting
        game_votes: List of dicts with 'game_id' and 'priority'
    
    Returns:
        List of created Vote objects
    
    Raises:
        IntegrityError: If constraints are violated (duplicate votes, etc.)
    """
    votes = []
    
    for vote_data in game_votes:
        vote = Vote(
            session_id=session_id,
            user_id=user_id,
            game_id=vote_data['game_id'],
            priority=vote_data['priority']
        )
        db.session.add(vote)
        votes.append(vote)
    
    try:
        db.session.flush()  # Check constraints without committing
        return votes
    except Exception as e:
        db.session.rollback()
        raise e

def get_session_summary(session_id):
    """
    Get comprehensive session summary with vote statistics
    
    Returns:
        Dict with session info, results, voter stats, etc.
    """
    session = GameSession.query.get(session_id)
    if not session:
        return None
    
    # Get results using Vote model
    results = Vote.get_session_results(session_id)
    
    # Get voter information
    total_voters = Vote.get_voter_count(session_id)
    total_members = len(session.group.members) if session.group else 0
    
    # Get voting completion status
    voting_complete = (
        session.status == 'completed' or 
        total_voters >= total_members
    )
    
    return {
        "session": session.serialize(),
        "results": results,
        "winner": results[0] if results else None,
        "total_voters": total_voters,
        "total_members": total_members,
        "voting_complete": voting_complete,
        "voter_participation": (total_voters / total_members * 100) if total_members > 0 else 0
    }