# src/api/routes.py - FIXED VERSION with correct model imports

from flask import Flask, request, jsonify, url_for, Blueprint, current_app
from api.models import db, User, GamingGroup, SteamGame, GameSession, Vote
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import jwt_required, get_jwt_identity

# Import steam_auth blueprint
from .steam_auth import steam_auth

api = Blueprint('api', __name__)

# Allow CORS requests to this API - Updated with your GitHub Codespace URLs
CORS(api, origins=[
    "https://bookish-funicular-9754qgjjg9743pqr7-3000.app.github.dev",
    "http://localhost:3000",
    "https://localhost:3000",
    "*"  # Allow all origins for development - remove in production
])

# Register steam_auth blueprint under /api/auth
api.register_blueprint(steam_auth, url_prefix='/auth')

@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():
    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }
    return jsonify(response_body), 200

# ============================================================================
# TEST ROUTES FOR DEVELOPMENT
# ============================================================================

@api.route('/test/auth', methods=['GET'])
def test_auth():
    """Test route to verify auth system is working"""
    return jsonify({
        "message": "Auth system is ready!",
        "endpoints": {
            "register": "/api/auth/register (POST)",
            "login": "/api/auth/login (POST)", 
            "verify": "/api/auth/verify (GET)",
            "profile": "/api/auth/profile (GET/PUT)"
        }
    }), 200

@api.route('/test/models', methods=['GET'])
def test_models():
    """Test route to verify models are working"""
    try:
        # Test database connection
        user_count = User.query.count()
        group_count = GamingGroup.query.count()
        game_count = SteamGame.query.count()
        session_count = GameSession.query.count()
        vote_count = Vote.query.count()
        
        return jsonify({
            "message": "Models are working!",
            "database_status": "connected",
            "model_counts": {
                "users": user_count,
                "gaming_groups": group_count,
                "steam_games": game_count,
                "game_sessions": session_count,
                "votes": vote_count
            }
        }), 200
    except Exception as e:
        return jsonify({
            "message": "Model test failed",
            "error": str(e),
            "database_status": "error"
        }), 500

# ============================================================================
# NOTE: All Steam routes are now handled in steam.py blueprint
# This prevents duplicate route definitions
# ============================================================================