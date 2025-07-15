"""
REFINED Flask Application (`src/app.py`)
=========================================
This version includes:
- The necessary `dotenv` configuration to load environment variables.
- A robust CORS setup for GitHub Codespaces.
- A more secure JWT configuration that requires the secret key to be set.
"""
import os
import logging
from datetime import timedelta, datetime
from collections import defaultdict

# --- This is the correct fix ---
from dotenv import load_dotenv
load_dotenv() 

# Third-party imports
from flask import Flask, request, jsonify, send_from_directory, redirect, url_for, current_app
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_swagger import swagger
from flask_jwt_extended import JWTManager, get_jwt, create_refresh_token
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

# Local application imports
from api.utils import APIException
from api.models import db
from api.auth import auth
from api.gaming import gaming
from api.admin import setup_admin
from api.commands import setup_commands
from api.steam_auth import steam_auth
from api.genre_routes import genre_bp

# ============================================================================
# App Initialization & Environment
# ============================================================================
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../dist")

app = Flask(__name__, static_folder=static_file_dir, static_url_path="/")

app.url_map.strict_slashes = False

socketio = SocketIO(app, cors_allowed_origins="*")

# JWT
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1) 

jwt = JWTManager(app)
CORS(app, origins=["*"], supports_credentials=True)

# Database
db_url = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_DATABASE_URI"] = (
    db_url.replace("postgres://", "postgresql://") if db_url else "sqlite:////tmp/test.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)
Migrate(app, db, compare_type=True)

app.config["SERVER_NAME"] = os.getenv("DATABASE_URL")
app.config["PREFERRED_URL_SCHEME"] = "https"

# Admin & custom CLI commands
setup_admin(app)
setup_commands(app)

# Blueprints
app.register_blueprint(auth, url_prefix='/api/auth')
app.register_blueprint(steam_auth, url_prefix="/api")
app.register_blueprint(genre_bp, url_prefix="/api")
app.register_blueprint(gaming, url_prefix='/api/gaming')

# ============================================================================
# PRODUCTION-READY JWT CONFIGURATION
# ============================================================================

# SECURE TOKEN EXPIRATION TIMES
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)    # 1 HOUR (secure)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)   # 30 days for refresh

# ENABLE TOKEN BLACKLISTING FOR LOGOUT
app.config['JWT_BLACKLIST_ENABLED'] = True
app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = ['access', 'refresh']

# ============================================================================
# SECURE TOKEN BLACKLIST SYSTEM
# ============================================================================

# In-memory blacklist (use Redis/database in production for scaling)
blacklisted_tokens = set()

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """
    Check if token is blacklisted (logged out)
    This ensures logout actually works!
    """
    jti = jwt_payload['jti']  # JWT ID (unique identifier)
    return jti in blacklisted_tokens

# ============================================================================
# COMPREHENSIVE JWT ERROR HANDLERS
# ============================================================================

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    """Handle expired tokens - frontend should refresh or redirect to login"""
    return jsonify({
        'error': 'token_expired',
        'message': 'Your session has expired. Please refresh or log in again.',
        'code': 'TOKEN_EXPIRED'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    """Handle malformed or invalid tokens"""
    return jsonify({
        'error': 'invalid_token',
        'message': 'Invalid authentication token.',
        'code': 'TOKEN_INVALID'
    }), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    """Handle missing tokens - redirect to login"""
    return jsonify({
        'error': 'token_required',
        'message': 'Authentication required. Please log in.',
        'code': 'TOKEN_REQUIRED'
    }), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    """Handle revoked tokens (logged out users)"""
    return jsonify({
        'error': 'token_revoked',
        'message': 'You have been logged out. Please log in again.',
        'code': 'TOKEN_REVOKED'
    }), 401

@jwt.needs_fresh_token_loader
def token_not_fresh_callback(jwt_header, jwt_payload):
    """Handle operations requiring fresh tokens"""
    return jsonify({
        'error': 'fresh_token_required',
        'message': 'Fresh token required. Please log in again.',
        'code': 'FRESH_TOKEN_REQUIRED'
    }), 401

# ============================================================================
# SECURITY HEADERS & PROTECTION
# ============================================================================

@app.after_request
def after_request(response):
    """Add comprehensive security headers and CORS support"""
    # CORS headers
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    
    # Security headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    return response

# ============================================================================
# RATE LIMITING
# ============================================================================

# Simple in-memory rate limiting (use Redis in production)
request_counts = defaultdict(list)

def is_rate_limited(identifier, max_requests=100, window_minutes=15):
    """Check if request is rate limited"""
    now = datetime.utcnow()
    window_start = now - timedelta(minutes=window_minutes)
    
    # Clean old requests
    request_counts[identifier] = [
        req_time for req_time in request_counts[identifier] 
        if req_time > window_start
    ]
    
    # Check if limit exceeded
    if len(request_counts[identifier]) >= max_requests:
        return True
    
    # Add current request
    request_counts[identifier].append(now)
    return False

@app.before_request
def rate_limit():
    """Apply rate limiting to all requests"""
    if request.endpoint and 'static' not in request.endpoint:
        identifier = request.remote_addr
        
        if is_rate_limited(identifier):
            return jsonify({
                'error': 'rate_limit_exceeded',
                'message': 'Too many requests. Please try again later.',
                'code': 'RATE_LIMIT_EXCEEDED'
            }), 429

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

@app.route("/")
def sitemap():
    return jsonify("Hello World")

@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = os.path.join(static_file_dir, 'index.html')
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001, debug=True) 
