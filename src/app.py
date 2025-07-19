# src/app.py - ENHANCED JWT CONFIGURATION

import os
import sys
import logging
from datetime import timedelta
from collections import defaultdict
from sqlalchemy import text
from pathlib import Path

# Add the src directory to Python path for imports
current_dir = Path(__file__).parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

# Also add parent directory in case we're running from root
parent_dir = current_dir.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

# Load environment first
from dotenv import load_dotenv
load_dotenv()

# Third-party imports
from flask import Flask, request, jsonify, send_from_directory, redirect, url_for
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, get_jwt, jwt_required, get_jwt_identity
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# FIXED: Local application imports with flexible path handling
try:
    # Try direct imports first (when running from src/)
    from api.utils import APIException, utc_now
    from api.models import db
    from api.routes import api
    from api.auth import auth
    from api.gaming import gaming
    from api.admin import setup_admin
    from api.commands import setup_commands
    from api.steam_auth import steam_auth
    from api.steam import steam
    # UPDATED: Import live voting system
    from api.live_voting_system import live_voting
except ImportError:
    try:
        # Try with src prefix (when running from root)
        from src.api.utils import APIException, utc_now
        from src.api.models import db
        from src.api.routes import api
        from src.api.auth import auth
        from src.api.gaming import gaming
        from src.api.admin import setup_admin
        from src.api.commands import setup_commands
        from src.api.steam_auth import steam_auth
        from src.api.steam import steam
        # UPDATED: Import live voting system
        from src.api.live_voting_system import live_voting
    except ImportError as e:
        print(f"Import error: {e}")
        raise

# ============================================================================
# App Initialization & Environment
# ============================================================================
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# ============================================================================
# ENHANCED JWT CONFIGURATION - CRITICAL FIXES
# ============================================================================

# JWT Secret Key - ENHANCED SECURITY
jwt_secret = os.getenv('JWT_SECRET_KEY')
if not jwt_secret:
    # Generate a secure secret key if not provided
    import secrets
    jwt_secret = secrets.token_urlsafe(32)
    print("⚠️ WARNING: No JWT_SECRET_KEY found in environment. Generated temporary key.")
    print("   For production, set a permanent JWT_SECRET_KEY in your environment.")

app.config['JWT_SECRET_KEY'] = jwt_secret

# JWT Configuration - ENHANCED SETTINGS
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)  # Short-lived access tokens
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)  # Longer refresh tokens

# JWT Token Location - Allow both headers and cookies for flexibility
app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

# Cookie Configuration for JWT (optional, for web app convenience)
app.config['JWT_COOKIE_SECURE'] = ENV == "production"  # Only HTTPS in production
app.config['JWT_COOKIE_HTTPONLY'] = True  # Prevent XSS attacks
app.config['JWT_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection

# CSRF Protection for Cookies (if using cookies)
app.config['JWT_COOKIE_CSRF_PROTECT'] = True  # Enable CSRF protection
app.config['JWT_CSRF_IN_COOKIES'] = True  # Store CSRF token in cookies
app.config['JWT_CSRF_CHECK_FORM'] = True  # Check CSRF in forms

# Algorithm and Verification
app.config['JWT_ALGORITHM'] = 'HS256'  # Symmetric algorithm (good for single app)
app.config['JWT_VERIFY_SUB'] = True  # Verify subject claim

# Token Claims Configuration
app.config['JWT_IDENTITY_CLAIM'] = 'sub'  # Standard claim name
app.config['JWT_ERROR_MESSAGE_KEY'] = 'message'  # Custom error message key

# Additional Security Settings
app.config['JWT_BLACKLIST_ENABLED'] = True  # Enable token blacklisting
app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = ['access', 'refresh']  # Check both token types

# Initialize JWT Manager
jwt = JWTManager(app)

# ============================================================================
# JWT CALLBACK FUNCTIONS - ESSENTIAL FOR PROPER OPERATION
# ============================================================================

# Token blacklist storage (in production, use Redis or database)
blacklisted_tokens = set()

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """Check if a JWT exists in the blocklist"""
    jti = jwt_payload['jti']
    return jti in blacklisted_tokens

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    """Callback for revoked token"""
    return jsonify({
        'success': False,
        'message': 'The token has been revoked.',
        'error': 'token_revoked'
    }), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    """Callback for expired token"""
    return jsonify({
        'success': False,
        'message': 'The token has expired.',
        'error': 'token_expired'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    """Callback for invalid token"""
    return jsonify({
        'success': False,
        'message': 'Invalid token provided.',
        'error': 'invalid_token'
    }), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    """Callback for missing token"""
    return jsonify({
        'success': False,
        'message': 'Authorization token is required.',
        'error': 'authorization_required'
    }), 401

@jwt.needs_fresh_token_loader
def token_not_fresh_callback(jwt_header, jwt_payload):
    """Callback for non-fresh token when fresh token is required"""
    return jsonify({
        'success': False,
        'message': 'Fresh token required.',
        'error': 'fresh_token_required'
    }), 401

@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    """Load user from JWT data"""
    try:
        from api.models import User
        identity = jwt_data["sub"]
        return User.query.filter_by(id=identity).one_or_none()
    except Exception as e:
        print(f"Error loading user from JWT: {e}")
        return None

@jwt.additional_claims_loader
def add_claims_to_jwt(identity):
    """Add additional claims to JWT"""
    try:
        from api.models import User
        user = User.query.get(identity)
        if user:
            return {
                'username': user.username,
                'email': user.email,
                'steam_connected': user.is_steam_connected or user.steam_connected,
                'is_active': user.is_active
            }
    except Exception as e:
        print(f"Error adding claims to JWT: {e}")
    return {}

# CSRF Error Handler
@jwt.csrf_error_loader
def csrf_error_callback(reason):
    """Handle CSRF errors"""
    return jsonify({
        'success': False,
        'message': f'CSRF Error: {reason}',
        'error': 'csrf_error'
    }), 400

# ============================================================================
# Database Configuration
# ============================================================================
db_url = os.getenv("DATABASE_URL")
if db_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace("postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'pool_recycle': 280}
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# ============================================================================
# Rate Limiting Configuration
# ============================================================================
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=os.getenv('REDIS_URL', 'memory://')
)
app.limiter = limiter

# ============================================================================
# CORS Configuration for GitHub Codespaces
# ============================================================================
allowed_origins = [os.getenv('FRONTEND_URL')] if os.getenv('FRONTEND_URL') else []
if not allowed_origins:
    allowed_origins.append('http://localhost:3000') # Default for local dev

CODESPACE_NAME = os.getenv('CODESPACE_NAME')
GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = os.getenv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')

if CODESPACE_NAME and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:
    frontend_codespace_url = f"https://{CODESPACE_NAME}-3000.{GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    if frontend_codespace_url not in allowed_origins:
        allowed_origins.append(frontend_codespace_url)

CORS(app, origins=allowed_origins, supports_credentials=True)
print(f"CORS enabled for origins: {allowed_origins}")

# ============================================================================
# Logging Configuration
# ============================================================================
logging.basicConfig(level=logging.INFO if ENV == "production" else logging.DEBUG)
logger = logging.getLogger(__name__)

# ============================================================================
# Error Handlers
# ============================================================================
@app.errorhandler(APIException)
def handle_api_exception(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

# ============================================================================
# Blueprint Registration
# ============================================================================
setup_admin(app)
setup_commands(app)
app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(auth, url_prefix='/api/auth')
app.register_blueprint(gaming, url_prefix='/api/gaming')
app.register_blueprint(steam, url_prefix='/api/steam')
app.register_blueprint(steam_auth, url_prefix='/api/auth/steam')
app.register_blueprint(live_voting, url_prefix='/api/live-voting')

# ============================================================================
# Utility Functions for Token Management
# ============================================================================

def add_token_to_blocklist(jti):
    """Add a token to the blocklist"""
    blacklisted_tokens.add(jti)

def remove_token_from_blocklist(jti):
    """Remove a token from the blocklist (if needed for testing)"""
    blacklisted_tokens.discard(jti)

def is_token_blacklisted(jti):
    """Check if a token is blacklisted"""
    return jti in blacklisted_tokens

# Make these available globally
app.add_token_to_blocklist = add_token_to_blocklist
app.remove_token_from_blocklist = remove_token_from_blocklist
app.is_token_blacklisted = is_token_blacklisted

# ============================================================================
# Route Configuration & Health Checks
# ============================================================================
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy', 
        'timestamp': utc_now().isoformat(),
        'jwt_configured': bool(app.config.get('JWT_SECRET_KEY')),
        'environment': ENV
    }), 200

@app.route('/api/auth/test-jwt')
@jwt_required()
def test_jwt():
    """Test endpoint to verify JWT is working"""
    current_user_id = get_jwt_identity()
    jwt_data = get_jwt()
    
    return jsonify({
        'message': 'JWT is working correctly!',
        'user_id': current_user_id,
        'jwt_claims': {k: v for k, v in jwt_data.items() if k not in ['exp', 'iat', 'nbf']},
        'timestamp': utc_now().isoformat()
    }), 200

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(static_file_dir, path)):
        return send_from_directory(static_file_dir, path)
    else:
        return send_from_directory(static_file_dir, 'index.html')

# ============================================================================
# Main Entry Point
# ============================================================================
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables checked/created.")
            
            # Verify JWT configuration
            print("✅ JWT Configuration:")
            print(f"   Secret Key: {'Set' if app.config.get('JWT_SECRET_KEY') else 'Missing'}")
            print(f"   Access Token Expires: {app.config.get('JWT_ACCESS_TOKEN_EXPIRES')}")
            print(f"   Refresh Token Expires: {app.config.get('JWT_REFRESH_TOKEN_EXPIRES')}")
            print(f"   Token Locations: {app.config.get('JWT_TOKEN_LOCATION')}")
            print(f"   Algorithm: {app.config.get('JWT_ALGORITHM')}")
            
        except Exception as e:
            print(f"❌ Database or JWT initialization error: {e}")
            
    app.run(host='0.0.0.0', port=PORT, debug=(ENV == "development"))