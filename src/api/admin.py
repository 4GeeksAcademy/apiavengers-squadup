# src/api/admin.py - FULLY SAFE FOR ALL DELETIONS

import os
from flask_admin import Admin
from .models import db, User, GamingGroup, SteamGame, GameSession
from flask_admin.contrib.sqla import ModelView
from flask import flash
from sqlalchemy.exc import IntegrityError

class SafeUserModelView(ModelView):
    """User model view with safe deletion"""
    
    column_list = ['id', 'username', 'email', 'is_active', 'is_steam_connected', 'created_at']
    column_searchable_list = ['username', 'email']
    column_filters = ['is_active', 'is_steam_connected']
    
    def delete_model(self, model):
        """Safe user deletion that handles group ownership"""
        try:
            username = model.username
            
            # Handle created groups
            created_groups = GamingGroup.query.filter_by(creator_id=model.id).all()
            for group in created_groups:
                other_members = [m for m in group.members if m.id != model.id]
                if other_members:
                    group.creator_id = other_members[0].id
                    flash(f'Group "{group.name}" ownership transferred to {other_members[0].username}', 'info')
                else:
                    db.session.delete(group)
                    flash(f'Empty group "{group.name}" was deleted', 'warning')
            
            # Clear all associations
            model.groups.clear()  # Remove from group memberships
            model.owned_games.clear()  # Remove game ownership
            
            # Delete user
            db.session.delete(model)
            db.session.commit()
            
            flash(f'User "{username}" deleted successfully!', 'success')
            return True
            
        except Exception as e:
            db.session.rollback()
            flash(f'Error deleting user: {str(e)}', 'error')
            return False

class SafeGamingGroupModelView(ModelView):
    """Safe Gaming Group model view"""
    
    column_list = ['id', 'name', 'creator', 'is_public', 'max_members', 'created_at']
    column_searchable_list = ['name', 'description']
    column_filters = ['is_public', 'created_at']
    
    def delete_model(self, model):
        """Safe group deletion"""
        try:
            group_name = model.name
            
            # Clear member associations
            model.members.clear()
            
            # Delete any game sessions for this group
            sessions = GameSession.query.filter_by(group_id=model.id).all()
            for session in sessions:
                db.session.delete(session)
            
            # Delete the group
            db.session.delete(model)
            db.session.commit()
            
            flash(f'Group "{group_name}" and its sessions deleted successfully!', 'success')
            return True
            
        except Exception as e:
            db.session.rollback()
            flash(f'Error deleting group: {str(e)}', 'error')
            return False

class SafeSteamGameModelView(ModelView):
    """Safe Steam Game model view"""
    
    column_list = ['id', 'name', 'steam_appid', 'multiplayer', 'co_op']
    column_searchable_list = ['name']
    column_filters = ['multiplayer', 'co_op']
    
    def delete_model(self, model):
        """Safe game deletion - clears user associations first"""
        try:
            game_name = model.name
            owner_count = len(model.owners)
            
            # Clear all user associations
            model.owners.clear()
            
            # Delete any game sessions using this game
            sessions = GameSession.query.filter_by(game_id=model.id).all()
            for session in sessions:
                session.game_id = None  # Remove game reference but keep session
            
            # Delete the game
            db.session.delete(model)
            db.session.commit()
            
            flash(f'Game "{game_name}" deleted successfully! (Was owned by {owner_count} users)', 'success')
            return True
            
        except Exception as e:
            db.session.rollback()
            flash(f'Error deleting game: {str(e)}', 'error')
            return False

class SafeGameSessionModelView(ModelView):
    """Safe Game Session model view"""
    
    column_list = ['id', 'session_name', 'group', 'game', 'status', 'created_at']
    column_filters = ['status', 'created_at']
    
    def delete_model(self, model):
        """Safe session deletion"""
        try:
            session_name = model.session_name
            
            # Sessions don't have complex relationships, just delete
            db.session.delete(model)
            db.session.commit()
            
            flash(f'Game session "{session_name}" deleted successfully!', 'success')
            return True
            
        except Exception as e:
            db.session.rollback()
            flash(f'Error deleting session: {str(e)}', 'error')
            return False

def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
    admin = Admin(app, name='SquadUp Admin', template_mode='bootstrap3')

    # Add all safe model views
    admin.add_view(SafeUserModelView(User, db.session, name='Users'))
    admin.add_view(SafeGamingGroupModelView(GamingGroup, db.session, name='Gaming Groups'))
    admin.add_view(SafeSteamGameModelView(SteamGame, db.session, name='Steam Games'))
    admin.add_view(SafeGameSessionModelView(GameSession, db.session, name='Game Sessions'))
    
    return admin