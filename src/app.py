import os
from flask import Flask, jsonify, send_from_directory
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from api.utils import APIException
from api.models import db
from api.admin import setup_admin
from api.auth import auth_blueprint

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../dist/')

app = Flask(__name__)
app.url_map.strict_slashes = False

# CORS Configuration
CORS(app)

# JWT Configuration
app.config["JWT_SECRET_KEY"] = os.environ.get('JWT_SECRET_KEY')
jwt = JWTManager(app)

# Database Configuration
db_url = os.getenv("DATABASE_URL")
if db_url:
    # Handle both postgres:// and postgresql:// URLs
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
else:
    # Fallback to SQLite for local development
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database and migrations
db.init_app(app)
MIGRATE = Migrate(app, db)

# Setup admin
setup_admin(app)

# Register API blueprints (Must come BEFORE the catch-all route)
app.register_blueprint(auth_blueprint, url_prefix='/api/auth')

# Error handler
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# Serve the React app (Must come LAST)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(static_file_dir, path)):
        return send_from_directory(static_file_dir, path)
    else:
        return send_from_directory(static_file_dir, 'index.html')

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)