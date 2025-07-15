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

# ============================================================================
# App Initialization & Environment
# ============================================================================
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# ============================================================================
# CORS Configuration for GitHub Codespaces - FIXED
# ============================================================================
CODESPACE_NAME = os.getenv('CODESPACE_NAME')
GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = os.getenv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')

# More permissive CORS for development
allowed_origins = [
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    "https://localhost:3000"
]

if CODESPACE_NAME and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:
    codespace_frontend_url = f"https://{CODESPACE_NAME}-3000.{GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    allowed_origins.append(codespace_frontend_url)
    print(f"🌐 Codespace frontend origin added: {codespace_frontend_url}")

# FIXED: More permissive CORS configuration
CORS(app, 
     origins=allowed_origins,
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
)

print(f"🔧 CORS configured for origins: {allowed_origins}")

# ============================================================================
# Database Configuration
# ============================================================================
db_url = os.getenv("DATABASE_URL")
if db_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace("postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# ============================================================================
# JWT Configuration
# ============================================================================
# This line now correctly loads your secret key from the .env file.
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
# --- MINOR IMPROVEMENT: Ensure the key was actually loaded ---
if not app.config['JWT_SECRET_KEY']:
    raise RuntimeError("JWT_SECRET_KEY is not set in the .env file. The application cannot start securely.")

app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
jwt = JWTManager(app)
app.blacklisted_tokens = set()

# --- The rest of your app.py file is correct and needs no further changes ---

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
# Blueprint & Route Registration
# ============================================================================
setup_admin(app)
setup_commands(app)
# Register blueprints (remove any duplicates)
app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(auth, url_prefix='/api/auth')
app.register_blueprint(gaming, url_prefix='/api/gaming')
app.register_blueprint(steam_auth, url_prefix='/api/auth/steam')  # Specific for Steam auth
app.register_blueprint(steam, url_prefix='/api/steam')  # For library/sync/common

# ============================================================================
# Route Configuration & Main Entry Point
# ============================================================================
@app.route('/')
def redirect_to_admin():
    return redirect(url_for('admin.index'))

@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
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
    app.run(host='0.0.0.0', port=PORT, debug=True)