# src/app.py - UPDATED WITH LIVE VOTING SYSTEM

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
# JWT Configuration
# ============================================================================
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key-for-dev')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
jwt = JWTManager(app)

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
# Route Configuration & Health Checks
# ============================================================================
@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': utc_now().isoformat()}), 200

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
        except Exception as e:
            print(f"❌ Database initialization error: {e}")
            
    app.run(host='0.0.0.0', port=PORT, debug=(ENV == "development"))