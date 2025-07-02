import os

SECRET_KEY = os.getenv("SUPER_SECRET_SECRET", "fallback-dev-secret")
SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///steamusers.db")
SQLALCHEMY_TRACK_MODIFICATIONS = False
STEAM_API_KEY = os.getenv("STEAM_API_KEY")  # ✅ fallback for dev
