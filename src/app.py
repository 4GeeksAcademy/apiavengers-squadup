"""
Production-Ready JWT Security Configuration
"""
import os

from flask import Flask, send_from_directory, jsonify, request, current_app   
from flask_migrate import Migrate
from flask_socketio import SocketIO
from api.steam_auth import steam_bp
from flask_swagger import swagger
from flask_jwt_extended import JWTManager, get_jwt, create_refresh_token
from flask_cors import CORS
from datetime import timedelta
from api.utils import APIException, generate_sitemap
from api.models import db
from api.auth import auth
from api.gaming import gaming  # Import gaming blueprint
from api.admin import setup_admin
from api.commands import setup_commands
from api.genre_routes import genre_bp
from werkzeug.middleware.proxy_fix import ProxyFix

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../dist")

app = Flask(__name__, static_folder=static_file_dir, static_url_path="/")

app.url_map.strict_slashes = False


socketio = SocketIO(app, cors_allowed_origins="*")


# JWT
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1) 

jwt = JWTManager(app)
CORS(app)

# Database
db_url = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_DATABASE_URI"] = (
    db_url.replace("postgres://", "postgresql://") if db_url else "sqlite:////tmp/test.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
Migrate(app, db, compare_type=True)

app.config["SERVER_NAME"] = "animated-eureka-5grpx4q7wvpgf66g-3001.app.github.dev"
app.config["PREFERRED_URL_SCHEME"] = "https"

# Admin & custom CLI commands
setup_admin(app)
setup_commands(app)

# Blueprints
app.register_blueprint(auth, url_prefix='/api/auth')
#app.register_blueprint(api_bp, url_prefix="/api")
app.register_blueprint(steam_bp, url_prefix="/api")
app.register_blueprint(genre_bp, url_prefix="/api")
app.register_blueprint(gaming, url_prefix='/api/gaming')

# Enable CORS for your GitHub Codespace frontend
#CORS(app, origins=[
#    "https://bookish-funicular-9754qgjjg9743pqr7-3000.app.github.dev",
#    "http://localhost:3000",
#    "https://localhost:3000",
#])

# Database configuration


app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

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

@jwt.invalid_token_loader
def invalid_token_callback(err_msg):
    current_app.logger.warning(f"Invalid token → {err_msg}")
    return jsonify(
        error="invalid_token",
        message=err_msg,
        code="TOKEN_INVALID"
    ), 401

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
    """Add comprehensive security headers"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Only add HSTS in production with HTTPS
    if ENV == "production":
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    return response

# ============================================================================
# RATE LIMITING PROTECTION (Basic)
# ============================================================================

from collections import defaultdict
from datetime import datetime

# Simple rate limiting storage (use Redis in production)
rate_limit_storage = defaultdict(list)

def is_rate_limited(identifier, max_requests=100, window_minutes=15):
    """
    Basic rate limiting - 100 requests per 15 minutes per IP
    In production, use Flask-Limiter or Redis
    """
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
    if request.endpoint and 'auth' in request.endpoint:
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        
        if is_rate_limited(client_ip, max_requests=20, window_minutes=15):
            return jsonify({
                'error': 'rate_limit_exceeded',
                'message': 'Too many requests. Please try again later.',
                'code': 'RATE_LIMITED'
            }), 429

# ============================================================================
# REST OF YOUR APP CONFIGURATION
# ============================================================================
db.init_app(app)
MIGRATE = Migrate(app, db, compare_type=True)



# Register blueprints - MOVED TO CORRECT LOCATION
#app.register_blueprint(app, url_prefix='/api')


# Error handler
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# Sitemap / SPA fall-through
@app.route("/")
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, "index.html")

@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = "index.html"
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0
    return response

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    socketio.run(host='0.0.0.0', port=PORT, debug=True) 
