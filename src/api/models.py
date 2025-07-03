from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

db = SQLAlchemy()


class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)

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