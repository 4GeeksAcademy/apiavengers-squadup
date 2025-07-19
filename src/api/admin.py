# src/api/admin.py - FIXED VERSION with corrected relationship names

import os
from flask_admin import Admin
from .models import db, User, GamingGroup, SteamGame, GameSession, Vote
from flask_admin.contrib.sqla import ModelView
from flask import flash

class SafeUserModelView(ModelView):
    """User model view with safe deletion"""
    column_list = ['id', 'username', 'email', 'is_active', 'is_steam_connected', 'created_at']
    column_searchable_list = ['username', 'email']
    column_filters = ['is_active', 'is_steam_connected']
    
    def delete_model(self, model):
        try:
            # Handle created groups
            for group in model.created_groups:
                other_members = [m for m in group.members if m.id != model.id]
                if other_members:
                    group.creator_id = other_members[0].id
                else:
                    db.session.delete(group)
            
            # 🔧 FIXED: Use the correct primary relationship name 'groups'
            model.groups.clear()
            model.owned_games.clear()
            
            db.session.delete(model)
            db.session.commit()
            flash(f'User "{model.username}" deleted successfully!', 'success')
            return True
        except Exception as e:
            db.session.rollback()
            flash(f'Error deleting user: {str(e)}', 'error')
            return False

class SafeGamingGroupModelView(ModelView):
    column_list = ['id', 'name', 'creator', 'is_public', 'max_members', 'created_at']
    column_searchable_list = ['name']

class SafeSteamGameModelView(ModelView):
    column_list = ['id', 'name', 'steam_appid', 'multiplayer', 'co_op']
    column_searchable_list = ['name']

class SafeGameSessionModelView(ModelView):
    column_list = ['id', 'session_name', 'group', 'status', 'created_at']

def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
    admin = Admin(app, name='SquadUp Admin', template_mode='bootstrap3')

    admin.add_view(SafeUserModelView(User, db.session))
    admin.add_view(SafeGamingGroupModelView(GamingGroup, db.session))
    admin.add_view(SafeSteamGameModelView(SteamGame, db.session))
    admin.add_view(SafeGameSessionModelView(GameSession, db.session))
    admin.add_view(ModelView(Vote, db.session))