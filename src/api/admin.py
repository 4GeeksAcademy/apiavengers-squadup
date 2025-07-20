# src/api/admin.py - BYPASS FLASK-ADMIN FORM GENERATION COMPLETELY

import os
from flask_admin import Admin, BaseView, expose
from .models import db, User, GamingGroup, SteamGame, GameSession, Vote
from flask_admin.contrib.sqla import ModelView
from flask import flash, request, redirect, url_for, render_template_string
from sqlalchemy import text
from werkzeug.security import generate_password_hash
from datetime import datetime, timezone

# Custom User Management View that completely bypasses Flask-Admin forms
class CustomUserView(BaseView):
    @expose('/')
    def index(self):
        """Custom user list page"""
        try:
            users = User.query.order_by(User.id.desc()).all()
            
            html = '''
            <!DOCTYPE html>
            <html>
            <head>
                <title>User Management - SquadUp Admin</title>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                <style>
                    .admin-badge { background-color: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
                    .inactive-badge { background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
                    .steam-badge { background-color: #007bff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container-fluid mt-4">
                    <div class="row">
                        <div class="col-12">
                            <h2>👤 User Management</h2>
                            <div class="mb-3">
                                <a href="/admin/users/new" class="btn btn-success">➕ Create New User</a>
                                <a href="/admin/" class="btn btn-secondary">← Back to Admin</a>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead class="thead-dark">
                                        <tr>
                                            <th>ID</th>
                                            <th>Username</th>
                                            <th>Email</th>
                                            <th>Status</th>
                                            <th>Steam</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
            '''
            
            for user in users:
                admin_badge = '<span class="admin-badge">ADMIN</span>' if user.is_admin else ''
                status_badge = '<span class="badge badge-success">Active</span>' if user.is_active else '<span class="inactive-badge">Inactive</span>'
                steam_badge = '<span class="steam-badge">Steam</span>' if user.steam_connected else ''
                created_date = user.created_at.strftime('%Y-%m-%d') if user.created_at else 'Unknown'
                
                html += f'''
                        <tr>
                            <td>{user.id}</td>
                            <td>{user.username} {admin_badge}</td>
                            <td>{user.email}</td>
                            <td>{status_badge}</td>
                            <td>{steam_badge}</td>
                            <td>{created_date}</td>
                            <td>
                                <a href="/admin/users/edit/{user.id}" class="btn btn-sm btn-primary">✏️ Edit</a>
                                <a href="/admin/users/delete/{user.id}" class="btn btn-sm btn-danger" onclick="return confirm('Delete user {user.username}?')">🗑️ Delete</a>
                                {'<a href="/admin/users/demote/' + str(user.id) + '" class="btn btn-sm btn-warning">👤 Remove Admin</a>' if user.is_admin else '<a href="/admin/users/promote/' + str(user.id) + '" class="btn btn-sm btn-success">👑 Make Admin</a>'}
                            </td>
                        </tr>
                '''
            
            html += '''
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            '''
            
            return html
            
        except Exception as e:
            return f'<h1>Error</h1><p>{str(e)}</p>'
    
    @expose('/new', methods=['GET', 'POST'])
    def create_user(self):
        """Custom user creation page"""
        if request.method == 'POST':
            try:
                # Get form data
                username = request.form.get('username', '').strip()
                email = request.form.get('email', '').strip()
                is_admin = request.form.get('is_admin') == 'on'
                is_active = request.form.get('is_active') == 'on'
                bio = request.form.get('bio', '').strip()
                
                # Validation
                if not username or not email:
                    flash('Username and email are required!', 'error')
                    return redirect('/admin/users/new')
                
                # Check for duplicates
                existing = User.query.filter(
                    (User.username == username) | (User.email == email)
                ).first()
                
                if existing:
                    flash(f'User with username "{username}" or email "{email}" already exists!', 'error')
                    return redirect('/admin/users/new')
                
                # Create user
                user = User(
                    username=username,
                    email=email,
                    password_hash=generate_password_hash('change_me_123'),
                    is_admin=is_admin,
                    is_active=is_active,
                    bio=bio if bio else None,
                    steam_connected=False,
                    is_steam_connected=False,
                    gaming_activity_level='moderate',
                    total_games=0,
                    total_votes_cast=0,
                    created_at=datetime.now(timezone.utc)
                )
                
                db.session.add(user)
                db.session.commit()
                
                flash(f'✅ User "{username}" created successfully! Default password: change_me_123', 'success')
                return redirect('/admin/users/')
                
            except Exception as e:
                db.session.rollback()
                flash(f'❌ Error creating user: {str(e)}', 'error')
                return redirect('/admin/users/new')
        
        # GET request - show form
        html = '''
        <!DOCTYPE html>
        <html>
        <head>
            <title>Create User - SquadUp Admin</title>
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
        </head>
        <body>
            <div class="container mt-4">
                <h2>➕ Create New User</h2>
                <div class="row">
                    <div class="col-md-6">
                        <form method="POST">
                            <div class="form-group">
                                <label for="username">Username *</label>
                                <input type="text" class="form-control" id="username" name="username" required>
                            </div>
                            <div class="form-group">
                                <label for="email">Email Address *</label>
                                <input type="email" class="form-control" id="email" name="email" required>
                            </div>
                            <div class="form-group">
                                <label for="bio">Bio (Optional)</label>
                                <textarea class="form-control" id="bio" name="bio" rows="3"></textarea>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="is_active" name="is_active" checked>
                                <label class="form-check-label" for="is_active">Account Active</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="is_admin" name="is_admin">
                                <label class="form-check-label" for="is_admin">Administrator</label>
                            </div>
                            <hr>
                            <button type="submit" class="btn btn-success">✅ Create User</button>
                            <a href="/admin/users/" class="btn btn-secondary">❌ Cancel</a>
                        </form>
                        <div class="mt-3">
                            <small class="text-muted">
                                * Default password will be: <strong>change_me_123</strong><br>
                                * User should change this password after first login
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        '''
        
        return html
    
    @expose('/edit/<int:user_id>', methods=['GET', 'POST'])
    def edit_user(self, user_id):
        """Custom user edit page"""
        user = User.query.get_or_404(user_id)
        
        if request.method == 'POST':
            try:
                # Update user
                user.username = request.form.get('username', '').strip()
                user.email = request.form.get('email', '').strip()
                user.is_admin = request.form.get('is_admin') == 'on'
                user.is_active = request.form.get('is_active') == 'on'
                user.bio = request.form.get('bio', '').strip() or None
                
                db.session.commit()
                flash(f'✅ User "{user.username}" updated successfully!', 'success')
                return redirect('/admin/users/')
                
            except Exception as e:
                db.session.rollback()
                flash(f'❌ Error updating user: {str(e)}', 'error')
        
        # GET request - show form
        html = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <title>Edit User - SquadUp Admin</title>
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
        </head>
        <body>
            <div class="container mt-4">
                <h2>✏️ Edit User: {user.username}</h2>
                <div class="row">
                    <div class="col-md-6">
                        <form method="POST">
                            <div class="form-group">
                                <label for="username">Username</label>
                                <input type="text" class="form-control" id="username" name="username" value="{user.username}" required>
                            </div>
                            <div class="form-group">
                                <label for="email">Email Address</label>
                                <input type="email" class="form-control" id="email" name="email" value="{user.email}" required>
                            </div>
                            <div class="form-group">
                                <label for="bio">Bio</label>
                                <textarea class="form-control" id="bio" name="bio" rows="3">{user.bio or ''}</textarea>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="is_active" name="is_active" {'checked' if user.is_active else ''}>
                                <label class="form-check-label" for="is_active">Account Active</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="is_admin" name="is_admin" {'checked' if user.is_admin else ''}>
                                <label class="form-check-label" for="is_admin">Administrator</label>
                            </div>
                            <hr>
                            <button type="submit" class="btn btn-success">💾 Save Changes</button>
                            <a href="/admin/users/" class="btn btn-secondary">❌ Cancel</a>
                        </form>
                    </div>
                </div>
            </div>
        </body>
        </html>
        '''
        
        return html
    
    @expose('/delete/<int:user_id>')
    def delete_user(self, user_id):
        """Delete user"""
        try:
            user = User.query.get_or_404(user_id)
            username = user.username
            
            # Handle relationships
            for group in user.created_groups:
                other_members = [m for m in group.members if m.id != user.id]
                if other_members:
                    group.creator_id = other_members[0].id
                else:
                    db.session.delete(group)
            
            # Clear relationships
            user.groups.clear()
            user.owned_games.clear()
            
            db.session.delete(user)
            db.session.commit()
            
            flash(f'✅ User "{username}" deleted successfully!', 'success')
            
        except Exception as e:
            db.session.rollback()
            flash(f'❌ Error deleting user: {str(e)}', 'error')
        
        return redirect('/admin/users/')
    
    @expose('/promote/<int:user_id>')
    def promote_user(self, user_id):
        """Make user admin"""
        try:
            user = User.query.get_or_404(user_id)
            user.is_admin = True
            db.session.commit()
            flash(f'✅ {user.username} is now an administrator!', 'success')
        except Exception as e:
            db.session.rollback()
            flash(f'❌ Error promoting user: {str(e)}', 'error')
        return redirect('/admin/users/')
    
    @expose('/demote/<int:user_id>')
    def demote_user(self, user_id):
        """Remove admin privileges"""
        try:
            user = User.query.get_or_404(user_id)
            user.is_admin = False
            db.session.commit()
            flash(f'✅ {user.username} is no longer an administrator', 'success')
        except Exception as e:
            db.session.rollback()
            flash(f'❌ Error demoting user: {str(e)}', 'error')
        return redirect('/admin/users/')

# Simple views for other models (these work fine)
class SimpleGroupModelView(ModelView):
    column_list = ['id', 'name', 'creator', 'is_public', 'max_members', 'created_at']
    column_searchable_list = ['name']
    page_size = 50

class SimpleGameModelView(ModelView):
    column_list = ['id', 'name', 'steam_appid', 'multiplayer', 'co_op']
    column_searchable_list = ['name']
    page_size = 25

class SimpleSessionModelView(ModelView):
    column_list = ['id', 'session_name', 'group', 'status', 'created_at']
    column_searchable_list = ['session_name']
    column_filters = ['status']
    page_size = 50

class SimpleVoteModelView(ModelView):
    column_list = ['id', 'user', 'game', 'session', 'priority', 'created_at']
    column_filters = ['priority']
    page_size = 50

# JWT Token view
class TokenView(BaseView):
    @expose('/')
    def index(self):
        """Show JWT tokens for all users"""
        try:
            from flask_jwt_extended import create_access_token, create_refresh_token
            
            users = User.query.all()
            user_tokens = []
            
            for user in users:
                try:
                    access_token = create_access_token(identity=user.id)
                    refresh_token = create_refresh_token(identity=user.id)
                    
                    user_tokens.append({
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'is_admin': user.is_admin,
                        'access_token': access_token,
                        'refresh_token': refresh_token
                    })
                except Exception as e:
                    user_tokens.append({
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'error': str(e)
                    })
            
            html = '''
            <!DOCTYPE html>
            <html>
            <head>
                <title>JWT Tokens - SquadUp Admin</title>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                <style>
                    .token { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 3px; word-break: break-all; font-family: monospace; font-size: 12px; }
                    .admin { background-color: #fff3cd; }
                </style>
            </head>
            <body>
                <div class="container-fluid mt-4">
                    <h2>🔑 JWT Tokens for All Users</h2>
                    <p>Total Users: ''' + str(len(user_tokens)) + '''</p>
            '''
            
            for user_token in user_tokens:
                admin_class = ' admin' if user_token.get('is_admin') else ''
                html += f'''
                <div class="card mb-3{admin_class}">
                    <div class="card-header">
                        <h5>👤 {user_token['username']} (ID: {user_token['id']}) {'👑 ADMIN' if user_token.get('is_admin') else ''}</h5>
                        <small>Email: {user_token['email']}</small>
                    </div>
                    <div class="card-body">
                '''
                
                if 'error' in user_token:
                    html += f'<p class="text-danger"><strong>Error:</strong> {user_token["error"]}</p>'
                else:
                    html += f'''
                        <div class="token">
                            <strong>🔑 Access Token:</strong><br>
                            {user_token['access_token'][:50]}...
                            <button class="btn btn-sm btn-primary" onclick="copyToClipboard('{user_token['access_token']}', this)">Copy Full Token</button>
                        </div>
                        <div class="token">
                            <strong>🔄 Refresh Token:</strong><br>
                            {user_token['refresh_token'][:50]}...
                            <button class="btn btn-sm btn-secondary" onclick="copyToClipboard('{user_token['refresh_token']}', this)">Copy Full Token</button>
                        </div>
                        '''
                
                html += '</div></div>'
            
            html += '''
                </div>
                <script>
                function copyToClipboard(text, button) {
                    navigator.clipboard.writeText(text).then(function() {
                        button.innerText = 'Copied!';
                        button.classList.remove('btn-primary', 'btn-secondary');
                        button.classList.add('btn-success');
                        setTimeout(function() {
                            button.innerText = 'Copy Full Token';
                            button.classList.remove('btn-success');
                            button.classList.add('btn-primary');
                        }, 2000);
                    }).catch(function() {
                        alert('Failed to copy to clipboard');
                    });
                }
                </script>
            </body>
            </html>
            '''
            
            return html
            
        except Exception as e:
            return f'<h1>Error</h1><p>{str(e)}</p>'

def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
    
    admin = Admin(app, name='SquadUp Admin', template_mode='bootstrap3')
    
    # Add custom user management view (bypasses tuple error)
    admin.add_view(CustomUserView(name='👤 Users', endpoint='users'))
    
    # Add other model views (these work fine)
    admin.add_view(SimpleGroupModelView(GamingGroup, db.session, name='👥 Gaming Groups'))
    admin.add_view(SimpleGameModelView(SteamGame, db.session, name='🎮 Steam Games'))
    admin.add_view(SimpleSessionModelView(GameSession, db.session, name='🗳️ Game Sessions'))
    admin.add_view(SimpleVoteModelView(Vote, db.session, name='📊 Votes'))
    
    # Add JWT token view
    admin.add_view(TokenView(name='🔑 JWT Tokens', endpoint='tokens'))
    
    print("✅ Flask-Admin setup complete with custom user management")
    print("👤 User management: /admin/users/")
    print("🔑 JWT tokens: /admin/tokens/")
    print("💡 This bypasses the tuple error completely!")