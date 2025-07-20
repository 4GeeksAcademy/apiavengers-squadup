# src/app.py - ENHANCED JWT CONFIGURATION WITH PERFORMANCE MONITORING + FLASK DASHBOARD + DATABASE DEBUG

import os
import sys
import logging
import atexit
import time
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

# 📊 NEW: Flask Monitoring Dashboard
import flask_monitoringdashboard as dashboard
from flask_monitoringdashboard import config

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
    # UPDATED: Import live voting system with performance monitoring
    from api.live_voting_system import live_voting
    # ADD: Performance monitoring imports
    from api.health_routes import health_bp
    from api.performance_monitor import monitor, track_performance
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
        # UPDATED: Import live voting system with performance monitoring
        from src.api.live_voting_system import live_voting
        # ADD: Performance monitoring imports
        from src.api.health_routes import health_bp
        from src.api.performance_monitor import monitor, track_performance
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
# 📊 FLASK MONITORING DASHBOARD CONFIGURATION
# ============================================================================

def setup_flask_monitoring_dashboard(app):
    """Configure and setup Flask Monitoring Dashboard with security"""
    
    # Configure dashboard security
    config.username = os.getenv('MONITOR_USERNAME', 'admin')
    config.password = os.getenv('MONITOR_PASSWORD', 'squadup_admin_2025')
    config.security_token = os.getenv('MONITOR_SECURITY_TOKEN', 'squadup_monitoring_secret_token')
    
    # Dashboard configuration
    config.monitor_level = 3  # Detailed monitoring
    config.outlier_detection_constant = 2.5
    config.sampling_period = 20  # Sample every 20 requests
    config.enable_logging = True
    
    # Database for dashboard (separate from main app)
    dashboard_db_path = os.getenv('MONITOR_DB_PATH', 'monitoring_dashboard.db')
    config.database_name = f"sqlite:///{dashboard_db_path}"
    
    # Performance settings
    config.group_by = 'endpoint'  # Group metrics by endpoint
    config.store_cpu_and_memory = True  # Store system metrics
    
    # Custom dashboard settings
    config.custom_link = 'SquadUp Performance'
    config.description = 'SquadUp Gaming App Performance Monitoring'
    
    # Bind dashboard to app
    dashboard.bind(app)
    
    print("📊 Flask Monitoring Dashboard configured!")
    print(f"   URL: http://localhost:3001/dashboard")
    print(f"   Username: {config.username}")
    print(f"   Password: {config.password}")
    print("   Security: Login required")


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


# ============================================================================
# ENHANCED DATABASE CONFIGURATION WITH ANTI-CACHING
# ============================================================================
db_url = os.getenv("DATABASE_URL")
if db_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace("postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///squadup.db"

# 🔧 CRITICAL: Anti-caching database configuration
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configure engine options based on database type
db_url = os.getenv("DATABASE_URL", "sqlite:///squadup.db")
is_sqlite = 'sqlite' in db_url.lower()

if is_sqlite:
    # SQLite-specific configuration
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_recycle': 280,
        'pool_pre_ping': True,
        'echo': False,  # Set to True for SQL debugging
        'connect_args': {
            'check_same_thread': False,
            'isolation_level': None  # Use SQLite default (autocommit mode)
        }
    }
else:
    # PostgreSQL/other database configuration
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_recycle': 280,
        'pool_pre_ping': True,
        'echo': False,
        'isolation_level': 'READ COMMITTED',
        'pool_size': 10,
        'max_overflow': 20,
        'pool_timeout': 30
    }

MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)


# ============================================================================
# Rate Limiting Configuration
# ============================================================================
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
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
# 🔥 PERFORMANCE MONITORING SETUP - ENHANCED INTEGRATION
# ============================================================================

def setup_performance_monitoring(app):
    """Setup comprehensive performance monitoring for the Flask app"""
    
    # Register health check routes
    app.register_blueprint(health_bp, url_prefix='/api')
    
    # Add performance middleware with enhanced tracking
    @app.before_request
    def before_request():
        request.start_time = time.time()
        
        # Track specific request patterns (if method exists)
        endpoint = request.endpoint
        if endpoint and hasattr(monitor, 'track_endpoint_access'):
            monitor.track_endpoint_access(endpoint)
    
    @app.after_request  
    def after_request(response):
        if hasattr(request, 'start_time'):
            request_time = (time.time() - request.start_time) * 1000
            monitor.track_request(request_time)
            
            # Add performance headers for debugging
            response.headers['X-Response-Time'] = f"{request_time:.2f}ms"
            
            # Get current health status safely
            try:
                current_metrics = monitor.get_current_metrics()
                response.headers['X-Server-Health'] = current_metrics['health_status']['status']
            except Exception as e:
                response.headers['X-Server-Health'] = 'unknown'
                print(f"Warning: Could not get health status: {e}")
            
            # Log slow requests with detailed information
            if request_time > 1000:  # Requests over 1 second
                print(f"🐌 Slow request: {request.endpoint or 'unknown'} ({request.method}) took {request_time:.2f}ms")
                # Only call if method exists
                if hasattr(monitor, 'track_slow_request'):
                    monitor.track_slow_request(request.endpoint or 'unknown', request_time)
        
        return response
    
    # Enhanced global error handler with monitoring
    @app.errorhandler(Exception)
    def handle_error(e):
        error_type = e.__class__.__name__
        monitor.track_error(f"flask_error_{error_type}")
        
        # Log error with context
        endpoint = getattr(request, 'endpoint', 'unknown')
        print(f"❌ Flask error in {endpoint}: {error_type} - {str(e)}")
        
        # Return appropriate error response based on environment
        if app.debug:
            return jsonify({
                "error": str(e), 
                "type": error_type,
                "endpoint": endpoint,
                "timestamp": time.time()
            }), 500
        else:
            return jsonify({
                "error": "Internal server error",
                "timestamp": time.time()
            }), 500
    
    # Add specific error handlers for common errors
    @app.errorhandler(404)
    def handle_404(e):
        monitor.track_error('http_404')
        return jsonify({
            "error": "Resource not found",
            "path": request.path,
            "timestamp": time.time()
        }), 404
    
    @app.errorhandler(429)  # Rate limit exceeded
    def handle_rate_limit(e):
        monitor.track_error('rate_limit_exceeded')
        return jsonify({
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please try again later.",
            "timestamp": time.time()
        }), 429
    
    # Graceful shutdown with monitoring cleanup
    def shutdown_monitor():
        print("🔥 Shutting down performance monitor...")
        try:
            # Save final metrics before shutdown
            final_metrics = monitor.get_current_metrics()
            print(f"📊 Final system state: {final_metrics['health_status']['status']}")
            monitor.shutdown()
        except Exception as e:
            print(f"Warning during monitor shutdown: {e}")
    
    atexit.register(shutdown_monitor)
    
    print("🔥 Performance monitoring enabled!")
    print("📊 Health endpoints available:")
    print("   GET /api/health - Basic health check")
    print("   GET /api/metrics - Public metrics")
    print("   GET /api/health/detailed - Detailed metrics (admin)")
    print("   GET /api/health/connections - Connection status (admin)")


# ============================================================================
# Error Handlers
# ============================================================================
@app.errorhandler(APIException)
def handle_api_exception(error):
    monitor.track_error(f"api_exception_{error.__class__.__name__}")
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response


# ============================================================================
# 🔧 DATABASE DEBUG ROUTES - NEW ADDITION
# ============================================================================

@app.route('/debug/database-info')
def debug_database_info():
    """Debug endpoint to check database configuration"""
    try:
        from api.models import User
        
        # Get current database URL
        db_url = app.config.get('SQLALCHEMY_DATABASE_URI', 'Not set')
        
        # Execute raw SQL to count users
        result = db.session.execute(text('SELECT COUNT(*) FROM user'))
        raw_count = result.scalar()
        
        # Use SQLAlchemy ORM
        orm_count = User.query.count()
        
        # List all users with raw SQL
        users_raw = db.session.execute(text('SELECT id, username, email FROM user ORDER BY id')).fetchall()
        
        # List all users with ORM
        users_orm = User.query.order_by(User.id).all()
        
        return jsonify({
            'database_url': db_url[:50] + "..." if len(db_url) > 50 else db_url,
            'counts': {
                'raw_sql': raw_count,
                'sqlalchemy_orm': orm_count
            },
            'users_raw': [{'id': row[0], 'username': row[1], 'email': row[2]} for row in users_raw],
            'users_orm': [{'id': u.id, 'username': u.username, 'email': u.email} for u in users_orm],
            'session_info': {
                'session_id': id(db.session),
                'bind': str(db.session.bind),
                'autocommit': db.session.autocommit,
                'autoflush': db.session.autoflush
            }
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'database_url': app.config.get('SQLALCHEMY_DATABASE_URI', 'Not set')[:50]
        })

@app.route('/debug/force-refresh')
def force_refresh_database():
    """Force refresh all database sessions"""
    try:
        # Close all existing sessions
        db.session.close()
        
        # Remove all expired instances
        db.session.expunge_all()
        
        # Force new session
        db.session.commit()
        
        # Count users again
        from api.models import User
        count = User.query.count()
        
        return jsonify({
            'message': 'Database session refreshed',
            'user_count': count,
            'timestamp': time.time()
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'timestamp': time.time()
        })

@app.route('/debug/user-tokens/<int:user_id>')
def get_user_tokens(user_id):
    """Get JWT tokens for a specific user"""
    try:
        from api.models import User
        from flask_jwt_extended import create_access_token, create_refresh_token
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin,
            'tokens': {
                'access_token': access_token,
                'refresh_token': refresh_token
            },
            'test_urls': {
                'test_jwt': f'/api/auth/test-jwt',
                'curl_example': f'curl -H "Authorization: Bearer {access_token}" {request.host_url}api/auth/test-jwt'
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/debug/all-user-tokens')
def get_all_user_tokens():
    """Get JWT tokens for all users"""
    try:
        from api.models import User
        from flask_jwt_extended import create_access_token, create_refresh_token
        
        users = User.query.all()
        user_tokens = []
        
        for user in users:
            access_token = create_access_token(identity=user.id)
            refresh_token = create_refresh_token(identity=user.id)
            
            user_tokens.append({
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin,
                'access_token': access_token,
                'refresh_token': refresh_token
            })
        
        return jsonify({
            'total_users': len(users),
            'users': user_tokens
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/debug/create-test-user')
def create_test_user():
    """Create a test user to verify database writing"""
    try:
        from api.models import User
        import time as time_module
        timestamp = int(time_module.time())
        
        test_user = User(
            username=f'test_user_{timestamp}',
            email=f'test_{timestamp}@example.com',
            password_hash='dummy_hash'
        )
        
        db.session.add(test_user)
        db.session.commit()
        
        # Force refresh to see if it persists
        db.session.expunge_all()
        
        # Verify creation
        count = User.query.count()
        
        return jsonify({
            'message': 'Test user created',
            'user_id': test_user.id,
            'username': test_user.username,
            'total_users': count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': str(e)
        })

@app.route('/debug/flask-admin-refresh')
def flask_admin_refresh():
    """Force Flask-Admin to refresh its cache"""
    try:
        # Force all sessions to expire
        db.session.close_all()
        db.session.expunge_all()
        
        # Get fresh count
        from api.models import User
        fresh_count = User.query.count()
        
        return jsonify({
            'message': 'Flask-Admin cache cleared',
            'fresh_user_count': fresh_count,
            'instruction': 'Now refresh your Flask-Admin page',
            'admin_url': '/admin/user/'
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e)
        })


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

# Default route to redirect to Flask-Admin
@app.route("/")
def home_redirect():
    """Redirect to Flask-Admin interface"""
    return redirect("/admin/")


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
# 🔥 ENHANCED ROUTE CONFIGURATION & HEALTH CHECKS WITH MONITORING
# ============================================================================

@app.route('/health')
@track_performance('health_check')
def health_check():
    """Enhanced health check with performance monitoring"""
    try:
        # Test database connection
        with app.app_context():
            db.session.execute(text('SELECT 1'))
        
        # Get monitoring metrics
        current_metrics = monitor.get_current_metrics()
        
        return jsonify({
            'status': 'healthy', 
            'timestamp': utc_now().isoformat(),
            'jwt_configured': bool(app.config.get('JWT_SECRET_KEY')),
            'environment': ENV,
            'performance': {
                'health_status': current_metrics['health_status']['status'],
                'memory_usage_mb': current_metrics['system']['memory_usage_mb'],
                'uptime_seconds': current_metrics['system']['uptime_seconds'],
                'active_connections': current_metrics['sse']['active_connections']
            },
            'services': {
                'database': 'connected',
                'monitoring': 'active',
                'rate_limiting': 'active',
                'flask_dashboard': 'active'
            }
        }), 200
        
    except Exception as e:
        monitor.track_error('health_check_error')
        return jsonify({
            'status': 'unhealthy',
            'timestamp': utc_now().isoformat(),
            'error': str(e),
            'environment': ENV
        }), 503

@app.route('/api/auth/test-jwt')
@jwt_required()
@track_performance('jwt_test')
def test_jwt():
    """Test endpoint to verify JWT is working with performance tracking"""
    try:
        current_user_id = get_jwt_identity()
        jwt_data = get_jwt()
        
        return jsonify({
            'message': 'JWT is working correctly!',
            'user_id': current_user_id,
            'jwt_claims': {k: v for k, v in jwt_data.items() if k not in ['exp', 'iat', 'nbf']},
            'timestamp': utc_now().isoformat(),
            'performance_tracking': 'active'
        }), 200
        
    except Exception as e:
        monitor.track_error('jwt_test_error')
        return jsonify({
            'error': 'JWT test failed',
            'details': str(e),
            'timestamp': utc_now().isoformat()
        }), 500

@app.route('/api/admin/performance-dashboard')
@jwt_required()
@track_performance('admin_dashboard')
def performance_dashboard():
    """Enhanced admin performance dashboard with comprehensive metrics"""
    try:
        current_user_id = get_jwt_identity()
        
        # Load user to check admin status
        from api.models import User
        user = User.query.get(current_user_id)
        
        if not user or not getattr(user, 'is_admin', False):
            monitor.track_error('admin_access_denied')
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get comprehensive performance data
        metrics = monitor.get_current_metrics()
        
        # Get additional system information
        dashboard_data = {
            'summary': {
                'status': metrics['health_status']['status'],
                'uptime': metrics['system']['uptime_seconds'],
                'total_connections': metrics['sse']['active_connections'],
                'active_sessions': metrics['sse']['active_sessions'],
                'memory_usage': metrics['system']['memory_usage_mb'],
                'jwt_tokens_active': len(blacklisted_tokens),  # Approximate
                'environment': ENV
            },
            'performance': {
                **metrics['performance'],
                'slow_requests': metrics.get('slow_requests', []),
                'error_rate': metrics.get('error_rate', 0),
                'database_performance': metrics.get('database', {}),
                'sse_performance': metrics.get('sse_performance', {})
            },
            'health': metrics['health_status'],
            'system': metrics['system'],
            'connections': metrics.get('connections', {}),
            'errors': metrics.get('recent_errors', []),
            'timestamp': metrics['timestamp'],
            'dashboards': {
                'flask_dashboard': '/dashboard',
                'react_dashboard': 'Performance Monitor Component',
                'api_metrics': '/api/admin/performance-dashboard'
            }
        }
        
        return jsonify({
            'status': 'success',
            'data': dashboard_data,
            'generated_at': utc_now().isoformat()
        }), 200
        
    except Exception as e:
        monitor.track_error('dashboard_error')
        return jsonify({
            'error': 'Dashboard generation failed',
            'details': str(e),
            'timestamp': utc_now().isoformat()
        }), 500

@app.route('/api/admin/view-users')
def view_all_users():
    """View all users - for testing"""
    try:
        from api.models import User
        users = User.query.all()
        
        user_list = []
        for user in users:
            user_list.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin,
                'steam_connected': user.steam_connected,
                'total_games': user.total_games,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })
        
        return jsonify({
            'total_users': len(users),
            'users': user_list
        })
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/react')
@app.route('/react/<path:path>')
def serve_react(path=''):
    """Serve React frontend at /react/ instead of root"""
    try:
        if path != "" and os.path.exists(os.path.join(static_file_dir, path)):
            return send_from_directory(static_file_dir, path)
        else:
            return send_from_directory(static_file_dir, 'index.html')
    except Exception as e:
        return jsonify({'error': 'File not found'}), 404


# ============================================================================
# 🔥 ENHANCED MAIN ENTRY POINT WITH COMPREHENSIVE MONITORING
# ============================================================================

def create_app():
    """Enhanced app factory with performance monitoring integration"""
    # Setup performance monitoring
    setup_performance_monitoring(app)
    
    # Setup Flask Monitoring Dashboard
    setup_flask_monitoring_dashboard(app)
    
    return app

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    
    # Create app with monitoring
    app = create_app()
    
    with app.app_context():
        try:
            # Database setup with monitoring
            db_start = time.time()
            db.create_all()
            db_time = (time.time() - db_start) * 1000
            print(f"✅ Database tables checked/created in {db_time:.2f}ms")
            
            # Verify JWT configuration
            print("✅ JWT Configuration:")
            print(f"   Secret Key: {'Set' if app.config.get('JWT_SECRET_KEY') else 'Missing'}")
            print(f"   Access Token Expires: {app.config.get('JWT_ACCESS_TOKEN_EXPIRES')}")
            print(f"   Refresh Token Expires: {app.config.get('JWT_REFRESH_TOKEN_EXPIRES')}")
            print(f"   Token Locations: {app.config.get('JWT_TOKEN_LOCATION')}")
            print(f"   Algorithm: {app.config.get('JWT_ALGORITHM')}")
            
            # Optional: Test database connection and log initial stats
            try:
                from api.models import User
                user_count = User.query.count()
                print(f"🏥 Startup Health Check: Database connected ({user_count} users)")
                
                # Log initial system state
                initial_metrics = monitor.get_current_metrics()
                print(f"🔥 Initial System State:")
                print(f"   Memory: {initial_metrics['system']['memory_usage_mb']:.1f}MB")
                print(f"   Status: {initial_metrics['health_status']['status'].upper()}")
                print(f"   Environment: {ENV}")
                
            except Exception as e:
                print(f"❌ Startup health check failed: {e}")
                monitor.track_error('startup_health_check_failed')
            
        except Exception as e:
            print(f"❌ Database or JWT initialization error: {e}")
            monitor.track_error('startup_initialization_failed')
    
    # Start the application with performance monitoring active
    print(f"🚀 Starting application on port {PORT} with full performance monitoring")
    print("📊 Monitoring Dashboards:")
    print(f"   Flask Dashboard: http://localhost:{PORT}/dashboard")
    print(f"   API Metrics: http://localhost:{PORT}/api/admin/performance-dashboard")
    print(f"   Health Check: http://localhost:{PORT}/health")
    print("🔧 Debug Endpoints:")
    print(f"   Database Info: http://localhost:{PORT}/debug/database-info")
    print(f"   Force Refresh: http://localhost:{PORT}/debug/force-refresh")
    print(f"   Create Test User: http://localhost:{PORT}/debug/create-test-user")
    print(f"   Flask-Admin Refresh: http://localhost:{PORT}/debug/flask-admin-refresh")
    app.run(host='0.0.0.0', port=PORT, debug=(ENV == "development"))