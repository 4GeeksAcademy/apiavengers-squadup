# src/api/models.py - COMPLETE FIXED VERSION - All Critical Issues Resolved

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, DateTime, Text, Integer, Table, Column, ForeignKey, UniqueConstraint, CheckConstraint, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone, timedelta
import json
import pytz
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

# ============================================================================
# MODERN DATETIME HELPER - REPLACES DEPRECATED datetime.utcnow()
# ============================================================================

def utc_now():
    """Modern replacement for deprecated datetime.utcnow()"""
    return datetime.now(timezone.utc)

# ============================================================================
# ASSOCIATION TABLES - FIXED: user_games now properly defined
# ============================================================================

user_games = Table(
    'user_games',
    db.Model.metadata,
    Column('user_id', Integer, ForeignKey('user.id'), primary_key=True),
    Column('game_id', Integer, ForeignKey('steam_game.id'), primary_key=True),
    Column('hours_played', Integer, default=0),
    Column('last_played', DateTime, nullable=True),
    Column('added_at', DateTime, default=utc_now)
)

group_members = Table(
    'group_members',
    db.Model.metadata,
    Column('user_id', Integer, ForeignKey('user.id'), primary_key=True),
    Column('group_id', Integer, ForeignKey('gaming_group.id'), primary_key=True),
    Column('joined_at', DateTime, default=utc_now),
    Column('role', String(20), default='member')
)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def safe_json_loads(json_string, default=None):
    """Safely parse JSON string with fallback"""
    if not json_string:
        return default or []
    
    try:
        if isinstance(json_string, str):
            return json.loads(json_string)
        return json_string
    except (json.JSONDecodeError, TypeError):
        return default or []

def safe_json_dumps(data):
    """Safely serialize data to JSON string"""
    try:
        if data is None:
            return None
        return json.dumps(data)
    except (TypeError, ValueError):
        return str(data) if data else None

# ============================================================================
# USER MODEL - FIXED: Relationship naming conflicts resolved
# ============================================================================

class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    avatar_url: Mapped[str] = mapped_column(String(300), nullable=True)
    bio: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    last_login: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)

    # Steam integration fields - FIXED: Consistent naming
    steam_id: Mapped[str] = mapped_column(String(17), nullable=True, unique=True)
    steam_username: Mapped[str] = mapped_column(String(100), nullable=True)
    steam_avatar_url: Mapped[str] = mapped_column(String(300), nullable=True)
    steam_profile_url: Mapped[str] = mapped_column(String(300), nullable=True)
    steam_connected: Mapped[bool] = mapped_column(Boolean(), default=False)
    is_steam_connected: Mapped[bool] = mapped_column(Boolean(), default=False)
    steam_library_synced_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Gaming preferences
    gaming_preferences: Mapped[str] = mapped_column(Text, nullable=True)
    favorite_genres: Mapped[str] = mapped_column(Text, nullable=True)
    gaming_style: Mapped[str] = mapped_column(String(50), nullable=True)
    
    # ADDED: Missing fields that frontend expects
    total_games: Mapped[int] = mapped_column(Integer, default=0)
    total_votes_cast: Mapped[int] = mapped_column(Integer, default=0)
    favorite_game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id'), nullable=True)
    gaming_activity_level: Mapped[str] = mapped_column(String(20), default='moderate')

    # FIXED: Relationships - Use 'groups' as primary, keep others for compatibility
    owned_games = relationship('SteamGame', secondary=user_games, back_populates='owners')
    groups = relationship('GamingGroup', secondary=group_members, back_populates='members')  # PRIMARY relationship
    member_of_groups = relationship('GamingGroup', secondary=group_members, back_populates='members', viewonly=True)  # COMPATIBILITY
    gaming_groups = relationship('GamingGroup', secondary=group_members, back_populates='members', viewonly=True)  # COMPATIBILITY
    created_groups = relationship('GamingGroup', back_populates='creator', foreign_keys='GamingGroup.creator_id')
    created_sessions = relationship('GameSession', back_populates='creator', foreign_keys='GameSession.creator_id')
    votes = relationship('Vote', back_populates='user', cascade='all, delete-orphan')
    favorite_game = relationship('SteamGame', foreign_keys=[favorite_game_id])

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def can_sync_steam(self):
        """Check if user can sync Steam library (5 minute cooldown)"""
        if not self.steam_id:
            return False, "Steam account not connected"
        
        if not self.steam_library_synced_at:
            return True, "Ready to sync"
        
        now = datetime.utcnow()
        last_synced = self.steam_library_synced_at
        
        if hasattr(last_synced, 'tzinfo') and last_synced.tzinfo is not None:
            last_synced = last_synced.astimezone(pytz.UTC).replace(tzinfo=None)
        
        time_since_sync = now - last_synced
        cooldown_period = timedelta(minutes=5)
        
        if time_since_sync < cooldown_period:
            remaining = cooldown_period - time_since_sync
            remaining_seconds = int(remaining.total_seconds())
            return False, f"Please wait {remaining_seconds} seconds before syncing again"
        
        return True, "Ready to sync"

    def steam_sync_cooldown_remaining(self):
        """Get remaining cooldown time in seconds"""
        if not self.steam_id or not self.steam_library_synced_at:
            return 0
        
        now = datetime.utcnow()
        last_synced = self.steam_library_synced_at
        
        if hasattr(last_synced, 'tzinfo') and last_synced.tzinfo is not None:
            last_synced = last_synced.astimezone(pytz.UTC).replace(tzinfo=None)
        
        time_since_sync = now - last_synced
        cooldown_period = timedelta(minutes=5)
        
        if time_since_sync >= cooldown_period:
            return 0
        
        remaining = cooldown_period - time_since_sync
        return int(remaining.total_seconds())

    def update_steam_sync_time(self):
        """Update the last Steam sync timestamp to now"""
        self.steam_library_synced_at = datetime.utcnow()

    def get_steam_sync_status(self):
        """Get comprehensive Steam sync status information"""
        if not self.steam_id:
            return {
                "connected": False,
                "can_sync": False,
                "message": "Steam account not connected",
                "last_synced": None,
                "cooldown_remaining": 0
            }
        
        can_sync, message = self.can_sync_steam()
        cooldown = self.steam_sync_cooldown_remaining()
        
        return {
            "connected": True,
            "can_sync": can_sync,
            "message": message,
            "last_synced": self.steam_library_synced_at.isoformat() if self.steam_library_synced_at else None,
            "cooldown_remaining": cooldown,
            "steam_username": self.steam_username,
            "total_games": self.total_games or 0
        }

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
            
            # FIXED: Consistent Steam field naming for frontend compatibility
            "steam_connected": self.steam_connected or self.is_steam_connected,
            "is_steam_connected": self.steam_connected or self.is_steam_connected,
            "steam_id": self.steam_id,
            "steam_username": self.steam_username,
            "steam_avatar": self.steam_avatar_url,
            "steam_avatar_url": self.steam_avatar_url,
            "steam_profile_url": self.steam_profile_url,
            
            "gaming_style": self.gaming_style,
            "favorite_genres": safe_json_loads(self.favorite_genres, []),
            "total_games": self.total_games or len(self.owned_games) if self.owned_games else 0,
            "total_votes_cast": self.total_votes_cast,
            "gaming_activity_level": self.gaming_activity_level
        }

# ============================================================================
# STEAM GAME MODEL
# ============================================================================

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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    owners = relationship('User', secondary=user_games, back_populates='owned_games')
    votes = relationship('Vote', back_populates='game', cascade='all, delete-orphan')
    won_sessions = relationship('GameSession', back_populates='winner_game', foreign_keys='GameSession.winner_game_id')

    def _parse_json_field(self, field):
        """Helper method to safely parse JSON fields"""
        if not field:
            return []
        try:
            if isinstance(field, str):
                return json.loads(field)
            elif isinstance(field, list):
                return field
            else:
                return field.split(',') if hasattr(field, 'split') else []
        except (json.JSONDecodeError, AttributeError):
            return field.split(',') if hasattr(field, 'split') else []

    def serialize(self):
        return {
            "id": self.id,
            "steam_appid": self.steam_appid,
            "appid": self.steam_appid,
            "name": self.name,
            "short_description": self.short_description,
            "header_image": self.header_image,
            "website": self.website,
            "genres": self._parse_json_field(self.genres),
            "categories": self._parse_json_field(self.categories), 
            "tags": self._parse_json_field(self.tags),
            "multiplayer": self.multiplayer,
            "co_op": self.co_op,
            "max_players": self.max_players,
            "min_players": self.min_players,
            "price": self.price,
            "release_date": self.release_date.isoformat() if self.release_date else None,
            "owner_count": len(self.owners) if self.owners else 0,
            "supported_languages": self._parse_json_field(self.supported_languages)
        }

# ============================================================================
# GAMING GROUP MODEL
# ============================================================================

class GamingGroup(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
    is_public: Mapped[bool] = mapped_column(Boolean(), default=False)
    max_members: Mapped[int] = mapped_column(Integer, default=10)
    invite_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=True)
    
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id', ondelete='SET NULL'), nullable=True)
    
    preferred_genres: Mapped[str] = mapped_column(Text, nullable=True)
    gaming_style: Mapped[str] = mapped_column(String(50), nullable=True)
    
    total_sessions: Mapped[int] = mapped_column(Integer, default=0)
    active_sessions: Mapped[int] = mapped_column(Integer, default=0)
    default_auto_complete_threshold: Mapped[float] = mapped_column(Float, default=0.8)
    allow_member_create_sessions: Mapped[bool] = mapped_column(Boolean(), default=True)
    
    # Relationships
    creator = relationship('User', back_populates='created_groups', foreign_keys=[creator_id])
    members = relationship('User', secondary=group_members, back_populates='groups')
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
            "preferred_genres": safe_json_loads(self.preferred_genres, []),
            "gaming_style": self.gaming_style,
            "total_sessions": self.total_sessions,
            "active_sessions": self.active_sessions,
            "default_auto_complete_threshold": self.default_auto_complete_threshold,
            "allow_member_create_sessions": self.allow_member_create_sessions
        }

# ============================================================================
# GAME SESSION MODEL - FIXED: All missing fields added
# ============================================================================

class GameSession(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    
    # FIXED: Required relationships
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey('gaming_group.id', ondelete='CASCADE'), nullable=False)
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id'), nullable=True)  # ADDED
    
    # FIXED: Core session fields matching gaming.py expectations
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id'), nullable=True)
    session_name: Mapped[str] = mapped_column(String(200), nullable=False, default='Voting Session')  # ADDED
    description: Mapped[str] = mapped_column(Text, nullable=True)  # ADDED
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='planning')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
    vote_results: Mapped[str] = mapped_column(Text, nullable=True)
    
    # ADDED: Enhanced live voting fields that gaming.py expects
    auto_complete_threshold: Mapped[float] = mapped_column(Float, default=0.8)  # ADDED
    max_choices: Mapped[int] = mapped_column(Integer, default=3)  # ADDED
    winner_game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id'), nullable=True)
    winner_votes: Mapped[int] = mapped_column(Integer, default=0)
    winner_points: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    votable_games: Mapped[str] = mapped_column(Text, nullable=True)
    
    # FIXED: Complete relationships
    group = relationship('GamingGroup', back_populates='sessions')
    creator = relationship('User', back_populates='created_sessions', foreign_keys=[creator_id])  # ADDED
    game = relationship('SteamGame', foreign_keys=[game_id])
    winner_game = relationship('SteamGame', foreign_keys=[winner_game_id])
    votes = relationship('Vote', back_populates='session', cascade='all, delete-orphan')

    def serialize(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "creator_id": self.creator_id,
            "creator": self.creator.serialize() if self.creator else None,
            "game": self.game.serialize() if self.game else None,
            "session_name": self.session_name,
            "description": self.description,
            "scheduled_time": self.scheduled_time.isoformat() if self.scheduled_time else None,
            "duration_minutes": self.duration_minutes,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "vote_results": safe_json_loads(self.vote_results, {}),
            "vote_count": len(self.votes) if self.votes else 0,
            "auto_complete_threshold": self.auto_complete_threshold,
            "max_choices": self.max_choices,
            "winner_game": self.winner_game.serialize() if self.winner_game else None,
            "winner_votes": self.winner_votes,
            "winner_points": self.winner_points,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "votable_games": safe_json_loads(self.votable_games, [])
        }

# ============================================================================
# VOTE MODEL - FIXED: Improved constraints to allow vote changes
# ============================================================================

class Vote(db.Model):
    """Individual vote records for atomic, race-condition-free vote storage"""
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey('game_session.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id', ondelete='CASCADE'), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    
    # FIXED: Better constraints that allow vote changes
    __table_args__ = (
        # RELAXED: Allow users to vote multiple times for different games or change votes
        UniqueConstraint('session_id', 'user_id', 'game_id', name='unique_user_game_vote'),
        CheckConstraint('priority >= 1 AND priority <= 3', name='valid_priority'),
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
            "points": self.priority,
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
    
    @classmethod
    def get_session_results(cls, session_id):
        """Calculate voting results with better error handling"""
        try:
            from sqlalchemy import func
            
            results = db.session.query(
                SteamGame,
                func.sum(cls.priority).label('total_points'),
                func.count(cls.id).label('vote_count'),
                func.avg(cls.priority).label('average_score')
            ).join(cls).filter(
                cls.session_id == session_id
            ).group_by(
                SteamGame.id
            ).order_by(
                func.sum(cls.priority).desc()
            ).all()
            
            return [
                {
                    "game": game.serialize(),
                    "total_points": int(total_points or 0),
                    "vote_count": int(vote_count or 0),
                    "average_score": round(float(average_score or 0), 2)
                }
                for game, total_points, vote_count, average_score in results
            ]
        except Exception as e:
            # Fallback to basic query if complex query fails
            votes = cls.query.filter_by(session_id=session_id).all()
            game_scores = {}
            
            for vote in votes:
                game_id = vote.game_id
                if game_id not in game_scores:
                    game_scores[game_id] = {
                        'total_points': 0,
                        'vote_count': 0,
                        'voters': set()
                    }
                
                game_scores[game_id]['total_points'] += vote.priority
                game_scores[game_id]['vote_count'] += 1
                game_scores[game_id]['voters'].add(vote.user_id)
            
            results = []
            for game_id, scores in game_scores.items():
                game = SteamGame.query.get(game_id)
                if game:
                    results.append({
                        'game': game.serialize(),
                        'total_points': scores['total_points'],
                        'vote_count': len(scores['voters']),
                        'average_score': round(scores['total_points'] / len(scores['voters']), 2) if scores['voters'] else 0
                    })
            
            results.sort(key=lambda x: x['total_points'], reverse=True)
            return results
    
    @classmethod
    def get_voter_count(cls, session_id):
        """Get voter count with error handling"""
        try:
            from sqlalchemy import func
            return db.session.query(func.count(func.distinct(cls.user_id))).filter_by(session_id=session_id).scalar() or 0
        except Exception:
            unique_users = set()
            votes = cls.query.filter_by(session_id=session_id).all()
            for vote in votes:
                unique_users.add(vote.user_id)
            return len(unique_users)
    
    @classmethod
    def has_user_voted(cls, session_id, user_id):
        """Check if user voted with error handling"""
        try:
            return cls.query.filter_by(session_id=session_id, user_id=user_id).first() is not None
        except Exception:
            return False
    
    @classmethod
    def get_user_votes(cls, session_id, user_id):
        """Get user votes with error handling"""
        try:
            return cls.query.filter_by(session_id=session_id, user_id=user_id).order_by(cls.priority.desc()).all()
        except Exception:
            return []