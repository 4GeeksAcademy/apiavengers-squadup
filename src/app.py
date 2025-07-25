# src/app.py - CORS FIXED FOR FLASK-ADMIN

import os
from datetime import timedelta
from flask import Flask, request, jsonify, redirect, url_for
from flask_cors import CORS, cross_origin
from flask_jwt_extended import JWTManager
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from flask_admin.menu import MenuLink
from api import register_blueprints, configure_jwt_error_handlers, db
from api.models import User, GamingGroup, GameSession, SteamGame, Vote, SessionState
from api.utils import utc_now

# ============================================================================
# CUSTOM ADMIN VIEWS
# ============================================================================

class MyHomeView(AdminIndexView):
    """Custom admin home page"""
    
    @expose('/')
    def index(self):
        # Get stats for dashboard
        total_users = User.query.count()
        total_groups = GamingGroup.query.count()
        total_sessions = GameSession.query.count()
        total_games = SteamGame.query.count()
        total_votes = Vote.query.count()
        
        # Steam connection stats
        steam_connected = User.query.filter(
            (User.steam_connected == True) | (User.is_steam_connected == True)
        ).count()
        
        # Active sessions
        active_sessions = GameSession.query.filter(
            GameSession.status.in_(['planning', 'voting'])
        ).count()
        
        return self.render('admin/index.html',
                         total_users=total_users,
                         total_groups=total_groups,
                         total_sessions=total_sessions,
                         total_games=total_games,
                         total_votes=total_votes,
                         steam_connected=steam_connected,
                         active_sessions=active_sessions)

class UserModelView(ModelView):
    """User model view"""
    column_list = ['id', 'username', 'email', 'steam_connected', 'is_active', 'created_at']
    column_searchable_list = ['username', 'email', 'steam_username']
    column_filters = ['steam_connected', 'is_steam_connected', 'is_active', 'is_admin', 'created_at']
    form_excluded_columns = ['password_hash', 'owned_games', 'groups', 'created_groups', 'created_sessions', 'votes']
    column_default_sort = ('created_at', True)
    page_size = 50

class GamingGroupModelView(ModelView):
    """Gaming Group model view"""
    column_list = ['id', 'name', 'creator', 'max_members', 'is_public', 'created_at']
    column_searchable_list = ['name', 'description']
    column_filters = ['is_public', 'created_at']
    form_excluded_columns = ['members', 'sessions']
    column_default_sort = ('created_at', True)

class GameSessionModelView(ModelView):
    """Game Session model view"""
    column_list = ['id', 'session_name', 'group', 'creator', 'status', 'created_at']
    column_searchable_list = ['session_name', 'description']
    column_filters = ['status', 'created_at']
    form_excluded_columns = ['votes']
    column_default_sort = ('created_at', True)

class SteamGameModelView(ModelView):
    """Steam Game model view"""
    column_list = ['id', 'name', 'steam_appid', 'multiplayer', 'co_op']
    column_searchable_list = ['name']
    column_filters = ['multiplayer', 'co_op', 'created_at']
    form_excluded_columns = ['owners', 'votes', 'won_sessions']
    column_default_sort = ('name', False)
    page_size = 100

class VoteModelView(ModelView):
    """Vote model view"""
    column_list = ['id', 'user', 'session', 'game', 'priority', 'created_at']
    column_filters = ['priority', 'created_at']
    column_default_sort = ('created_at', True)

def create_app():
    """Create and configure the Flask application with Flask-Admin"""
    app = Flask(__name__)
    
    # ============================================================================
    # FLASK CONFIGURATION
    # ============================================================================
    
    app.config['SECRET_KEY'] = os.getenv('FLASK_APP_KEY', 'dev-secret-key-change-in-production')
    
    # Database configuration
    database_url = os.getenv('DATABASE_URL', 'sqlite:///squadup.db')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://')
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # ============================================================================
    # JWT CONFIGURATION
    # ============================================================================
    
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'
    app.config['JWT_ALGORITHM'] = 'HS256'
    app.config['JWT_DECODE_LEEWAY'] = timedelta(seconds=10)
    app.config['JWT_ERROR_MESSAGE_KEY'] = 'error'
    
    # ============================================================================
    # CORS CONFIGURATION - FIXED FOR FLASK-ADMIN
    # ============================================================================
    
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    
    # FIXED: More permissive CORS for Flask-Admin
    CORS(app, 
        origins=[
            'https://bookish-funicular-9754qgjjg9743pqr7-3000.app.github.dev',
            'https://bookish-funicular-9754qgjjg9743pqr7-3001.app.github.dev',
            'http://localhost:3000',
            'http://localhost:3001'
        ],
        supports_credentials=True,
        allow_headers=['Content-Type', 'Authorization'],
        methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # ============================================================================
    # INITIALIZE EXTENSIONS
    # ============================================================================
    
    db.init_app(app)
    jwt = JWTManager(app)
    configure_jwt_error_handlers(jwt)
    
    # ============================================================================
    # FLASK-ADMIN SETUP
    # ============================================================================
    
    admin = Admin(
        app, 
        name='SquadUp Admin Dashboard',
        template_mode='bootstrap3',
        index_view=MyHomeView(name='Dashboard')
    )
    
    # Add model views
    admin.add_view(UserModelView(User, db.session, name='Users', category='👥 Users'))
    admin.add_view(GamingGroupModelView(GamingGroup, db.session, name='Groups', category='🎮 Groups'))
    admin.add_view(GameSessionModelView(GameSession, db.session, name='Sessions', category='🗳️ Voting'))
    admin.add_view(VoteModelView(Vote, db.session, name='Votes', category='🗳️ Voting'))
    admin.add_view(SteamGameModelView(SteamGame, db.session, name='Games', category='🎯 Games'))
    
    # Add external links
    admin.add_link(MenuLink(name='API Health', url='/health', category='🔗 Links'))
    admin.add_link(MenuLink(name='Frontend App', url=frontend_url, category='🔗 Links'))
    
    print("✅ Flask-Admin configured successfully")
    
    # ============================================================================
    # REGISTER BLUEPRINTS
    # ============================================================================
    
    register_blueprints(app)
    
    # ============================================================================
    # ROUTES WITH CORS FIXES
    # ============================================================================
    
    @app.route('/')
    @cross_origin()
    def home():
        """Redirect to admin interface"""
        return redirect('/admin/')
    
    @app.route('/admin')
    @cross_origin()
    def admin_redirect():
        """Admin redirect with CORS support"""
        return redirect('/admin/')
    
    @app.route('/health')
    @cross_origin()
    def health_check():
        """Health check endpoint"""
        return jsonify({
            'success': True,
            'message': 'SquadUp API is running',
            'timestamp': utc_now().isoformat(),
            'version': '1.0.0',
            'admin_url': '/admin/',
            'models': {
                'users': User.query.count(),
                'groups': GamingGroup.query.count(),
                'sessions': GameSession.query.count(),
                'games': SteamGame.query.count(),
                'votes': Vote.query.count()
            }
        })
    
    # ============================================================================
    # GLOBAL CORS HANDLING
    # ============================================================================
    
    
    # ============================================================================
    # ERROR HANDLERS
    # ============================================================================
    
    @app.errorhandler(404)
    def not_found(error):
        response = jsonify({
            'success': False,
            'error': 'Endpoint not found',
            'code': 'NOT_FOUND',
            'admin_url': '/admin/'
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        response = jsonify({
            'success': False,
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500
    
    # ============================================================================
    # DATABASE INITIALIZATION
    # ============================================================================
    
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables created successfully")
        except Exception as e:
            print(f"❌ Database initialization error: {e}")
    
    return app

# Create the application instance
app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    debug = os.getenv('FLASK_DEBUG', '1') == '1'
    
    print(f"\n🚀 Starting SquadUp API on port {port}")
    print(f"🔧 Debug mode: {debug}")
    print(f"👨‍💼 Admin Interface: https://bookish-funicular-9754qgjjg9743pqr7-{port}.app.github.dev/admin/")
    print(f"📊 Health Check: https://bookish-funicular-9754qgjjg9743pqr7-{port}.app.github.dev/health")
    print()
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )