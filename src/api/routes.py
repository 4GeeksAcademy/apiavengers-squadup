from flask import Flask, request, jsonify, url_for, Blueprint, current_app
from api.models import db, User
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import jwt_required, get_jwt_identity

# Import SteamService (assuming it's in the same directory)
from .steam_service import steam_service
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

# ============================================================================
# STEAM INTEGRATION ROUTES
# ============================================================================

@api.route('/steam/connect', methods=['POST'])
@jwt_required()
def connect_steam():
    """Connect user's Steam account"""
    current_user_id = get_jwt_identity()
    data = request.json
    steam_id = data.get('steam_id')
    
    if not steam_id:
        return jsonify({'error': 'steam_id is required'}), 400
    
    try:
        success = steam_service.connect_user_steam(current_user_id, steam_id)
        return jsonify({'success': success}), 200
    except APIException as e:
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@api.route('/steam/sync', methods=['POST'])
@jwt_required()
def sync_steam_library():
    """Sync user's Steam library"""
    current_user_id = get_jwt_identity()
    
    try:
        new_games, updated_games = steam_service.sync_user_library(current_user_id)
        return jsonify({
            'success': True,
            'new_games': new_games,
            'updated_games': updated_games
        }), 200
    except APIException as e:
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@api.route('/steam/common-games', methods=['POST'])
@jwt_required()
def get_common_games():
    """Get common games for a list of user IDs"""
    data = request.get_json()
    user_ids = data.get('user_ids')
    if not user_ids or not isinstance(user_ids, list) or len(user_ids) < 2:
        return jsonify({'error': 'At least 2 user IDs required as a list'}), 400
    
    try:
        common_games = steam_service.find_common_games(user_ids)
        # Serialize for response (assuming serialize() returns dict)
        return jsonify(games=[game.serialize() for game in common_games]), 200
    except APIException as e:
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Common games error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500