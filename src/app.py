"""
REFINED Flask Application (`src/app.py`)
=========================================
This version includes:
- Cleaned up and organized imports.
- A robust CORS setup for GitHub Codespaces that relies solely on the Flask-CORS extension.
- Removal of manual CORS headers from the `after_request` hook to prevent conflicts.
- Added comments highlighting the limitations of in-memory storage for JWT blacklists and rate limiting.
"""
import os
import logging
from datetime import timedelta, datetime
from collections import defaultdict

# Third-party imports
# CORRECTED: Added 'redirect' and 'url_for' to this import line
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

# ============================================================================
# App Initialization & Environment
# ============================================================================
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# ============================================================================
# CORS Configuration for GitHub Codespaces
# ============================================================================
CODESPACE_NAME = os.getenv('CODESPACE_NAME')
GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = os.getenv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')
allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if CODESPACE_NAME and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:
    codespace_frontend_url = f"https://{CODESPACE_NAME}-3000.{GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    allowed_origins.append(codespace_frontend_url)
    print(f"🌐 Codespace frontend origin added: {codespace_frontend_url}")
CORS(app, origins=allowed_origins, supports_credentials=True)
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
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key-change-me')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
jwt = JWTManager(app)
app.blacklisted_tokens = set()

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
# Rate Limiting
# ============================================================================
rate_limit_storage = defaultdict(list)
@app.before_request
def rate_limit_check():
    if request.endpoint and 'auth.' in str(request.endpoint):
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=15)
        rate_limit_storage[client_ip] = [t for t in rate_limit_storage[client_ip] if t > window_start]
        if len(rate_limit_storage[client_ip]) >= 50:
            return jsonify({'message': 'Too many requests.', 'error': 'rate_limit_exceeded'}), 429
        rate_limit_storage[client_ip].append(now)

# ============================================================================
# Global Error Handling & Security Headers
# ============================================================================
@app.errorhandler(APIException)
def handle_api_exception(error):
    return jsonify(error.to_dict()), error.status_code

@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    if ENV == "production":
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

# ============================================================================
# Blueprint & Route Registration
# ============================================================================
setup_admin(app)
setup_commands(app)
app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(auth, url_prefix='/api/auth')
app.register_blueprint(gaming, url_prefix='/api/gaming')

# ============================================================================
# Route Configuration
# ============================================================================
# CORRECTED: This route now correctly redirects to the admin panel
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

# ============================================================================
# Main Entry Point
# ============================================================================
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)