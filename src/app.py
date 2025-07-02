"""
Bootstraps the Flask server, loads DB, and registers endpoints
"""
import os

from flask import Flask, send_from_directory, jsonify
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from api.models import db
from api.routes import api as api_bp          # ← fixed import
from api.steam_auth import steam_bp
from api.utils import APIException, generate_sitemap
from api.admin import setup_admin
from api.commands import setup_commands

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../dist")

app = Flask(__name__, static_folder=static_file_dir, static_url_path="/")
app.url_map.strict_slashes = False
CORS(app)

# JWT
app.config["JWT_SECRET_KEY"] = os.getenv("SUPER_SECRET_SECRET", "dev-secret")
jwt = JWTManager(app)

# Database
db_url = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_DATABASE_URI"] = (
    db_url.replace("postgres://", "postgresql://") if db_url else "sqlite:////tmp/test.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
Migrate(app, db, compare_type=True)
db.init_app(app)

app.config["SERVER_NAME"] = "animated-eureka-5grpx4q7wvpgf66g-3001.app.github.dev"
app.config["PREFERRED_URL_SCHEME"] = "https"

# Admin & custom CLI commands
setup_admin(app)
setup_commands(app)

# Blueprints
app.register_blueprint(api_bp, url_prefix="/api")   # ← now mounted
app.register_blueprint(steam_bp, url_prefix="/api") # ← comma added

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

@app.route("/<path:path>")
def static_proxy(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = "index.html"
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0
    return response

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3001))
    app.run(host="0.0.0.0", port=port, debug=True)
