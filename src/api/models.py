# src/api/models.py - COMPLETE FIXED VERSION matching gaming.py requirements

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
# ASSOCIATION TABLES
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
    """
    Safely parse JSON string with fallback
    
    Args:
        json_string: String to parse
        default: Default value if parsing fails
    
    Returns:
        Parsed JSON or default value
    """
    if not json_string:
        return default or []
    
    try:
        if isinstance(json_string, str):
            return json.loads(json_string)
        return json_string
    except (json.JSONDecodeError, TypeError):
        return default or []

def safe_json_dumps(data):
    """
    Safely serialize data to JSON string
    
    Args:
        data: Data to serialize
    
    Returns:
        JSON string or None if serialization fails
    """
    try:
        if data is None:
            return None
        return json.dumps(data)
    except (TypeError, ValueError):
        return str(data) if data else None

# ============================================================================
# USER MODEL - ENHANCED
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

    # Steam integration fields
    steam_id: Mapped[str] = mapped_column(String(17), nullable=True, unique=True)
    steam_username: Mapped[str] = mapped_column(String(100), nullable=True)
    steam_avatar_url: Mapped[str] = mapped_column(String(300), nullable=True)
    steam_profile_url: Mapped[str] = mapped_column(String(300), nullable=True)
    steam_connected: Mapped[bool] = mapped_column(Boolean(), default=False)
    is_steam_connected: Mapped[bool] = mapped_column(Boolean(), default=False)  # Alias for compatibility
    steam_library_synced_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Gaming preferences
    gaming_preferences: Mapped[str] = mapped_column(Text, nullable=True)
    favorite_genres: Mapped[str] = mapped_column(Text, nullable=True)
    gaming_style: Mapped[str] = mapped_column(String(50), nullable=True)
    
    # Enhanced gaming statistics
    total_games: Mapped[int] = mapped_column(Integer, default=0)
    total_votes_cast: Mapped[int] = mapped_column(Integer, default=0)
    favorite_game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id'), nullable=True)
    gaming_activity_level: Mapped[str] = mapped_column(String(20), default='moderate')  # casual, moderate, hardcore

    # Relationships - FIXED NAMES to match gaming.py
    owned_games = relationship('SteamGame', secondary=user_games, back_populates='owners')
    member_of_groups = relationship('GamingGroup', secondary=group_members, back_populates='members')
    gaming_groups = relationship('GamingGroup', secondary=group_members, back_populates='members')  # ALIAS for gaming.py compatibility
    created_groups = relationship('GamingGroup', back_populates='creator', foreign_keys='GamingGroup.creator_id')
    created_sessions = relationship('GameSession', back_populates='creator', foreign_keys='GameSession.creator_id')
    votes = relationship('Vote', back_populates='user', cascade='all, delete-orphan')
    favorite_game = relationship('SteamGame', foreign_keys=[favorite_game_id])

    # Compatibility properties
    @property 
    def steam_connected_alias(self):
        """Alias for steam_connected for backward compatibility"""
        return self.steam_connected or self.is_steam_connected
    
    @steam_connected_alias.setter
    def steam_connected_alias(self, value):
        self.steam_connected = value
        self.is_steam_connected = value

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    # Steam sync helper methods
    def can_sync_steam(self):
        """
        Check if user can sync Steam library (5 minute cooldown)
        Returns tuple of (can_sync: bool, message: str)
        """
        if not self.steam_id:
            return False, "Steam account not connected"
        
        if not self.steam_library_synced_at:
            return True, "Ready to sync"
        
        # Use naive datetime for comparison to avoid timezone issues
        now = datetime.utcnow()
        last_synced = self.steam_library_synced_at
        
        # Handle timezone-aware datetime if present
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
        """
        Get remaining cooldown time in seconds
        Returns 0 if no cooldown or can sync
        """
        if not self.steam_id or not self.steam_library_synced_at:
            return 0
        
        # Use naive datetime for comparison
        now = datetime.utcnow()
        last_synced = self.steam_library_synced_at
        
        # Handle timezone-aware datetime if present
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
            
            # FIXED: Add both field names for compatibility
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

    def get_voting_stats(self):
        """Get user's voting statistics"""
        total_votes = len(self.votes)
        unique_sessions = len(set(vote.session_id for vote in self.votes))
        
        return {
            "total_votes_cast": total_votes,
            "sessions_participated": unique_sessions,
            "average_votes_per_session": round(total_votes / unique_sessions, 1) if unique_sessions > 0 else 0,
            "favorite_game": self.favorite_game.serialize() if self.favorite_game else None
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
            "appid": self.steam_appid,  # Alias for compatibility
            "name": self.name,
            "short_description": self.short_description,
            "header_image": self.header_image,
            "website": self.website,
            
            # Handle JSON parsing safely
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
    
    # Enhanced group statistics and settings
    total_sessions: Mapped[int] = mapped_column(Integer, default=0)
    active_sessions: Mapped[int] = mapped_column(Integer, default=0)
    default_auto_complete_threshold: Mapped[float] = mapped_column(Float, default=0.8)
    allow_member_create_sessions: Mapped[bool] = mapped_column(Boolean(), default=True)
    
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
            "preferred_genres": safe_json_loads(self.preferred_genres, []),
            "gaming_style": self.gaming_style,
            "total_sessions": self.total_sessions,
            "active_sessions": self.active_sessions,
            "default_auto_complete_threshold": self.default_auto_complete_threshold,
            "allow_member_create_sessions": self.allow_member_create_sessions
        }

    def get_group_stats(self):
        """Get comprehensive group statistics"""
        completed_sessions = len([s for s in self.sessions if s.status == 'completed'])
        total_votes = sum(len(s.votes) for s in self.sessions)
        
        return {
            "total_sessions": len(self.sessions),
            "completed_sessions": completed_sessions,
            "active_sessions": len([s for s in self.sessions if s.status == 'voting']),
            "total_votes_cast": total_votes,
            "average_participation": self.get_average_participation(),
            "most_popular_games": self.get_most_voted_games()
        }
    
    def get_average_participation(self):
        """Calculate average member participation across sessions"""
        if not self.sessions:
            return 0
        
        participation_rates = []
        for session in self.sessions:
            if session.status == 'completed':
                voter_count = Vote.get_voter_count(session.id)
                member_count = len(self.members)
                if member_count > 0:
                    participation_rates.append(voter_count / member_count * 100)
        
        return round(sum(participation_rates) / len(participation_rates), 1) if participation_rates else 0
    
    def get_most_voted_games(self, limit=5):
        """Get most popular games based on votes in this group"""
        from sqlalchemy import func
        
        try:
            game_votes = db.session.query(
                SteamGame.id,
                SteamGame.name,
                func.count(Vote.id).label('vote_count'),
                func.sum(Vote.priority).label('total_points')
            ).join(Vote).join(GameSession).filter(
                GameSession.group_id == self.id
            ).group_by(
                SteamGame.id
            ).order_by(
                func.sum(Vote.priority).desc()
            ).limit(limit).all()
            
            return [
                {
                    "game_id": game_id,
                    "name": name,
                    "vote_count": vote_count,
                    "total_points": total_points
                }
                for game_id, name, vote_count, total_points in game_votes
            ]
        except Exception:
            return []

# ============================================================================
# GAME SESSION MODEL - FIXED AND COMPLETE
# ============================================================================

class GameSession(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    
    # FIXED: Required relationships
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey('gaming_group.id', ondelete='CASCADE'), nullable=False)
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id'), nullable=True)  # ADDED: Missing creator field
    
    # FIXED: Core session fields matching gaming.py
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id'), nullable=True)
    session_name: Mapped[str] = mapped_column(String(200), nullable=False, default='Voting Session')  # ADDED
    description: Mapped[str] = mapped_column(Text, nullable=True)  # ADDED
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='planning')  # planning, voting, completed, cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
    vote_results: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string for backwards compatibility
    
    # ADDED: Enhanced live voting fields that gaming.py expects
    auto_complete_threshold: Mapped[float] = mapped_column(Float, default=0.8)  # Auto-complete at 80%
    max_choices: Mapped[int] = mapped_column(Integer, default=3)  # Max games per vote
    winner_game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id'), nullable=True)
    winner_votes: Mapped[int] = mapped_column(Integer, default=0)
    winner_points: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    votable_games: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string of available games
    
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
            "creator_id": self.creator_id,  # ADDED
            "creator": self.creator.serialize() if self.creator else None,  # ADDED
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
            # ADDED: Enhanced fields that gaming.py expects
            "auto_complete_threshold": self.auto_complete_threshold,
            "max_choices": self.max_choices,
            "winner_game": self.winner_game.serialize() if self.winner_game else None,
            "winner_votes": self.winner_votes,
            "winner_points": self.winner_points,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "votable_games": safe_json_loads(self.votable_games, [])
        }

# ============================================================================
# VOTE MODEL - ENHANCED FOR ATOMIC VOTING (Already correct)
# ============================================================================

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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    
    # Database-level constraints to prevent race conditions
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
            
            # Sort by total points
            results.sort(key=lambda x: x['total_points'], reverse=True)
            return results
    
    @classmethod
    def get_voter_count(cls, session_id):
        """Get voter count with error handling"""
        try:
            from sqlalchemy import func
            return db.session.query(func.count(func.distinct(cls.user_id))).filter_by(session_id=session_id).scalar() or 0
        except Exception:
            # Fallback method
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
    
    def __repr__(self):
        return f'<Vote {self.user.username if self.user else self.user_id} -> {self.game.name if self.game else self.game_id} ({self.priority} pts)>'

# ============================================================================
# HELPER FUNCTIONS FOR VOTE MANAGEMENT
# ============================================================================

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

def get_live_session_stats(session_id):
    """
    Get real-time session statistics for SSE broadcasting
    
    Returns:
        Dict with comprehensive session stats for live updates
    """
    session = GameSession.query.get(session_id)
    if not session:
        return None
    
    # Get vote statistics
    total_voters = Vote.get_voter_count(session_id)
    total_members = len(session.group.members) if session.group else 0
    
    # Calculate completion percentage
    completion_percentage = (total_voters / total_members * 100) if total_members > 0 else 0
    
    # Check if should auto-complete
    should_auto_complete = (
        session.status == 'voting' and
        completion_percentage >= (session.auto_complete_threshold * 100) and
        total_voters >= 2
    )
    
    # Get current results
    results = Vote.get_session_results(session_id)
    
    return {
        "session_id": session_id,
        "status": session.status,
        "total_voters": total_voters,
        "total_members": total_members,
        "completion_percentage": round(completion_percentage, 1),
        "should_auto_complete": should_auto_complete,
        "auto_complete_threshold": session.auto_complete_threshold,
        "max_choices": session.max_choices,
        "results": results,
        "winner": results[0] if results and session.status == 'completed' else None,
        "voting_complete": session.status == 'completed',
        "last_updated": session.updated_at.isoformat() if session.updated_at else None
    }

def auto_complete_session_if_ready(session_id):
    """
    Check if session should be auto-completed and complete it if ready
    
    Returns:
        Tuple of (was_completed: bool, session_stats: dict)
    """
    session = GameSession.query.get(session_id)
    if not session or session.status != 'voting':
        return False, None
    
    stats = get_live_session_stats(session_id)
    
    if stats and stats['should_auto_complete']:
        # Auto-complete the session
        session.status = 'completed'
        session.completed_at = utc_now()
        session.updated_at = utc_now()
        
        # Set winner information
        results = stats['results']
        if results:
            winner = results[0]
            session.winner_game_id = winner['game']['id']
            session.winner_votes = winner['vote_count']
            session.winner_points = winner['total_points']
        
        db.session.commit()
        
        # Return updated stats
        updated_stats = get_live_session_stats(session_id)
        return True, updated_stats
    
    return False, stats