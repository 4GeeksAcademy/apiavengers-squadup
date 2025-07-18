import os
import logging
from datetime import timedelta, datetime
from collections import defaultdict

# --- This is the correct fix ---
from dotenv import load_dotenv
load_dotenv()
print(f"Loaded FRONTEND_URL: {os.getenv('FRONTEND_URL')}")  # Should print the codespace URL 

# Third-party imports
from flask import Flask, request, jsonify, send_from_directory, redirect, url_for
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, get_jwt
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Local application imports
from api.utils import APIException
from api.models import db
from api.routes import api
from api.auth import auth
from api.gaming import gaming
from api.admin import setup_admin
from api.commands import setup_commands
from api.steam_auth import steam_auth
from api.steam import steam

# 🚀 NEW: Import live voting blueprints
from api.live_events import live_events
from api.member_status import member_status

# ============================================================================
# App Initialization & Environment
# ============================================================================
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# ============================================================================
# Enhanced Database Configuration with Connection Pooling
# ============================================================================
db_url = os.getenv("DATABASE_URL")
if db_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace("postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Enhanced database configuration for production reliability
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'pool_recycle': 300,
    'pool_pre_ping': True,  # Validates connections before use
    'max_overflow': 20,
    'pool_timeout': 30
}

MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# ============================================================================
# Rate Limiting Configuration
# ============================================================================
# Configure rate limiting - use Redis in production for better performance
redis_url = os.getenv('REDIS_URL', 'memory://')
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["1000 per day", "100 per hour"] if ENV == "production" else ["2000 per day", "200 per hour"],
    storage_uri=redis_url
)

# ============================================================================
# CORS Configuration for GitHub Codespaces - ENHANCED
# ============================================================================
CODESPACE_NAME = os.getenv('CODESPACE_NAME')
GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = os.getenv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')

if ENV == "production":
    # Production CORS - be specific about origins
    allowed_origins = [
        os.getenv('FRONTEND_URL', 'https://yourdomain.com'),  # Replace with actual domain
        # Add any additional production domains here
    ]
    print(f"🔒 Production CORS configured for: {allowed_origins}")
else:
    # Development CORS - more permissive
    allowed_origins = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://localhost:3000"
    ]
    
    # Add Codespace URL if available
    if CODESPACE_NAME and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:
        codespace_frontend_url = f"https://{CODESPACE_NAME}-3000.{GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
        allowed_origins.append(codespace_frontend_url)
        print(f"🌐 Codespace frontend origin added: {codespace_frontend_url}")

# Enhanced CORS configuration
CORS(app, 
     origins=allowed_origins,
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     max_age=86400  # Cache preflight requests for 24 hours
)

print(f"🔧 CORS configured for origins: {allowed_origins}")

# ============================================================================
# Enhanced JWT Configuration with Better Security
# ============================================================================
# Validate required environment variables
required_env_vars = ['JWT_SECRET_KEY']
if ENV == "production":
    required_env_vars.extend(['DATABASE_URL'])

for var in required_env_vars:
    if not os.getenv(var):
        raise RuntimeError(f"{var} is not set in the environment. The application cannot start securely.")

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['JWT_ALGORITHM'] = 'HS256'

# Enhanced JWT configuration for security
if ENV == "production":
    app.config['JWT_COOKIE_SECURE'] = True  # HTTPS only in production
    app.config['JWT_COOKIE_CSRF_PROTECT'] = True

jwt = JWTManager(app)
app.blacklisted_tokens = set()

# Enhanced JWT handlers with better error messages
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload['jti']
    return jti in app.blacklisted_tokens

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'message': 'Your session has expired. Please log in again.',
        'error': 'token_expired',
        'code': 401
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({
        'message': 'Invalid authentication token. Please log in again.',
        'error': 'invalid_token',
        'code': 401
    }), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({
        'message': 'Authentication required. Please log in to access this resource.',
        'error': 'authorization_required',
        'code': 401
    }), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'message': 'Your session has been revoked. Please log in again.',
        'error': 'token_revoked',
        'code': 401
    }), 401

# ============================================================================
# Security Headers and Production Enhancements
# ============================================================================
if ENV == "production":
    from flask_talisman import Talisman
    
    # Add security headers in production
    Talisman(app, 
        force_https=True,
        strict_transport_security=True,
        content_security_policy={
            'default-src': "'self'",
            'script-src': "'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
            'font-src': "'self' https://fonts.gstatic.com",
            'img-src': "'self' data: https:",
            'connect-src': "'self' https:"
        }
    )

# ============================================================================
# Logging Configuration
# ============================================================================
if ENV == "production":
    # Production logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(name)s %(message)s',
        handlers=[
            logging.FileHandler('app.log'),
            logging.StreamHandler()
        ]
    )
else:
    # Development logging
    logging.basicConfig(level=logging.DEBUG)

logger = logging.getLogger(__name__)

# ============================================================================
# Enhanced Error Handlers
# ============================================================================
@app.errorhandler(404)
def not_found(error):
    if request.path.startswith('/api/'):
        return jsonify({
            'error': 'Resource not found',
            'message': 'The requested API endpoint does not exist',
            'code': 404
        }), 404
    # For non-API routes, serve the React app
    return send_from_directory(static_file_dir, 'index.html')

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    db.session.rollback()
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred. Please try again later.',
        'code': 500
    }), 500

@app.errorhandler(APIException)
def handle_api_exception(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

# Rate limit exceeded handler
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        'error': 'Rate limit exceeded',
        'message': 'Too many requests. Please slow down and try again later.',
        'code': 429,
        'retry_after': e.retry_after
    }), 429

# ============================================================================
# Blueprint & Route Registration with Rate Limiting
# ============================================================================
setup_admin(app)
setup_commands(app)

# Register blueprints - ENHANCED: Including new live voting blueprints
app.register_blueprint(api, url_prefix='/api')                              # Main API routes
app.register_blueprint(auth, url_prefix='/api/auth')                        # Auth routes  
app.register_blueprint(gaming, url_prefix='/api/gaming')                    # Gaming routes
app.register_blueprint(steam_auth, url_prefix='/api/auth/steam')            # Steam auth (OpenID)
app.register_blueprint(steam, url_prefix='/api/steam')                      # Steam API routes (library, sync, etc.)

# 🚀 NEW: Register live voting blueprints
app.register_blueprint(live_events, url_prefix='/api/live-events')          # Live event broadcasting
app.register_blueprint(member_status, url_prefix='/api/member-status')      # Member status tracking

print("✅ All blueprints registered successfully:")
print("   - API routes: /api/*")
print("   - Auth routes: /api/auth/*")
print("   - Gaming routes: /api/gaming/*")
print("   - Steam auth: /api/auth/steam/*")
print("   - Steam API: /api/steam/*")
print("   - 🚀 Live events: /api/live-events/*")
print("   - 🚀 Member status: /api/member-status/*")

# ============================================================================
# Enhanced Route Configuration & Health Checks
# ============================================================================
@app.route('/health')
@limiter.limit("100 per minute")
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    # 🚀 NEW: Check live voting system status
    live_status = "healthy"
    try:
        # Simple check for live event storage
        from api.live_events import event_store, active_connections
        active_sessions = len(event_store)
        total_connections = sum(len(conns) for conns in active_connections.values())
        live_status = "healthy"
    except Exception as e:
        logger.error(f"Live voting health check failed: {e}")
        live_status = "degraded"
    
    return jsonify({
        'status': 'healthy' if db_status == "healthy" and live_status == "healthy" else 'degraded',
        'timestamp': datetime.utcnow().isoformat(),
        'environment': ENV,
        'database': db_status,
        'live_voting': live_status,
        'live_sessions': active_sessions if live_status == "healthy" else 0,
        'live_connections': total_connections if live_status == "healthy" else 0,
        'version': '1.0.0'  # Add your app version
    }), 200 if db_status == "healthy" else 503

@app.route('/')
def redirect_to_admin():
    return redirect(url_for('admin.index'))

@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    """Serve static files or React app"""
    file_path = os.path.join(static_file_dir, path)
    if os.path.isfile(file_path):
        response = send_from_directory(static_file_dir, path)
        # Add caching headers for static assets
        if path.endswith(('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg')):
            response.cache_control.max_age = 86400  # Cache for 1 day
        else:
            response.cache_control.max_age = 0
        return response
    else:
        # Serve React app for any unmatched routes (SPA routing)
        response = send_from_directory(static_file_dir, 'index.html')
        response.cache_control.max_age = 0
        return response

# 🚀 ENHANCED: OPTIONS handling with proper CORS and SSE support
@app.before_request
def handle_options_and_security():
    """Handle OPTIONS requests and add security headers"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        origin = request.headers.get('Origin')
        if origin in allowed_origins:
            response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        
        # 🚀 NEW: Special headers for SSE endpoints
        if request.path.startswith('/api/live-events/') or request.path.startswith('/api/member-status/'):
            response.headers.add('Cache-Control', 'no-cache')
            response.headers.add('Connection', 'keep-alive')
        
        return response

# 🚀 ENHANCED: Add security headers to all responses with SSE support
@app.after_request
def after_request(response):
    """Add security headers to all responses"""
    if ENV == "development":
        # Less strict headers for development
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Add cache control for API responses
    if request.path.startswith('/api/'):
        # 🚀 NEW: Special handling for Server-Sent Events endpoints
        if request.path.startswith('/api/live-events/') or request.path.startswith('/api/member-status/'):
            # SSE-specific headers
            response.headers['Cache-Control'] = 'no-cache'
            response.headers['Connection'] = 'keep-alive'
            response.headers['X-Accel-Buffering'] = 'no'  # Disable Nginx buffering for SSE
            response.headers['Access-Control-Allow-Origin'] = '*'  # Allow SSE from any origin in dev
            response.headers['Access-Control-Allow-Headers'] = 'Authorization'
        else:
            # Regular API endpoints
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
    
    return response

# ============================================================================
# Application Context and Cleanup
# ============================================================================
@app.teardown_appcontext
def close_db(error):
    """Clean up database connections"""
    if error:
        logger.error(f"Application context error: {error}")
        db.session.rollback()

# 🚀 NEW: Live voting cleanup on app shutdown
@app.teardown_appcontext  
def cleanup_live_connections(error):
    """Clean up live voting connections on shutdown"""
    try:
        from api.live_events import cleanup_old_events
        cleanup_old_events()
    except Exception as e:
        logger.error(f"Error during live voting cleanup: {e}")

# ============================================================================
# Main Entry Point with Enhanced Configuration
# ============================================================================
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    DEBUG = ENV == "development"
    
    # Validate Steam API key if provided
    steam_api_key = os.getenv('STEAM_API_KEY')
    if steam_api_key:
        print(f"✅ Steam API key configured (ends with: ...{steam_api_key[-4:]})")
    else:
        print("⚠️  No Steam API key found. Steam integration will be limited.")
    
    print(f"🚀 Starting SquadUp server in {ENV} mode on port {PORT}")
    print(f"🔧 Database: {'PostgreSQL' if 'postgresql' in app.config['SQLALCHEMY_DATABASE_URI'] else 'SQLite'}")
    print(f"🛡️  Rate limiting: {'Redis' if 'redis' in redis_url else 'Memory'}")
    print(f"🔴 Live voting: ENABLED with SSE support")
    
    app.run(
        host='0.0.0.0', 
        port=PORT, 
        debug=DEBUG,
        threaded=True  # Enable threading for better performance with SSE
    )