from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, DateTime, Text, Integer, Table, Column, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
import json

db = SQLAlchemy()

# Association table for many-to-many relationship between users and games
user_games = Table(
    'user_games',
    db.Model.metadata,
    Column('user_id', Integer, ForeignKey('user.id'), primary_key=True),
    Column('game_id', Integer, ForeignKey('steam_game.id'), primary_key=True),
    Column('hours_played', Integer, default=0),
    Column('last_played', DateTime, nullable=True),
    Column('added_at', DateTime, default=datetime.utcnow)
)

# Association table for group memberships
group_members = Table(
    'group_members',
    db.Model.metadata,
    Column('user_id', Integer, ForeignKey('user.id'), primary_key=True),
    Column('group_id', Integer, ForeignKey('gaming_group.id'), primary_key=True),
    Column('joined_at', DateTime, default=datetime.utcnow),
    Column('role', String(20), default='member')  # member, admin, owner
)

class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    avatar_url: Mapped[str] = mapped_column(String(300), nullable=True)
    bio: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    
    # Steam Integration
    steam_id: Mapped[str] = mapped_column(String(17), nullable=True, unique=True)  # Steam ID64
    steam_username: Mapped[str] = mapped_column(String(100), nullable=True)
    steam_avatar_url: Mapped[str] = mapped_column(String(300), nullable=True)
    steam_profile_url: Mapped[str] = mapped_column(String(300), nullable=True)
    is_steam_connected: Mapped[bool] = mapped_column(Boolean(), default=False)
    steam_library_synced_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Gaming Preferences
    gaming_preferences: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    favorite_genres: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    gaming_style: Mapped[str] = mapped_column(String(50), nullable=True)  # casual, competitive, etc.
    
    # Relationships
    owned_games = relationship('SteamGame', secondary=user_games, back_populates='owners')
    groups = relationship('GamingGroup', secondary=group_members, back_populates='members')
    created_groups = relationship('GamingGroup', back_populates='creator')

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            # do not serialize the password, its a security breach
        }
# ────────────────────────────────────────────────────────────
# STEAM ACCOUNT linked to a user
# ────────────────────────────────────────────────────────────
class SteamLink(db.Model):
    __tablename__ = "steam_link"
    id:        Mapped[int]  = mapped_column(primary_key=True)
    steamid:   Mapped[str]  = mapped_column(String(20), unique=True)
    persona:   Mapped[str]  = mapped_column(String(120))
    avatar:    Mapped[str]  = mapped_column(String(255))

    user_id:   Mapped[int]  = mapped_column(ForeignKey("user.id"))
    user      = relationship("User", back_populates="steam")

    games     = relationship("Game", back_populates="steam_link",
                             cascade="all, delete-orphan")

# ────────────────────────────────────────────────────────────
# INDIVIDUAL GAME owned by that Steam account
# ────────────────────────────────────────────────────────────
class Game(db.Model):
    __tablename__ = "game"
    id:            Mapped[int] = mapped_column(primary_key=True)
    appid:         Mapped[int] = mapped_column(Integer)
    name:          Mapped[str] = mapped_column(String(200))
    playtime:      Mapped[int] = mapped_column(Integer)   # minutes played
    steam_link_id: Mapped[int] = mapped_column(ForeignKey("steam_link.id"))
    steam_link   = relationship("SteamLink", back_populates="games")
    def serialize(self):
        return {
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
    
    # Game Details
    genres: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    categories: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    tags: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    supported_languages: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Multiplayer Info
    multiplayer: Mapped[bool] = mapped_column(Boolean(), default=False)
    co_op: Mapped[bool] = mapped_column(Boolean(), default=False)
    max_players: Mapped[int] = mapped_column(Integer, nullable=True)
    min_players: Mapped[int] = mapped_column(Integer, default=1)
    
    # Pricing & Release
    price: Mapped[str] = mapped_column(String(20), nullable=True)
    release_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Meta Information
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owners = relationship('User', secondary=user_games, back_populates='owned_games')

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
    
    # Group Settings
    is_public: Mapped[bool] = mapped_column(Boolean(), default=False)
    max_members: Mapped[int] = mapped_column(Integer, default=10)
    invite_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=True)
    
    # Creator
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey('user.id'), nullable=False)
    
    # Group Preferences
    preferred_genres: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    gaming_style: Mapped[str] = mapped_column(String(50), nullable=True)
    
    # Relationships
    creator = relationship('User', back_populates='created_groups')
    members = relationship('User', secondary=group_members, back_populates='groups')

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
            "creator": self.creator.serialize() if self.creator else None,
            "members": [member.serialize() for member in self.members] if self.members else [],
            "preferred_genres": json.loads(self.preferred_genres) if self.preferred_genres else [],
            "gaming_style": self.gaming_style
        }

class GameSession(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey('gaming_group.id'), nullable=False)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey('steam_game.id'), nullable=True)
    
    # Session Details
    session_name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=True)
    
    # Session Status
    status: Mapped[str] = mapped_column(String(20), default='planning')  # planning, voting, scheduled, active, completed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Voting Results
    vote_results: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    
    # Relationships
    group = relationship('GamingGroup')
    game = relationship('SteamGame')

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
            "vote_results": json.loads(self.vote_results) if self.vote_results else {}
        }
