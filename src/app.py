import os
import logging
from datetime import timedelta
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
from api.utils import APIException, utc_now  # 🔧 FIXED: Import utc_now
from api.models import db
from api.routes import api
from api.auth import auth
from api.gaming import gaming, init_rate_limiting as init_gaming_rate_limiting  # 🔧 CRITICAL: Import rate limiting init
from api.admin import setup_admin
from api.commands import setup_commands
from api.steam_auth import steam_auth
from api.steam import steam

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
# Enhanced Rate Limiting Configuration - CRITICAL FIXES
# ============================================================================
# Configure rate limiting - use Redis in production for better performance
redis_url = os.getenv('REDIS_URL', 'memory://')

# 🔧 CRITICAL: More conservative rate limits to prevent server overload
if ENV == "production":
    default_limits = ["2000 per day", "200 per hour", "50 per minute"]
else:
    # Still conservative in development to catch issues early
    default_limits = ["5000 per day", "500 per hour", "100 per minute"]

# 🔧 FIXED: Simplified rate limiting configuration
try:
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=default_limits,
        storage_uri=redis_url,
        # 🔧 FIXED: Use valid strategy name
        strategy="fixed-window",  # Valid strategies: "fixed-window", "moving-window", "sliding-window-counter"
        headers_enabled=True,  # Show rate limit headers to clients
        swallow_errors=True,  # Don't crash on rate limiter errors
    )
    print(f"✅ Rate limiting initialized successfully with strategy: fixed-window")
except Exception as e:
    print(f"⚠️  Rate limiting initialization failed: {e}")
    # Create a minimal limiter without advanced features
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=default_limits,
        storage_uri="memory://",  # Fallback to memory
    )
    print(f"✅ Fallback rate limiting initialized")

# ============================================================================
# CORS Configuration for GitHub Codespaces - ENHANCED & FIXED
# ============================================================================
CODESPACE_NAME = os.getenv('CODESPACE_NAME')
GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = os.getenv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')

# 🔧 CRITICAL: Build Codespace URLs with multiple possible domains
def get_codespace_urls():
    """Generate all possible Codespace URLs"""
    urls = []
    if CODESPACE_NAME:
        # Try multiple domain patterns that GitHub uses
        domains = [
            f"{GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}",
            "app.github.dev",
            "github.dev", 
            "githubpreview.dev"
        ]
        
        for domain in domains:
            if domain:
                # Frontend (port 3000)
                urls.extend([
                    f"https://{CODESPACE_NAME}-3000.{domain}",
                    f"https://{CODESPACE_NAME}-3000.{domain.replace('app.', '')}",
                ])
                # Also add backend URL for testing
                urls.extend([
                    f"https://{CODESPACE_NAME}-3001.{domain}",
                    f"https://{CODESPACE_NAME}-3001.{domain.replace('app.', '')}",
                ])
    
    return list(set(urls))  # Remove duplicates

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
        "https://localhost:3000",
        "http://localhost:3001",  # Backend for testing
        "http://127.0.0.1:3001",
        "https://localhost:3001"
    ]
    
    # Add ALL possible Codespace URLs
    codespace_urls = get_codespace_urls()
    allowed_origins.extend(codespace_urls)
    
    if codespace_urls:
        print(f"🌐 Codespace URLs added: {codespace_urls}")

# Remove duplicates and None values
allowed_origins = list(set([url for url in allowed_origins if url]))

# 🔧 CRITICAL: Enhanced CORS configuration for Codespaces
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
         'X-Requested-With',
         'If-Modified-Since'
     ],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
     max_age=86400,  # Cache preflight requests for 24 hours
     automatic_options=True,  # 🔧 CRITICAL: Let Flask-CORS handle OPTIONS
     send_wildcard=False,  # Don't send * when credentials are True
     vary_header=True  # Add Vary: Origin header
)

print(f"🔧 CORS configured for {len(allowed_origins)} origins:")
for origin in allowed_origins:
    print(f"   - {origin}")

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
    try:
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
    except ImportError:
        print("⚠️  Flask-Talisman not installed. Security headers disabled.")

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
# Enhanced Error Handlers with Rate Limiting
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

# 🔧 CRITICAL: Enhanced rate limit handler with better user experience
@app.errorhandler(429)
def ratelimit_handler(e):
    """Enhanced rate limit handler with helpful messages"""
    retry_after = getattr(e, 'retry_after', 60)
    
    # Determine which rate limit was hit based on retry_after
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
# Blueprint & Route Registration with Rate Limiting - CRITICAL FIXES
# ============================================================================
setup_admin(app)
setup_commands(app)

# 🔧 CRITICAL: Initialize gaming rate limiting BEFORE registering blueprints
try:
    gaming_limiter = init_gaming_rate_limiting(app)
    print("✅ Gaming rate limiting initialized successfully")
except Exception as e:
    print(f"⚠️  Gaming rate limiting initialization failed: {e}")
    # Continue without gaming-specific rate limiting

# Register blueprints - FIXED: No duplicate registrations
app.register_blueprint(api, url_prefix='/api')           # Main API routes
app.register_blueprint(auth, url_prefix='/api/auth')     # Auth routes  
app.register_blueprint(gaming, url_prefix='/api/gaming') # Gaming routes
app.register_blueprint(steam_auth, url_prefix='/api/auth/steam')  # Steam auth (OpenID)
app.register_blueprint(steam, url_prefix='/api/steam')   # Steam API routes (library, sync, etc.)

# ============================================================================
# Enhanced Route Configuration & Health Checks with Rate Limiting
# ============================================================================
@app.route('/health')
@limiter.limit("100 per minute")  # Higher limit for health checks
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    # Check rate limiter status
    try:
        rate_limiter_status = "healthy" if limiter else "disabled"
    except Exception as e:
        logger.error(f"Rate limiter health check failed: {e}")
        rate_limiter_status = "unhealthy"
    
    overall_status = "healthy" if db_status == "healthy" and rate_limiter_status in ["healthy", "disabled"] else "unhealthy"
    
    return jsonify({
        'status': overall_status,
        'timestamp': utc_now().isoformat(),  # 🔧 FIXED: Use utc_now instead of datetime.utcnow()
        'environment': ENV,
        'database': db_status,
        'rate_limiter': rate_limiter_status,
        'storage': redis_url.split('://')[0] if '://' in redis_url else 'memory',
        'version': '1.0.0'  # Add your app version
    }), 200 if overall_status == "healthy" else 503

@app.route('/')
@limiter.limit("50 per minute")  # Limit root requests
def redirect_to_admin():
    return redirect(url_for('admin.index'))

@app.route('/<path:path>', methods=['GET'])
@limiter.limit("200 per minute")  # Rate limit static file serving
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

# 🔧 CRITICAL: Enhanced OPTIONS handling with proper CORS for Codespaces
@app.before_request
def handle_options_and_security():
    """Handle OPTIONS requests and add security headers - FIXED for Codespaces"""
    # 🔧 CRITICAL: Let Flask-CORS handle OPTIONS automatically
    # Only add logging for debugging
    if request.method == 'OPTIONS':
        origin = request.headers.get('Origin', 'Unknown')
        logger.debug(f"🔍 OPTIONS request from origin: {origin}")
        logger.debug(f"🔍 Allowed origins: {allowed_origins}")
        logger.debug(f"🔍 Origin allowed: {origin in allowed_origins}")
        
        # Don't return a response here - let Flask-CORS handle it
        # This was causing the CORS preflight to fail
        pass

# 🔧 CRITICAL: Specific OPTIONS handler for gaming routes
@app.route('/api/gaming/<path:path>', methods=['OPTIONS'])
def handle_gaming_options(path):
    """Handle OPTIONS requests for gaming routes specifically"""
    origin = request.headers.get('Origin', '')
    
    if origin in allowed_origins:
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Max-Age', '86400')
        logger.debug(f"🎮 Gaming OPTIONS handled for origin: {origin}")
        return response
    
    logger.warning(f"🚫 Gaming OPTIONS rejected for origin: {origin}")
    return jsonify({'error': 'CORS not allowed'}), 403

# Also add this additional OPTIONS handler for auth routes if you're having issues there:
@app.route('/api/auth/<path:path>', methods=['OPTIONS'])
def handle_auth_options(path):
    """Handle OPTIONS requests for auth routes specifically"""
    origin = request.headers.get('Origin', '')
    
    if origin in allowed_origins:
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Max-Age', '86400')
        logger.debug(f"🔐 Auth OPTIONS handled for origin: {origin}")
        return response
    
    logger.warning(f"🚫 Auth OPTIONS rejected for origin: {origin}")
    return jsonify({'error': 'CORS not allowed'}), 403

# Add security headers to all responses
@app.after_request
def after_request(response):
    """Add security headers and manual CORS headers for Authorization support - ENHANCED"""
    if ENV == "development":
        # Less strict headers for development
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Add cache control for API responses
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    
    # 🔧 CRITICAL: Manual CORS headers for Authorization header support
    origin = request.headers.get('Origin')
    if origin and origin in allowed_origins:
        # Force proper CORS headers for Authorization
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        # 🔧 CRITICAL: Ensure Authorization header is explicitly allowed
        if request.method == 'OPTIONS':
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
            response.headers['Access-Control-Max-Age'] = '86400'
        
        # Debug logging for CORS
        if not response.headers.get('Access-Control-Allow-Origin'):
            response.headers['Access-Control-Allow-Origin'] = origin
            logger.debug(f"🔧 Manually added CORS origin: {origin}")
        
        if not response.headers.get('Access-Control-Allow-Credentials'):
            response.headers['Access-Control-Allow-Credentials'] = 'true'
    
    # 🔧 CRITICAL: Add rate limit headers for better client handling
    if hasattr(response, 'headers') and request.endpoint:
        try:
            # Add rate limit info to headers (if rate limiter provides it)
            rate_limit_info = getattr(request, '_rate_limit_info', None)
            if rate_limit_info:
                response.headers['X-RateLimit-Limit'] = rate_limit_info.get('limit', '')
                response.headers['X-RateLimit-Remaining'] = rate_limit_info.get('remaining', '')
                response.headers['X-RateLimit-Reset'] = rate_limit_info.get('reset', '')
        except Exception:
            # Don't fail requests if rate limit headers can't be added
            pass
    
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

# ============================================================================
# Enhanced Application Status Monitoring & CORS Debug
# ============================================================================
@app.route('/api/status')
@limiter.limit("60 per minute")
def api_status():
    """Detailed API status for frontend monitoring"""
    try:
        # Test database
        db.session.execute('SELECT 1')
        db_latency = "< 50ms"  # You could measure actual latency
        
        # Rate limiter status
        rate_limiter_storage = redis_url.split('://')[0] if '://' in redis_url else 'memory'
        
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
                'steam_api': {
                    'status': 'operational' if os.getenv('STEAM_API_KEY') else 'limited',
                    'message': 'Available' if os.getenv('STEAM_API_KEY') else 'API key not configured'
                }
            },
            'features': {
                'gaming_groups': True,
                'live_voting': True,
                'steam_integration': bool(os.getenv('STEAM_API_KEY')),
                'real_time_updates': True
            }
        })
    except Exception as e:
        logger.error(f"API status check failed: {e}")
        return jsonify({
            'api_status': 'degraded',
            'timestamp': utc_now().isoformat(),
            'error': 'Service temporarily unavailable'
        }), 503

# 🔧 CRITICAL: CORS Debug endpoint for troubleshooting
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
        'detected_codespace_urls': get_codespace_urls() if CODESPACE_NAME else None
    }
    
    logger.info(f"🔍 CORS Debug - Origin: {origin}, Allowed: {origin in allowed_origins}")
    
    return jsonify(debug_info)

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
    
    # 🔧 CRITICAL: Display rate limiting configuration
    print(f"🛡️  Rate limiting configured:")
    print(f"   - Storage: {redis_url.split('://')[0] if '://' in redis_url else 'memory'}")
    print(f"   - Default limits: {default_limits}")
    print(f"   - Gaming SSE limits: 5 per minute")
    print(f"   - Voter status limits: 30 per minute")
    
    print(f"🚀 Starting SquadUp server in {ENV} mode on port {PORT}")
    print(f"🔧 Database: {'PostgreSQL' if 'postgresql' in app.config['SQLALCHEMY_DATABASE_URI'] else 'SQLite'}")
    
    try:
        app.run(
            host='0.0.0.0', 
            port=PORT, 
            debug=DEBUG,
            threaded=True  # Enable threading for better performance
        )
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise