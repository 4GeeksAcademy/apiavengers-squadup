# src/api/steam.py - Enhanced with rate limiting and better error handling

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, SteamGame
from api.steam_service import steam_service
from api.utils import APIException
from sqlalchemy import text
from datetime import datetime  # <-- ADD THIS IMPORT

steam = Blueprint('steam', __name__)

def get_limiter():
    """Get the limiter instance from the main app"""
    return getattr(current_app, 'limiter', None)

@steam.route('/owned-games', methods=['GET'])
@jwt_required()
def get_owned_games():
    """Get user's owned Steam games with enhanced error handling"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if not user.steam_id:
            return jsonify({
                'error': 'Steam not connected',
                'message': 'Please connect your Steam account first to view your games',
                'games': [],
                'total': 0
            }), 400
        
        current_app.logger.info(f"Loading games for user {user.username}")
        
        # Get games using raw SQL for reliability
        result = db.session.execute(
            text("""
                SELECT sg.*, ug.hours_played, ug.last_played, ug.added_at
                FROM steam_game sg
                JOIN user_games ug ON sg.id = ug.game_id
                WHERE ug.user_id = :user_id
                ORDER BY sg.name
            """),
            {'user_id': user_id}
        )
        
        games = []
        for row in result:
            game_data = {
                'id': row.id,
                'steam_appid': row.steam_appid,
                'name': row.name,
                'short_description': row.short_description,
                'header_image': row.header_image,
                'website': row.website,
                'genres': row.genres,
                'categories': row.categories,
                'multiplayer': row.multiplayer,
                'co_op': row.co_op,
                'max_players': row.max_players,
                'min_players': row.min_players,
                'price': row.price,
                'release_date': row.release_date.isoformat() if row.release_date else None,
                'hours_played': row.hours_played or 0,
                'playtime_forever': row.hours_played or 0,  # Steam API compatibility
                'last_played': row.last_played.isoformat() if row.last_played else None,
                'added_at': row.added_at.isoformat() if row.added_at else None
            }
            
            # Parse JSON fields safely
            try:
                import json
                game_data['genres'] = json.loads(row.genres) if row.genres else []
                game_data['categories'] = json.loads(row.categories) if row.categories else []
            except (json.JSONDecodeError, TypeError):
                game_data['genres'] = []
                game_data['categories'] = []
            
            games.append(game_data)
        
        current_app.logger.info(f"Loaded {len(games)} games for user {user.username}")
        
        return jsonify({
            'success': True,
            'games': games,
            'total': len(games),
            'steam_connected': user.is_steam_connected,
            'steam_username': user.steam_username,
            'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in get_owned_games: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': 'Failed to load game library. Please try again later.'
        }), 500

@steam.route('/sync-games', methods=['POST'])
@jwt_required()
def sync_games():
    """Sync user's Steam library with rate limiting"""
    limiter = get_limiter()
    if limiter:
        # Rate limit sync to prevent spam - 2 syncs per minute
        limiter.limit("2 per minute")(lambda: None)()
    
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if not user.steam_id:
            return jsonify({
                'error': 'Steam not connected',
                'message': 'Please connect your Steam account first'
            }), 400
        
        current_app.logger.info(f"Starting manual sync for user {user.username}")
        
        # Check if user synced recently (prevent excessive API calls)
        if user.steam_library_synced_at:
            from datetime import timedelta
            if datetime.utcnow() - user.steam_library_synced_at < timedelta(minutes=5):
                return jsonify({
                    'success': False,
                    'error': 'Recently synced',
                    'message': 'Please wait a few minutes before syncing again',
                    'last_synced': user.steam_library_synced_at.isoformat()
                }), 429
        
        # Use steam_service to sync
        new_games, updated_games = steam_service.sync_user_library(user_id)
        
        return jsonify({
            'success': True,
            'message': f'Library synced successfully! Added {new_games} new games, updated {updated_games} games.',
            'new_games': new_games,
            'updated_games': updated_games,
            'total_games': new_games + updated_games
        }), 200
        
    except APIException as e:
        current_app.logger.error(f"API Exception in sync_games: {e.message}")
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Error in sync_games: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': 'Failed to sync Steam library. Please try again later.'
        }), 500

@steam.route('/common-games', methods=['POST'])
@jwt_required()
def common_games():
    """Get common games for user IDs with enhanced validation"""
    try:
        data = request.json
        user_ids = data.get('user_ids', [])
        
        # Enhanced validation
        if not isinstance(user_ids, list):
            return jsonify({'error': 'user_ids must be a list'}), 400
        
        if len(user_ids) < 2:
            return jsonify({'error': 'At least two user IDs required'}), 400
        
        if len(user_ids) > 50:  # Prevent excessive queries
            return jsonify({'error': 'Too many user IDs (maximum 50)'}), 400
        
        # Validate that all user IDs are integers
        try:
            user_ids = [int(uid) for uid in user_ids]
        except (ValueError, TypeError):
            return jsonify({'error': 'All user IDs must be valid integers'}), 400
        
        # Validate that all users exist and have Steam connected
        users = User.query.filter(User.id.in_(user_ids)).all()
        if len(users) != len(user_ids):
            return jsonify({'error': 'One or more users not found'}), 404
        
        steam_connected_users = [u for u in users if u.is_steam_connected]
        if len(steam_connected_users) < 2:
            return jsonify({
                'error': 'At least two users must have Steam connected',
                'steam_connected_count': len(steam_connected_users),
                'total_users': len(users)
            }), 400
        
        current_app.logger.info(f"Finding common games for {len(steam_connected_users)} Steam-connected users")
        
        # Use steam_service to find common games
        games = steam_service.find_common_games(user_ids)
        
        return jsonify({
            'success': True,
            'games': games,
            'total_users': len(user_ids),
            'steam_connected_users': len(steam_connected_users),
            'common_games_count': len([g for g in games if g.get('is_common', False)]),
            'metadata': {
                'generated_at': datetime.utcnow().isoformat(),
                'user_list': [{'id': u.id, 'username': u.username, 'steam_connected': u.is_steam_connected} for u in users]
            }
        }), 200
        
    except APIException as e:
        return jsonify({'success': False, 'error': e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Error in common_games: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': 'Failed to find common games. Please try again later.'
        }), 500

@steam.route('/game-details/<int:app_id>', methods=['GET'])
@jwt_required()
def get_game_details(app_id):
    """Get detailed information about a specific game with caching"""
    limiter = get_limiter()
    if limiter:
        # Rate limit game details to prevent Steam API abuse
        limiter.limit("30 per minute")(lambda: None)()
    
    try:
        if not steam_service:
            return jsonify({
                'error': 'Steam service not available',
                'message': 'Steam integration is currently unavailable'
            }), 503
        
        # Validate app_id
        if app_id <= 0:
            return jsonify({'error': 'Invalid Steam app ID'}), 400
        
        current_app.logger.info(f"Fetching details for Steam app {app_id}")
        
        # Check if we already have this game in our database
        existing_game = SteamGame.query.filter_by(steam_appid=app_id).first()
        if existing_game:
            return jsonify({
                'success': True,
                'game': existing_game.serialize(),
                'source': 'database'
            }), 200
        
        # Fetch from Steam API
        details = steam_service.get_game_details(app_id)
        
        if not details:
            return jsonify({
                'error': 'Game not found',
                'message': f'No game found with Steam app ID {app_id}'
            }), 404
        
        return jsonify({
            'success': True,
            'game': details,
            'source': 'steam_api'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting game details for {app_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': 'Failed to fetch game details. Please try again later.'
        }), 500

@steam.route('/user-profile', methods=['GET'])
@jwt_required()
def get_steam_profile():
    """Get user's Steam profile information with enhanced error handling"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if not user.steam_id:
            return jsonify({
                'error': 'Steam not connected',
                'message': 'Please connect your Steam account first',
                'cached_data': None
            }), 400
        
        # Get fresh profile data from Steam API
        if steam_service:
            try:
                profile = steam_service.get_user_profile(user.steam_id)
                
                # Update user data if we got fresh info
                if profile:
                    user.steam_username = profile.get('personaname', user.steam_username)
                    user.steam_avatar_url = profile.get('avatarfull', user.steam_avatar_url)
                    user.steam_profile_url = profile.get('profileurl', user.steam_profile_url)
                    db.session.commit()
                
                return jsonify({
                    'success': True,
                    'steam_profile': profile,
                    'cached_data': {
                        'steam_username': user.steam_username,
                        'steam_avatar_url': user.steam_avatar_url,
                        'steam_profile_url': user.steam_profile_url,
                        'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
                    }
                }), 200
            except Exception as e:
                current_app.logger.warning(f"Steam API call failed for profile, using cached data: {str(e)}")
                # Fall back to cached data if API fails
                return jsonify({
                    'success': True,
                    'steam_profile': None,
                    'cached_data': {
                        'steam_username': user.steam_username,
                        'steam_avatar_url': user.steam_avatar_url,
                        'steam_profile_url': user.steam_profile_url,
                        'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
                    },
                    'api_error': 'Steam API temporarily unavailable'
                }), 200
        else:
            return jsonify({
                'error': 'Steam service not available',
                'message': 'Steam integration is currently unavailable'
            }), 503
        
    except Exception as e:
        current_app.logger.error(f"Error getting Steam profile: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': 'Failed to fetch Steam profile. Please try again later.'
        }), 500

@steam.route('/status', methods=['GET'])
@jwt_required()
def steam_status():
    """Get Steam service status and user's connection info"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check Steam service availability
        steam_available = steam_service is not None
        api_key_configured = bool(steam_service and steam_service.api_key) if steam_available else False
        
        return jsonify({
            'success': True,
            'steam_service': {
                'available': steam_available,
                'api_key_configured': api_key_configured,
                'status': 'operational' if steam_available and api_key_configured else 'limited'
            },
            'user_connection': {
                'connected': user.is_steam_connected,
                'steam_id': user.steam_id if user.is_steam_connected else None,
                'steam_username': user.steam_username if user.is_steam_connected else None,
                'total_games': user.total_games if user.is_steam_connected else 0,
                'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting Steam status: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

# Health check endpoint specifically for Steam integration
@steam.route('/health', methods=['GET'])
def steam_health():
    """Steam service health check"""
    try:
        health_status = {
            'steam_service': 'available' if steam_service else 'unavailable',
            'api_key': 'configured' if (steam_service and steam_service.api_key) else 'missing',
            'database': 'unknown'
        }
        
        # Test database connection
        try:
            db.session.execute('SELECT 1')
            health_status['database'] = 'healthy'
        except Exception:
            health_status['database'] = 'unhealthy'
        
        # Test Steam API if available
        if steam_service and steam_service.api_key:
            try:
                # Quick test - get details for a known game (e.g., Counter-Strike)
                test_result = steam_service.get_game_details(730)
                health_status['steam_api'] = 'responding' if test_result else 'not_responding'
            except Exception:
                health_status['steam_api'] = 'error'
        else:
            health_status['steam_api'] = 'not_configured'
        
        overall_status = 'healthy' if all(
            status in ['available', 'configured', 'healthy', 'responding'] 
            for status in health_status.values()
        ) else 'degraded'
        
        return jsonify({
            'status': overall_status,
            'components': health_status,
            'timestamp': datetime.utcnow().isoformat()
        }), 200 if overall_status == 'healthy' else 503
        
    except Exception as e:
        current_app.logger.error(f"Steam health check error: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500