"""
FIXED CORS Configuration for GitHub Codespaces
==============================================
Replace the CORS configuration in your src/app.py
"""

import os
from flask import Flask, request, jsonify, url_for, send_from_directory
from flask_migrate import Migrate
from flask_swagger import swagger
from flask_jwt_extended import JWTManager, get_jwt, create_refresh_token
from flask_cors import CORS
from datetime import timedelta, datetime
from api.utils import APIException, generate_sitemap
from api.models import db
from api.routes import api
from api.auth import auth
from api.gaming import gaming
from api.admin import setup_admin
from api.commands import setup_commands
from collections import defaultdict
import logging

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# ============================================================================
# FIXED CORS CONFIGURATION FOR GITHUB CODESPACES
# ============================================================================

# Get Codespace environment variables
CODESPACE_NAME = os.getenv('CODESPACE_NAME')
GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = os.getenv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')

# Build allowed origins list
allowed_origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
    "http://localhost:3001",
    "https://localhost:3001"
]

# Add GitHub Codespaces URLs if available
if CODESPACE_NAME and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:
    codespace_frontend = f"https://{CODESPACE_NAME}-3000.{GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    codespace_backend = f"https://{CODESPACE_NAME}-3001.{GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    allowed_origins.extend([codespace_frontend, codespace_backend])
    print(f"🌐 Added Codespace origins: {codespace_frontend}, {codespace_backend}")

# Apply CORS configuration
CORS(app, 
     origins=allowed_origins,
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     expose_headers=["Content-Type", "Authorization"])

print(f"🔧 CORS configured with origins: {allowed_origins}")

# Database configuration
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ============================================================================
# JWT CONFIGURATION
# ============================================================================

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', '8f99bd17ee30b628c5a65cb1d8d77eab4661abeee0241682676a6bd8c924ad4f')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['JWT_BLACKLIST_ENABLED'] = True
app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = ['access', 'refresh']

jwt = JWTManager(app)

# Initialize blacklist on app
app.blacklisted_tokens = set()

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """Check if token is blacklisted"""
    jti = jwt_payload['jti']
    return jti in app.blacklisted_tokens

# ============================================================================
# JWT ERROR HANDLERS
# ============================================================================

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'error': 'token_expired',
        'message': 'Your session has expired. Please refresh or log in again.',
        'code': 'TOKEN_EXPIRED'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({
        'error': 'invalid_token',
        'message': 'Invalid authentication token.',
        'code': 'TOKEN_INVALID'
    }), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({
        'error': 'token_required',
        'message': 'Authentication required. Please log in.',
        'code': 'TOKEN_REQUIRED'
    }), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'error': 'token_revoked',
        'message': 'You have been logged out. Please log in again.',
        'code': 'TOKEN_REVOKED'
    }), 401

@jwt.needs_fresh_token_loader
def token_not_fresh_callback(jwt_header, jwt_payload):
    return jsonify({
        'error': 'fresh_token_required',
        'message': 'Fresh token required. Please log in again.',
        'code': 'FRESH_TOKEN_REQUIRED'
    }), 401

# ============================================================================
# SECURITY HEADERS WITH CORS COMPATIBILITY
# ============================================================================

@app.after_request
def after_request(response):
    """Add security headers"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # CORS headers for preflight requests
    if request.method == 'OPTIONS':
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Access-Control-Allow-Credentials'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    
    if ENV == "production":
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    return response

# ============================================================================
# IMPROVED RATE LIMITING
# ============================================================================

rate_limit_storage = defaultdict(list)

def is_rate_limited(identifier, max_requests=30, window_minutes=15):
    """Simple rate limiting"""
    now = datetime.utcnow()
    window_start = now - timedelta(minutes=window_minutes)
    
    # Clean old requests
    rate_limit_storage[identifier] = [
        req_time for req_time in rate_limit_storage[identifier] 
        if req_time > window_start
    ]
    
    # Check if over limit
    if len(rate_limit_storage[identifier]) >= max_requests:
        return True
    
    # Add current request
    rate_limit_storage[identifier].append(now)
    return False

@app.before_request
def rate_limit():
    """Apply rate limiting to auth endpoints"""
    if request.endpoint and 'auth' in str(request.endpoint):
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        
        if is_rate_limited(client_ip, max_requests=30, window_minutes=15):
            return jsonify({
                'error': 'rate_limit_exceeded',
                'message': 'Too many requests. Please try again in 15 minutes.',
                'code': 'RATE_LIMITED'
            }), 429

# ============================================================================
# ERROR HANDLING
# ============================================================================

if not app.debug:
    file_handler = logging.FileHandler('error.log')
    file_handler.setLevel(logging.WARNING)
    app.logger.addHandler(file_handler)

@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

@app.errorhandler(Exception)
def handle_exception(e):
    """Log and handle all exceptions"""
    app.logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
    
    if isinstance(e, APIException):
        return jsonify({"error": e.message}), e.status_code
    
    if ENV == "production":
        return jsonify({"error": "Internal server error"}), 500
    else:
        return jsonify({"error": str(e)}), 500

# ============================================================================
# APP SETUP
# ============================================================================

MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

setup_admin(app)
setup_commands(app)

# Register blueprints
app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(auth, url_prefix='/api/auth')
app.register_blueprint(gaming, url_prefix='/api/gaming')

@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0
    return response

# ============================================================================
# CORS DEBUG ROUTE
# ============================================================================

@app.route('/debug/cors', methods=['GET', 'OPTIONS'])
def debug_cors():
    """Debug route to check CORS configuration"""
    return jsonify({
        "cors_debug": True,
        "request_origin": request.headers.get('Origin'),
        "allowed_origins": allowed_origins,
        "request_method": request.method,
        "codespace_name": CODESPACE_NAME,
        "forwarding_domain": GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
        "headers": dict(request.headers)
    })

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)