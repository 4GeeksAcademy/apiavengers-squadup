# src/api/admin.py - ENHANCED VERSION

import os
from flask_admin import Admin
from .models import db, User, GamingGroup, SteamGame, GameSession
from flask_admin.contrib.sqla import ModelView
from flask_admin import expose
from flask import flash, redirect, url_for, request
from sqlalchemy.exc import IntegrityError

class UserModelView(ModelView):
    """Enhanced User model view with proper deletion handling"""
    
    # Display settings
    column_list = ['id', 'username', 'email', 'is_active', 'steam_connected', 'created_at', 'last_login']
    column_searchable_list = ['username', 'email']
    column_filters = ['is_active', 'is_steam_connected', 'created_at']
    column_editable_list = ['is_active']
    
    # Form settings
    form_excluded_columns = ['password_hash', 'owned_games', 'groups', 'created_groups']
    
    # Add custom column labels
    column_labels = {
        'is_steam_connected': 'Steam Connected',
        'steam_username': 'Steam Username',
        'created_at': 'Created',
        'last_login': 'Last Login'
    }
    
    def delete_model(self, model):
        """Custom delete method that handles cascading properly"""
        try:
            user_id = model.id
            username = model.username
            
            # Step 1: Handle created groups - transfer ownership or delete
            created_groups = GamingGroup.query.filter_by(creator_id=user_id).all()
            
            for group in created_groups:
                # Get other members of the group
                other_members = [member for member in group.members if member.id != user_id]
                
                if other_members:
                    # Transfer ownership to first member
                    new_creator = other_members[0]
                    group.creator_id = new_creator.id
                    flash(f'Group "{group.name}" ownership transferred to {new_creator.username}', 'info')
                else:
                    # No other members, delete the group
                    db.session.delete(group)
                    flash(f'Empty group "{group.name}" was deleted', 'warning')
            
            # Step 2: Remove user from group memberships
            # This should be handled automatically by SQLAlchemy relationships
            model.groups.clear()
            
            # Step 3: Clear Steam games associations
            model.owned_games.clear()
            
            # Step 4: Delete the user
            db.session.delete(model)
            db.session.commit()
            
            flash(f'User "{username}" and related data deleted successfully!', 'success')
            return True
            
        except IntegrityError as e:
            db.session.rollback()
            flash(f'Error deleting user: Database integrity constraint failed. {str(e)}', 'error')
            return False
        except Exception as e:
            db.session.rollback()
            flash(f'Error deleting user: {str(e)}', 'error')
            return False

class GamingGroupModelView(ModelView):
    """Enhanced Gaming Group model view"""
    
    column_list = ['id', 'name', 'creator', 'is_public', 'current_members', 'max_members', 'created_at']
    column_searchable_list = ['name', 'description']
    column_filters = ['is_public', 'created_at']
    
    # Add a computed column for member count
    def get_query(self):
        return self.session.query(self.model)
    
    def get_count_query(self):
        return self.session.query(func.count('*')).select_from(self.model)
    
    # Custom column formatter
    def _current_members_formatter(view, context, model, name):
        return len(model.members)
    
    column_formatters = {
        'current_members': _current_members_formatter
    }

class SteamGameModelView(ModelView):
    """Steam Game model view"""
    
    column_list = ['id', 'name', 'steam_appid', 'multiplayer', 'co_op', 'owner_count']
    column_searchable_list = ['name']
    column_filters = ['multiplayer', 'co_op', 'genres']
    
    def _owner_count_formatter(view, context, model, name):
        return len(model.owners)
    
    column_formatters = {
        'owner_count': _owner_count_formatter
    }

class GameSessionModelView(ModelView):
    """Game Session model view"""
    
    column_list = ['id', 'session_name', 'group', 'game', 'status', 'created_at']
    column_filters = ['status', 'created_at']

def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
    admin = Admin(app, name='SquadUp Admin', template_mode='bootstrap3')

    # Add enhanced model views
    admin.add_view(UserModelView(User, db.session, name='Users'))
    admin.add_view(GamingGroupModelView(GamingGroup, db.session, name='Gaming Groups'))
    admin.add_view(SteamGameModelView(SteamGame, db.session, name='Steam Games'))
    admin.add_view(GameSessionModelView(GameSession, db.session, name='Game Sessions'))
    
    return admin