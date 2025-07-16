from flask import Flask, request, jsonify, url_for, Blueprint, current_app
from api.models import db, User
import os
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import create_access_token
from flask_jwt_extended import get_jwt_identity
from flask_jwt_extended import jwt_required
from flask_jwt_extended import JWTManager

routes = Blueprint('routes', __name__)

# Allow CORS requests to this API - Updated with your GitHub Codespace URLs
CORS(routes, origins=[
    "http://localhost:3000",
    "https://animated-eureka-5grpx4q7wvpgf66g-3000.app.github.dev",
    "https://animated-eureka-5grpx4q7wvpgf66g-3001.app.github.dev",
    "*"  # Allow all origins for development - remove in production
])

# Register steam_auth blueprint under /api/auth
routes.register_blueprint(steam_auth, url_prefix='/auth')

@routes.route('/hello', methods=['POST', 'GET'])
def handle_hello():
    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }
    return jsonify(response_body), 200

# ============================================================================
# TEST ROUTES FOR DEVELOPMENT
# ============================================================================

@routes.route('/test/auth', methods=['GET'])
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
# NOTE: All Steam routes are now handled in steam.py blueprint
# This prevents duplicate route definitions
# ============================================================================
