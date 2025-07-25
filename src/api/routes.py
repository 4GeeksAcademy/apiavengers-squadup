# src/api/routes.py - Main API routes with proper JWT configuration

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from api.models import db, User, GamingGroup, GameSession, SteamGame
from api.utils import APIException, utc_now
from sqlalchemy import func

api = Blueprint('api', __name__)

# ============================================================================
# JWT ERROR HANDLERS
# ============================================================================

@api.errorhandler(401)
def handle_unauthorized(error):
    """Handle 401 errors consistently"""
    return jsonify({
        'success': False,
        'error': 'Authentication required',
        'code': 'TOKEN_REQUIRED'
    }), 401

@api.errorhandler(422)
def handle_jwt_error(error):
    """Handle JWT validation errors"""
    return jsonify({
        'success': False,
        'error': 'Invalid or expired token',
        'code': 'TOKEN_INVALID'
    }), 422

# ============================================================================
# HELPER FUNCTION FOR JWT VALIDATION
# ============================================================================

def get_current_user():
    """Get current user with proper error handling"""
    try:
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            raise APIException('User not found', 404)
        return user
    except Exception as e:
        current_app.logger.error(f"JWT validation error: {str(e)}")
        raise APIException('Authentication failed', 401)

# ============================================================================
# PUBLIC ENDPOINTS
# ============================================================================

@api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'API is running',
        'timestamp': utc_now().isoformat()
    }), 200

@api.route('/status', methods=['GET'])
def api_status():
    """API status endpoint with basic stats"""
    try:
        total_users = db.session.query(func.count(User.id)).scalar()
        total_groups = db.session.query(func.count(GamingGroup.id)).scalar()
        total_sessions = db.session.query(func.count(GameSession.id)).scalar()
        total_games = db.session.query(func.count(SteamGame.id)).scalar()
        
        return jsonify({
            'success': True,
            'status': 'operational',
            'stats': {
                'total_users': total_users,
                'total_groups': total_groups,
                'total_sessions': total_sessions,
                'total_games': total_games
            },
            'timestamp': utc_now().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting API status: {str(e)}")
        return jsonify({
            'success': False,
            'status': 'degraded',
            'error': 'Database connection issue'
        }), 500

# ============================================================================
# PROTECTED ENDPOINTS
# ============================================================================

@api.route('/me', methods=['GET'])
@jwt_required()
def get_current_user_info():
    """Get current user information"""
    try:
        user = get_current_user()
        
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'avatar_url': user.avatar_url or user.steam_avatar_url,
            'steam_connected': user.steam_connected or user.is_steam_connected,
            'steam_id': user.steam_id,
            'total_games': user.total_games or 0,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'groups_count': len(user.groups) if user.groups else 0,
            'is_admin': getattr(user, 'is_admin', False)
        }
        
        return jsonify({
            'success': True,
            'user': user_data
        }), 200
        
    except APIException as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Error getting user info: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@api.route('/me', methods=['PUT'])
@jwt_required()
def update_current_user():
    """Update current user information"""
    try:
        user = get_current_user()
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Update allowed fields
        if 'username' in data:
            username = data['username'].strip()
            if username and username != user.username:
                # Check if username is already taken
                existing_user = User.query.filter_by(username=username).first()
                if existing_user and existing_user.id != user.id:
                    return jsonify({'success': False, 'error': 'Username already taken'}), 400
                user.username = username
        
        if 'email' in data:
            email = data['email'].strip()
            if email and email != user.email:
                # Check if email is already taken
                existing_user = User.query.filter_by(email=email).first()
                if existing_user and existing_user.id != user.id:
                    return jsonify({'success': False, 'error': 'Email already taken'}), 400
                user.email = email
        
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']
        
        db.session.commit()
        
        updated_user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'avatar_url': user.avatar_url or user.steam_avatar_url,
            'steam_connected': user.steam_connected or user.is_steam_connected,
            'steam_id': user.steam_id,
            'total_games': user.total_games or 0
        }
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': updated_user_data
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating user: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@api.route('/me/stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    """Get current user's statistics"""
    try:
        user = get_current_user()
        
        # Calculate user statistics
        groups_created = db.session.query(func.count(GamingGroup.id)).filter_by(creator_id=user.id).scalar()
        groups_member = len(user.groups) if user.groups else 0
        sessions_created = db.session.query(func.count(GameSession.id)).filter_by(creator_id=user.id).scalar()
        
        stats = {
            'groups_created': groups_created,
            'groups_member': groups_member,
            'sessions_created': sessions_created,
            'total_games': user.total_games or 0,
            'steam_connected': user.steam_connected or user.is_steam_connected,
            'account_age_days': (utc_now() - user.created_at).days if user.created_at else 0
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
        
    except APIException as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Error getting user stats: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@api.route('/search/users', methods=['GET'])
@jwt_required()
def search_users():
    """Search for users"""
    try:
        user = get_current_user()
        
        query = request.args.get('q', '').strip()
        if not query or len(query) < 2:
            return jsonify({
                'success': False,
                'error': 'Search query must be at least 2 characters'
            }), 400
        
        # Search users by username (exclude current user)
        users = User.query.filter(
            User.username.ilike(f'%{query}%'),
            User.id != user.id
        ).limit(20).all()
        
        user_results = []
        for found_user in users:
            user_data = {
                'id': found_user.id,
                'username': found_user.username,
                'avatar_url': found_user.avatar_url or found_user.steam_avatar_url,
                'steam_connected': found_user.steam_connected or found_user.is_steam_connected,
                'total_games': found_user.total_games or 0
            }
            user_results.append(user_data)
        
        return jsonify({
            'success': True,
            'users': user_results,
            'count': len(user_results),
            'query': query
        }), 200
        
    except APIException as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Error searching users: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@api.route('/search/games', methods=['GET'])
@jwt_required()
def search_games():
    """Search for games"""
    try:
        user = get_current_user()
        
        query = request.args.get('q', '').strip()
        if not query or len(query) < 2:
            return jsonify({
                'success': False,
                'error': 'Search query must be at least 2 characters'
            }), 400
        
        # Search games by name
        games = SteamGame.query.filter(
            SteamGame.name.ilike(f'%{query}%')
        ).limit(20).all()
        
        game_results = []
        for game in games:
            game_data = game.serialize()
            # Add whether current user owns this game
            if user.games:
                game_data['user_owns'] = game in user.games
            else:
                game_data['user_owns'] = False
            game_results.append(game_data)
        
        return jsonify({
            'success': True,
            'games': game_results,
            'count': len(game_results),
            'query': query
        }), 200
        
    except APIException as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Error searching games: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@api.route('/admin/stats', methods=['GET'])
@jwt_required()
def get_admin_stats():
    """Get admin statistics - REQUIRES ADMIN ACCESS"""
    try:
        user = get_current_user()
        
        # Check if user has admin privileges
        if not getattr(user, 'is_admin', False):
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        # Get comprehensive statistics
        stats = {
            'users': {
                'total': db.session.query(func.count(User.id)).scalar(),
                'steam_connected': db.session.query(func.count(User.id)).filter(
                    (User.steam_connected == True) | (User.is_steam_connected == True)
                ).scalar(),
                'active_today': 0  # Would need last_active field to implement
            },
            'groups': {
                'total': db.session.query(func.count(GamingGroup.id)).scalar(),
                'public': db.session.query(func.count(GamingGroup.id)).filter_by(is_public=True).scalar(),
                'private': db.session.query(func.count(GamingGroup.id)).filter_by(is_public=False).scalar()
            },
            'sessions': {
                'total': db.session.query(func.count(GameSession.id)).scalar(),
                'active': db.session.query(func.count(GameSession.id)).filter(
                    GameSession.status.in_(['planning', 'voting'])
                ).scalar(),
                'completed': db.session.query(func.count(GameSession.id)).filter_by(status='completed').scalar()
            },
            'games': {
                'total': db.session.query(func.count(SteamGame.id)).scalar(),
                'multiplayer': db.session.query(func.count(SteamGame.id)).filter_by(multiplayer=True).scalar(),
                'co_op': db.session.query(func.count(SteamGame.id)).filter_by(co_op=True).scalar()
            }
        }
        
        return jsonify({
            'success': True,
            'stats': stats,
            'timestamp': utc_now().isoformat()
        }), 200
        
    except APIException as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Error getting admin stats: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500