"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User
import os
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import create_access_token
from flask_jwt_extended import get_jwt_identity
from flask_jwt_extended import jwt_required
from flask_jwt_extended import JWTManager

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
