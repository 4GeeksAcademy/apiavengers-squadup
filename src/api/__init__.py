# src/api/__init__.py - Register all blueprints and initialize API package

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate

def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    
    # Import blueprints
    from .routes import api as main_routes      # Your existing routes (hello, test, etc.)
    from .auth import auth                      # Auth routes (login, register, etc.)
    from .gaming import gaming                  # Gaming routes (groups, sessions, etc.)
    
    # Register blueprints with proper URL prefixes
    app.register_blueprint(main_routes, url_prefix='/api')      # /api/hello, /api/test/auth
    app.register_blueprint(auth, url_prefix='/api/auth')        # /api/auth/login, /api/auth/register
    app.register_blueprint(gaming, url_prefix='/api/gaming')    # /api/gaming/groups, /api/gaming/sessions
    
    print("✅ Registered blueprints:")
    print("   - main_routes at /api")
    print("   - auth at /api/auth") 
    print("   - gaming at /api/gaming")
    
    # Note: steam_auth is already registered inside routes.py at /api/auth
    # so steam routes will be at /api/auth/steam/*

# Export commonly used items
from .models import db, User, GamingGroup, GameSession, SteamGame, Vote
from .utils import APIException

__all__ = [
    'register_blueprints', 
    'db',
    'User',
    'GamingGroup', 
    'GameSession',
    'SteamGame',
    'Vote',
    'APIException'
]