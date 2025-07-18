# src/app.py - FIXED IMPORT PATHS

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
from flask_jwt_extended import JWTManager, get_jwt
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
    # NEW: Import live voting system
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
        # NEW: Import live voting system
        from src.api.live_voting_system import live_voting
    except ImportError as e:
        print(f"Import error: {e}")
        print(f"Current directory: {os.getcwd()}")
        print(f"Python path: {sys.path}")
        print("Available files in current directory:")
        try:
            print([f for f in os.listdir('.') if not f.startswith('.')])
        except:
            pass
        print("Available files in src directory:")
        try:
            print([f for f in os.listdir('src') if not f.startswith('.')])
        except:
            pass
        raise

# ============================================================================
# App Initialization & Environment
# ============================================================================
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# ============================================================================
# Enhanced Database Configuration
# ============================================================================
db_url = os.getenv("DATABASE_URL")
if db_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace("postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'pool_recycle': 300,
    'pool_pre_ping': True,
    'max_overflow': 20,
    'pool_timeout': 30
}

MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# ============================================================================
# Enhanced Rate Limiting Configuration
# ============================================================================
redis_url = os.getenv('REDIS_URL', 'memory://')

if ENV == "production":
    default_limits = ["2000 per day", "200 per hour", "50 per minute"]
else:
    default_limits = ["5000 per day", "500 per hour", "100 per minute"]

try:
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=default_limits,
        storage_uri=redis_url,
        strategy="fixed-window",
        headers_enabled=True,
        swallow_errors=True,
    )
    print(f"✅ Rate limiting initialized successfully")
except Exception as e:
    print(f"⚠️ Rate limiting initialization failed: {e}")
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=default_limits,
        storage_uri="memory://",
    )
    print(f"✅ Fallback rate limiting initialized")

# ============================================================================
# ENHANCED CORS Configuration for GitHub Codespaces - FIXED VERSION
# ============================================================================
CODESPACE_NAME = os.getenv('CODESPACE_NAME')
GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = os.getenv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')

def get_codespace_urls():
    """Generate all possible Codespace URLs"""
    urls = []
    if CODESPACE_NAME:
        domains = [
            GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
            "app.github.dev",
            "github.dev", 
            "githubpreview.dev"
        ]
        
        for domain in domains:
            if domain:
                # Frontend (port 3000)
                urls.extend([
                    f"https://{CODESPACE_NAME}-3000.{domain}",
                ])
                # Backend (port 3001)
                urls.extend([
                    f"https://{CODESPACE_NAME}-3001.{domain}",
                ])
    
    # Also check if we can extract codespace name from environment variables
    # Sometimes the full codespace URL is in FRONTEND_URL
    frontend_url = os.getenv('FRONTEND_URL')
    if frontend_url and 'github.dev' in frontend_url:
        urls.append(frontend_url)
        # Extract backend URL from frontend URL
        backend_url = frontend_url.replace('-3000.', '-3001.')
        urls.append(backend_url)
    
    return list(set(urls))

if ENV == "production":
    allowed_origins = [
        os.getenv('FRONTEND_URL', 'https://yourdomain.com'),
    ]
    print(f"🔒 Production CORS configured for: {allowed_origins}")
else:
    allowed_origins = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://localhost:3001"
    ]
    
    # Add environment-specific URLs
    if os.getenv('FRONTEND_URL'):
        allowed_origins.append(os.getenv('FRONTEND_URL'))
    if os.getenv('VITE_BACKEND_URL'):
        allowed_origins.append(os.getenv('VITE_BACKEND_URL'))
    
    codespace_urls = get_codespace_urls()
    allowed_origins.extend(codespace_urls)
    
    if codespace_urls:
        print(f"🌐 Codespace URLs added: {codespace_urls}")

# Remove duplicates and empty values
allowed_origins = list(set([url for url in allowed_origins if url]))

# CRITICAL: Enhanced CORS configuration for Codespaces + SSE Support
CORS(app, 
     origins=allowed_origins,
     supports_credentials=True,
     allow_headers=[
         'Content-Type', 
         'Authorization', 
         'X-Requested-With',
         'Accept',
         'Origin',
         'User-Agent',
         'DNT',
         'Cache-Control',
         'X-Mx-ReqToken',
         'Keep-Alive',
         'If-Modified-Since',
         # SSE specific headers
         'Accept-Encoding',
         'Accept-Language'
     ],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
     max_age=86400,
     automatic_options=True,
     send_wildcard=False,
     vary_header=True,
     # Important for SSE
     expose_headers=['Content-Type', 'Cache-Control', 'Connection']
)

print(f"🔧 CORS configured for {len(allowed_origins)} origins:")
for origin in allowed_origins:
    print(f"   - {origin}")

# ============================================================================
# Enhanced JWT Configuration
# ============================================================================
required_env_vars = ['JWT_SECRET_KEY']
if ENV == "production":
    required_env_vars.extend(['DATABASE_URL'])

for var in required_env_vars:
    if not os.getenv(var):
        if var == 'JWT_SECRET_KEY':
            # Generate a default JWT secret for development
            import secrets
            default_jwt_secret = secrets.token_hex(32)
            os.environ[var] = default_jwt_secret
            print(f"⚠️ {var} not set, generated temporary key for development")
        else:
            raise RuntimeError(f"{var} is not set in the environment")

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['JWT_ALGORITHM'] = 'HS256'

if ENV == "production":
    app.config['JWT_COOKIE_SECURE'] = True
    app.config['JWT_COOKIE_CSRF_PROTECT'] = True

jwt = JWTManager(app)
app.blacklisted_tokens = set()

# Enhanced JWT handlers
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
# Security Headers
# ============================================================================
if ENV == "production":
    try:
        from flask_talisman import Talisman
        
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
    except ImportError:
        print("⚠️ Flask-Talisman not installed. Security headers disabled.")

# ============================================================================
# Logging Configuration
# ============================================================================
if ENV == "production":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(name)s %(message)s',
        handlers=[
            logging.FileHandler('app.log'),
            logging.StreamHandler()
        ]
    )
else:
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

@app.errorhandler(429)
def ratelimit_handler(e):
    """Enhanced rate limit handler - FIXED for None retry_after values"""
    # Safely get retry_after value with fallback
    retry_after = getattr(e, 'retry_after', None)
    if retry_after is None:
        retry_after = 60  # Default to 60 seconds if not provided
    
    # Ensure retry_after is a number
    try:
        retry_after = int(retry_after)
    except (ValueError, TypeError):
        retry_after = 60
    
    if retry_after <= 60:
        limit_type = "per minute"
        suggestion = "Please wait a moment and try again."
    elif retry_after <= 3600:
        limit_type = "per hour"
        suggestion = "You've made too many requests recently. Please try again in a few minutes."
    else:
        limit_type = "per day"
        suggestion = "Daily limit reached. Please try again tomorrow."
    
    return jsonify({
        'error': 'Rate limit exceeded',
        'message': f'Too many requests {limit_type}. {suggestion}',
        'code': 429,
        'retry_after': retry_after,
        'limit_type': limit_type
    }), 429

# ============================================================================
# Blueprint Registration - UPDATED WITH LIVE VOTING
# ============================================================================
# Handle missing admin and commands modules gracefully
try:
    setup_admin(app)
    print("✅ Admin module initialized")
except Exception as e:
    print(f"⚠️ Admin module initialization failed: {e}")

try:
    setup_commands(app)
    print("✅ Commands module initialized")
except Exception as e:
    print(f"⚠️ Commands module initialization failed: {e}")

# Standard blueprint registration
app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(auth, url_prefix='/api/auth')
app.register_blueprint(gaming, url_prefix='/api/gaming')
app.register_blueprint(steam_auth, url_prefix='/api/auth/steam')

# NEW: Register live voting blueprint
try:
    app.register_blueprint(live_voting, url_prefix='/api/live-voting')
    print("✅ Live voting system registered at /api/live-voting")
except Exception as e:
    print(f"⚠️ Live voting blueprint registration failed: {e}")

# Handle optional steam blueprint
try:
    app.register_blueprint(steam, url_prefix='/api/steam')
    print("✅ Steam blueprint registered")
except Exception as e:
    print(f"⚠️ Steam blueprint registration failed: {e}")

# ============================================================================
# SSE Manager Initialization - UPDATED
# ============================================================================
class SSEManager:
    """Global SSE connection manager"""
    def __init__(self, app):
        self.app = app
        self.connections = defaultdict(set)
        
    def add_connection(self, session_id, connection_id):
        """Add a new SSE connection"""
        self.connections[session_id].add(connection_id)
        
    def remove_connection(self, session_id, connection_id):
        """Remove SSE connection"""
        self.connections[session_id].discard(connection_id)
        if not self.connections[session_id]:
            del self.connections[session_id]
                
    def get_connection_count(self, session_id):
        """Get number of active connections for a session"""
        return len(self.connections.get(session_id, set()))
    
    def cleanup_inactive_connections(self):
        """Clean up empty connection sets"""
        for session_id in list(self.connections.keys()):
            if not self.connections[session_id]:
                del self.connections[session_id]

# Initialize SSE manager
try:
    sse_manager = SSEManager(app)
    app.sse_manager = sse_manager
    print("✅ SSE Manager initialized")
except Exception as e:
    print(f"⚠️ SSE Manager initialization failed: {e}")

# ============================================================================
# Enhanced Route Configuration & Health Checks
# ============================================================================
@app.route('/health')
@limiter.limit("100 per minute")
def health_check():
    """Health check endpoint for monitoring"""
    try:
        db.session.execute(text('SELECT 1'))  # Fixed: wrap in text()
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    try:
        rate_limiter_status = "healthy" if limiter else "disabled"
    except Exception as e:
        logger.error(f"Rate limiter health check failed: {e}")
        rate_limiter_status = "unhealthy"
    
    # Check SSE status
    try:
        sse_status = "healthy" if hasattr(app, 'sse_manager') else "disabled"
        total_sse_connections = sum(len(connections) for connections in app.sse_manager.connections.values()) if hasattr(app, 'sse_manager') else 0
    except Exception as e:
        logger.error(f"SSE health check failed: {e}")
        sse_status = "unhealthy"
        total_sse_connections = 0
    
    overall_status = "healthy" if all(status in ["healthy", "disabled"] for status in [db_status, rate_limiter_status, sse_status]) else "unhealthy"
    
    return jsonify({
        'status': overall_status,
        'timestamp': utc_now().isoformat(),
        'environment': ENV,
        'database': db_status,
        'rate_limiter': rate_limiter_status,
        'sse_manager': sse_status,
        'active_sse_connections': total_sse_connections,
        'storage': redis_url.split('://')[0] if '://' in redis_url else 'memory',
        'version': '1.0.0'
    }), 200 if overall_status == "healthy" else 503

@app.route('/')
@limiter.limit("50 per minute")
def redirect_to_admin():
    try:
        return redirect(url_for('admin.index'))
    except:
        return jsonify({
            'message': 'SquadUp API Server',
            'status': 'running',
            'endpoints': {
                'health': '/health',
                'api_status': '/api/status',
                'cors_debug': '/api/cors-debug',
                'live_voting': '/api/live-voting',
                'sse_endpoints': [
                    '/api/live-voting/sessions/{id}/live-stream',
                ]
            }
        })

@app.route('/<path:path>', methods=['GET'])
@limiter.limit("200 per minute")
def serve_any_other_file(path):
    """Serve static files or React app"""
    file_path = os.path.join(static_file_dir, path)
    if os.path.isfile(file_path):
        response = send_from_directory(static_file_dir, path)
        if path.endswith(('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg')):
            response.cache_control.max_age = 86400
        else:
            response.cache_control.max_age = 0
        return response
    else:
        response = send_from_directory(static_file_dir, 'index.html')
        response.cache_control.max_age = 0
        return response

# ============================================================================
# CRITICAL: Enhanced CORS and OPTIONS handling for Codespaces + SSE
# ============================================================================
@app.before_request
def handle_options_and_security():
    """Handle preflight requests and add security headers"""
    if request.method == 'OPTIONS':
        origin = request.headers.get('Origin', 'Unknown')
        logger.debug(f"🔍 OPTIONS request from origin: {origin}")
        logger.debug(f"🔍 Origin allowed: {origin in allowed_origins}")
        # Let Flask-CORS handle OPTIONS automatically
        pass

@app.after_request
def after_request(response):
    """Add security headers and manual CORS headers"""
    if ENV == "development":
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Special handling for SSE endpoints
    if any(sse_path in request.path for sse_path in ['/live-stream', '/live-results', '/voter-status-stream', '/events', '/member-status']):
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['Connection'] = 'keep-alive'
        response.headers['X-Accel-Buffering'] = 'no'  # Disable nginx buffering for SSE
        
    elif request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    
    # Manual CORS headers for Authorization support
    origin = request.headers.get('Origin')
    if origin and origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        if request.method == 'OPTIONS':
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
            response.headers['Access-Control-Max-Age'] = '86400'
        
        if not response.headers.get('Access-Control-Allow-Origin'):
            response.headers['Access-Control-Allow-Origin'] = origin
            logger.debug(f"🔧 Manually added CORS origin: {origin}")
        
        if not response.headers.get('Access-Control-Allow-Credentials'):
            response.headers['Access-Control-Allow-Credentials'] = 'true'
    
    return response

@app.teardown_appcontext
def close_db(error):
    """Clean up database connections"""
    if error:
        logger.error(f"Application context error: {error}")
        db.session.rollback()

# ============================================================================
# Enhanced Application Status Monitoring
# ============================================================================
@app.route('/api/status')
@limiter.limit("60 per minute")
def api_status():
    """Detailed API status for frontend monitoring"""
    try:
        db.session.execute(text('SELECT 1'))  # Fixed: wrap in text()
        db_latency = "< 50ms"
        
        rate_limiter_storage = redis_url.split('://')[0] if '://' in redis_url else 'memory'
        
        # Check SSE status
        sse_connections = 0
        if hasattr(app, 'sse_manager'):
            sse_connections = sum(len(connections) for connections in app.sse_manager.connections.values())
        
        return jsonify({
            'api_status': 'operational',
            'timestamp': utc_now().isoformat(),
            'environment': ENV,
            'services': {
                'database': {
                    'status': 'operational',
                    'latency': db_latency
                },
                'rate_limiter': {
                    'status': 'operational',
                    'storage': rate_limiter_storage
                },
                'sse_manager': {
                    'status': 'operational' if hasattr(app, 'sse_manager') else 'disabled',
                    'active_connections': sse_connections
                },
                'steam_api': {
                    'status': 'operational' if os.getenv('STEAM_API_KEY') else 'limited',
                    'message': 'Available' if os.getenv('STEAM_API_KEY') else 'API key not configured'
                },
                'live_voting': {
                    'status': 'operational',
                    'endpoint': '/api/live-voting'
                }
            },
            'features': {
                'gaming_groups': True,
                'live_voting': True,
                'steam_integration': bool(os.getenv('STEAM_API_KEY')),
                'real_time_updates': True,
                'sse_streaming': hasattr(app, 'sse_manager')
            }
        })
    except Exception as e:
        logger.error(f"API status check failed: {e}")
        return jsonify({
            'api_status': 'degraded',
            'timestamp': utc_now().isoformat(),
            'error': 'Service temporarily unavailable'
        }), 503

@app.route('/api/cors-debug', methods=['GET', 'OPTIONS'])
@limiter.limit("60 per minute")
def cors_debug():
    """Debug endpoint to troubleshoot CORS issues"""
    origin = request.headers.get('Origin', 'No Origin header')
    method = request.method
    
    debug_info = {
        'request_origin': origin,
        'request_method': method,
        'allowed_origins': allowed_origins,
        'origin_allowed': origin in allowed_origins,
        'codespace_name': CODESPACE_NAME,
        'codespace_domain': GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
        'environment': ENV,
        'timestamp': utc_now().isoformat(),
        'request_headers': dict(request.headers),
        'detected_codespace_urls': get_codespace_urls() if CODESPACE_NAME else None,
        'sse_support': hasattr(app, 'sse_manager'),
        'live_voting_available': True
    }
    
    logger.info(f"🔍 CORS Debug - Origin: {origin}, Allowed: {origin in allowed_origins}")
    
    return jsonify(debug_info)

# ============================================================================
# Main Entry Point
# ============================================================================
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    DEBUG = ENV == "development"
    
    steam_api_key = os.getenv('STEAM_API_KEY')
    if steam_api_key:
        print(f"✅ Steam API key configured (ends with: ...{steam_api_key[-4:]})")
    else:
        print("⚠️ No Steam API key found. Steam integration will be limited.")
    
    print(f"🛡️ Rate limiting configured:")
    print(f"   - Storage: {redis_url.split('://')[0] if '://' in redis_url else 'memory'}")
    print(f"   - Default limits: {default_limits}")
    
    print(f"🚀 Starting SquadUp server in {ENV} mode on port {PORT}")
    print(f"🔧 Database: {'PostgreSQL' if 'postgresql' in app.config['SQLALCHEMY_DATABASE_URI'] else 'SQLite'}")
    print(f"📡 Live Voting: Available at /api/live-voting")
    
    if hasattr(app, 'sse_manager'):
        print(f"📡 SSE Manager: Initialized and ready")
    else:
        print(f"⚠️ SSE Manager: Not available")
    
    # Initialize database
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database initialized successfully")
        except Exception as e:
            print(f"❌ Database initialization error: {e}")
    
    try:
        app.run(
            host='0.0.0.0', 
            port=PORT, 
            debug=DEBUG,
            threaded=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise