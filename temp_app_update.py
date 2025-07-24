# Add this import to your existing app.py imports
from api.steam_status import steam_status

# Add this blueprint registration with your existing ones
app.register_blueprint(steam_status, url_prefix='/api/steam')
