# src/api/__init__.py - FIXED VERSION with proper JWT configuration and blueprint registration

from flask import Flask

def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    
    # Import all blueprints
    from .routes import api as main_routes
    from .auth import auth
    from .gaming import gaming
    from .steam import steam
    from .steam_auth import steam_auth
    from .steam_proxy import steam_proxy
    from .live_voting_system import live_voting
    
    # Register blueprints with consistent URL prefixes
    app.register_blueprint(main_routes, url_prefix='/api')
    app.register_blueprint(auth, url_prefix='/api/auth')
    app.register_blueprint(gaming, url_prefix='/api/gaming')
    app.register_blueprint(steam, url_prefix='/api/steam')
    app.register_blueprint(steam_auth, url_prefix='/api/auth/steam')
    app.register_blueprint(steam_proxy, url_prefix='/api/steam')
    app.register_blueprint(live_voting, url_prefix='/api/live-voting')
    
    print("✅ Registered Blueprints: main, auth, gaming, steam, steam_auth, steam_proxy, live_voting")

def configure_jwt_error_handlers(jwt):
    """Configure consistent JWT error handlers across all blueprints"""
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {
            'success': False,
            'error': 'Token has expired',
            'code': 'TOKEN_EXPIRED'
        }, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {
            'success': False,
            'error': 'Invalid token',
            'code': 'TOKEN_INVALID'
        }, 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {
            'success': False,
            'error': 'Authorization token is required',
            'code': 'TOKEN_REQUIRED'
        }, 401

    @jwt.needs_fresh_token_loader
    def token_not_fresh_callback(jwt_header, jwt_payload):
        return {
            'success': False,
            'error': 'Fresh token required',
            'code': 'TOKEN_NOT_FRESH'
        }, 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return {
            'success': False,
            'error': 'Token has been revoked',
            'code': 'TOKEN_REVOKED'
        }, 401

    print("✅ Configured JWT error handlers")

# Import all models and utilities
from .models import db, User, GamingGroup, GameSession, SteamGame, Vote
from .utils import APIException

# Export everything needed by the application
__all__ = [
    'register_blueprints',
    'configure_jwt_error_handlers',
    'db',
    'User',
    'GamingGroup', 
    'GameSession',
    'SteamGame',
    'Vote',
    'APIException'
]