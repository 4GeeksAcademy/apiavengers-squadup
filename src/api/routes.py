"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User
from api.utils import generate_sitemap, APIException
from flask_cors import CORS

# Import SteamService (assuming it's in the same directory)
from .steam_service import steam_service

api = Blueprint('api', __name__)

# Allow CORS requests to this API - Updated with your GitHub Codespace URLs
CORS(api, origins=[
    "https://bookish-funicular-9754qgjjg9743pqr7-3000.app.github.dev",
    "http://localhost:3000",
    "https://localhost:3000",
    "*"  # Allow all origins for development - remove in production
])

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
def connect_steam():
    """Connect user's Steam account"""
    data = request.json
    # Assuming user_id comes from auth context (e.g., JWT or session)
    # For now, placeholder: get user_id from request or token
    user_id = data.get('user_id')  # Replace with actual auth mechanism
    steam_id = data.get('steam_id')
    
    if not user_id or not steam_id:
        return jsonify({'error': 'user_id and steam_id are required'}), 400
    
    try:
        success = steam_service.connect_user_steam(user_id, steam_id)
        return jsonify({'success': success}), 200
    except APIException as e:
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@api.route('/steam/sync', methods=['POST'])
def sync_steam_library():
    """Sync user's Steam library"""
    data = request.json
    # Assuming user_id from auth
    user_id = data.get('user_id')  # Replace with actual auth
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    try:
        new_games, updated_games = steam_service.sync_user_library(user_id)
        return jsonify({
            'success': True,
            'new_games': new_games,
            'updated_games': updated_games
        }), 200
    except APIException as e:
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500