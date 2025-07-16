# src/api/models.py - COMPLETE VERSION with voting system

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, DateTime, Text, Integer, Table, Column, ForeignKey
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

    owned_games = relationship('SteamGame', secondary=user_games, back_populates='owners')
    groups = relationship('GamingGroup', secondary=group_members, back_populates='groups')
    created_groups = relationship('GamingGroup', back_populates='creator')
    # 🆕 NEW: Add relationship to votes
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
    
    owners = relationship('User', secondary=user_games, back_populates='owned_games')
    # 🆕 NEW: Add relationship to votes
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
    
    # 🔧 FIXED: Proper cascade configuration for creator relationship
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id', ondelete='SET NULL'), nullable=True)
    
    preferred_genres: Mapped[str] = mapped_column(Text, nullable=True)
    gaming_style: Mapped[str] = mapped_column(String(50), nullable=True)
    
    # 🔧 FIXED: Proper relationships with cascade
    creator = relationship('User', back_populates='created_groups', foreign_keys=[creator_id])
    members = relationship('User', secondary=group_members, back_populates='groups')
    
    # 🔧 CRITICAL FIX: Add cascade relationship to sessions
    # This will automatically delete all game sessions when a group is deleted
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
            # 🔧 FIXED: Handle deleted creators gracefully
            "creator": self.creator.serialize() if self.creator else {"username": "Deleted User", "id": None},
            "members": [member.serialize() for member in self.members] if self.members else [],
            "preferred_genres": json.loads(self.preferred_genres) if self.preferred_genres else [],
            "gaming_style": self.gaming_style
        }

class GameSession(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    
    # 🔧 CRITICAL FIX: Add CASCADE to foreign key constraint
    # This tells the database to delete sessions when the group is deleted
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey('gaming_group.id', ondelete='CASCADE'), nullable=False)
    
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id'), nullable=True)
    session_name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='planning')  # planning, voting, completed, cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    vote_results: Mapped[str] = mapped_column(Text, nullable=True)
    
    # 🔧 FIXED: Updated relationships
    group = relationship('GamingGroup', back_populates='sessions')
    game = relationship('SteamGame')
    # 🆕 NEW: Add relationship to votes
    votes = relationship('Vote', back_populates='session', cascade='all, delete-orphan')

    # 🆕 NEW: Helper methods for voting functionality
    def get_vote_summary(self):
        """Get summary of votes for this session"""
        vote_counts = {}
        total_points = {}
        
        for vote in self.votes:
            game_id = vote.game_id
            vote_counts[game_id] = vote_counts.get(game_id, 0) + 1
            total_points[game_id] = total_points.get(game_id, 0) + vote.points
        
        return {
            "vote_counts": vote_counts,
            "total_points": total_points,
            "total_voters": len(set(vote.user_id for vote in self.votes))
        }

    def get_winner(self):
        """Get the winning game based on total points"""
        summary = self.get_vote_summary()
        if not summary['total_points']:
            return None
        
        winner_game_id = max(summary['total_points'].items(), key=lambda x: x[1])[0]
        winner_game = SteamGame.query.get(winner_game_id)
        
        return {
            "game": winner_game.serialize() if winner_game else None,
            "total_points": summary['total_points'][winner_game_id],
            "vote_count": summary['vote_counts'][winner_game_id]
        }

    def is_user_voted(self, user_id):
        """Check if user has already voted"""
        return any(vote.user_id == user_id for vote in self.votes)

    def get_user_votes(self, user_id):
        """Get specific user's votes ordered by rank"""
        user_votes = [vote for vote in self.votes if vote.user_id == user_id]
        return sorted(user_votes, key=lambda x: x.rank)

    def get_member_count(self):
        """Get total number of group members eligible to vote"""
        return len([m for m in self.group.members if m.is_steam_connected])

    def is_voting_complete(self):
        """Check if all eligible members have voted"""
        eligible_members = self.get_member_count()
        voted_members = len(set(vote.user_id for vote in self.votes))
        return voted_members >= eligible_members and eligible_members > 0

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
            # 🆕 NEW: Include voting information in serialization
            "vote_summary": self.get_vote_summary(),
            "winner": self.get_winner(),
            "voting_complete": self.is_voting_complete(),
            "eligible_voters": self.get_member_count()
        }

# 🆕 NEW: Vote model for individual votes
class Vote(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey('game_session.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id', ondelete='CASCADE'), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)  # 3 for 1st choice, 2 for 2nd, 1 for 3rd
    rank: Mapped[int] = mapped_column(Integer, nullable=False)    # 1 for 1st choice, 2 for 2nd, 3 for 3rd
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship('GameSession', back_populates='votes')
    user = relationship('User', back_populates='votes')
    game = relationship('SteamGame', back_populates='votes')
    
    # Ensure a user can only vote once per session per rank
    __table_args__ = (
        db.UniqueConstraint('session_id', 'user_id', 'rank', name='unique_user_session_rank'),
    )
    
    def serialize(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "game": self.game.serialize() if self.game else None,
            "points": self.points,
            "rank": self.rank,
            "created_at": self.created_at.isoformat()
        }