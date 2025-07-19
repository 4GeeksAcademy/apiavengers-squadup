# src/api/__init__.py - Register all blueprints and initialize API package

from flask import Flask

def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    
    from .routes import api as main_routes
    from .auth import auth
    from .gaming import gaming
    from .steam import steam
    from .steam_auth import steam_auth
    from .live_voting_system import live_voting

    app.register_blueprint(main_routes, url_prefix='/api')
    app.register_blueprint(auth, url_prefix='/api/auth')
    app.register_blueprint(gaming, url_prefix='/api/gaming')
    app.register_blueprint(steam, url_prefix='/api/steam')
    app.register_blueprint(steam_auth, url_prefix='/api/auth/steam')
    app.register_blueprint(live_voting, url_prefix='/api/live-voting')

    print("✅ Registered Blueprints: main, auth, gaming, steam, steam_auth, live_voting")

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