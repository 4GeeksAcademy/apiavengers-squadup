import os
import logging
from datetime import timedelta, datetime
from collections import defaultdict

# --- This is the correct fix ---
from dotenv import load_dotenv
load_dotenv()
print(f"Loaded FRONTEND_URL: {os.getenv('FRONTEND_URL')}")  # Should print the codespace URL 

# Third-party imports
from flask import Flask, request, jsonify, send_from_directory, redirect, url_for, current_app   
from flask_migrate import Migrate

from flask_socketio import SocketIO
from flask_swagger import swagger
from flask_jwt_extended import JWTManager, get_jwt, create_refresh_token
from flask_cors import CORS

# Local application imports
from api.utils import APIException
from api.models import db
from api.auth import auth
from api.gaming import gaming
from api.admin import setup_admin
from api.commands import setup_commands
from api.steam_auth import steam_auth
from api.steam import steam
from api.genre_routes import genre_bp
from werkzeug.middleware.proxy_fix import ProxyFix

load_dotenv()
SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

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

# Configure CORS for development
if ENV == "development":
    CORS(app, origins=["*"], supports_credentials=True)
    print("🔧 CORS configured for development (all origins)")
else:
    CORS(app)
    print("🔧 CORS configured for production")

# Database
db_url = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_DATABASE_URI"] = (
    db_url.replace("postgres://", "postgresql://") if db_url else "sqlite:////tmp/test.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
Migrate(app, db, compare_type=True)

# Use environment variables for server configuration
backend_url = os.getenv('VITE_BACKEND_URL', 'http://localhost:3001')
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')

print(f"🔧 Backend URL: {backend_url}")
print(f"🔧 Frontend URL: {frontend_url}")

if backend_url.startswith('https://'):
    app.config["PREFERRED_URL_SCHEME"] = "https"
else:
    app.config["PREFERRED_URL_SCHEME"] = "http"

# For Codespaces, we need to extract the hostname from the backend URL
if 'github.dev' in backend_url:
    from urllib.parse import urlparse
    parsed_url = urlparse(backend_url)
    app.config["SERVER_NAME"] = parsed_url.netloc
    print(f"🔧 Set SERVER_NAME to: {parsed_url.netloc}")
elif ENV == "production" and os.getenv('SERVER_NAME'):
    app.config["SERVER_NAME"] = os.getenv('SERVER_NAME')

# Admin & custom CLI commands
setup_admin(app)  # Re-enabled after fixing blueprint conflicts
setup_commands(app)

# Blueprints
app.register_blueprint(auth, url_prefix='/api/auth')
app.register_blueprint(steam_auth, url_prefix="/api/auth")
app.register_blueprint(genre_bp, url_prefix="/api")
app.register_blueprint(gaming, url_prefix='/api/gaming')

# Debug: Print all registered routes
print("🔧 Registered routes:")
for rule in app.url_map.iter_rules():
    print(f"  {rule.rule} -> {rule.endpoint}")

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
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
# --- MINOR IMPROVEMENT: Ensure the key was actually loaded ---
if not app.config['JWT_SECRET_KEY']:
    raise RuntimeError("JWT_SECRET_KEY is not set in the .env file. The application cannot start securely.")

app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
jwt = JWTManager(app)
app.blacklisted_tokens = set()

# --- JWT handlers ---
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload['jti']
    return jti in app.blacklisted_tokens

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'message': 'The token has expired.', 'error': 'token_expired'}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'message': 'Signature verification failed.', 'error': 'invalid_token'}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({'message': 'Request does not contain an access token.', 'error': 'authorization_required'}), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return jsonify({'message': 'The token has been revoked.', 'error': 'token_revoked'}), 401



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
        
        # Debug rate limiting
        print(f"🔍 Rate limit check for endpoint: {request.endpoint}, IP: {client_ip}")
        
        if is_rate_limited(client_ip, max_requests=20, window_minutes=15):
            print(f"❌ Rate limited: {client_ip}")
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

# ============================================================================
# JWT Configuration
# ============================================================================
# This line now correctly loads your secret key from the .env file.

# ============================================================================
# Blueprint & Route Registration
# ============================================================================
setup_commands(app)


# ============================================================================
# Route Configuration & Main Entry Point
# ============================================================================
@app.route('/')
def redirect_to_admin():
    return redirect(url_for('squadup_admin_2024.index'))



# Error handler
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# Sitemap / SPA fall-through
#@app.route("/")
#def sitemap():
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

# FIXED: Add CORS headers manually for OPTIONS requests
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    socketio.run(host='0.0.0.0', port=PORT, debug=True) 
