from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, SteamGame
from api.steam_service import steam_service
from api.utils import APIException
from sqlalchemy import text

steam = Blueprint('steam', __name__)

@steam.route('/owned-games', methods=['GET'])
@jwt_required()
def get_owned_games():
    """Get user's owned Steam games - FIXED VERSION"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if not user.steam_id:
            return jsonify({'error': 'Steam not connected'}), 400
        
        print(f"🔍 Loading games for user {user_id}")
        
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
            except:
                game_data['genres'] = []
                
            try:
                import json
                game_data['categories'] = json.loads(row.categories) if row.categories else []
            except:
                game_data['categories'] = []
            
            games.append(game_data)
        
        print(f"✅ Loaded {len(games)} games for user {user_id}")
        
        return jsonify({
            'games': games,
            'total': len(games),
            'steam_connected': user.is_steam_connected,
            'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_owned_games: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

@steam.route('/sync-games', methods=['POST'])
@jwt_required()
def sync_games():
    """Sync user's Steam library - FIXED VERSION"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if not user.steam_id:
            return jsonify({'error': 'Steam not connected'}), 400
        
        print(f"🔄 Starting manual sync for user {user_id}")
        
        # Use steam_service to sync
        new_games, updated_games = steam_service.sync_user_library(user_id)
        
        return jsonify({
            'success': True,
            'message': f'Library synced successfully! Added {new_games} new games, updated {updated_games} games.',
            'new_games': new_games,
            'updated_games': updated_games
        }), 200
        
    except APIException as e:
        print(f"❌ API Exception in sync_games: {e.message}")
        return jsonify({'error': e.message}), e.status_code
    except Exception as e:
        print(f"❌ Error in sync_games: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

@steam.route('/common-games', methods=['POST'])
@jwt_required()
def common_games():
    """Get common games for user IDs - FIXED VERSION"""
    try:
        data = request.json
        user_ids = data.get('user_ids', [])
        
        if len(user_ids) < 2:
            return jsonify({'error': 'At least two user IDs required'}), 400
        
        # Validate that all users exist and have Steam connected
        users = User.query.filter(User.id.in_(user_ids)).all()
        if len(users) != len(user_ids):
            return jsonify({'error': 'One or more users not found'}), 404
        
        steam_connected_users = [u for u in users if u.is_steam_connected]
        if len(steam_connected_users) < 2:
            return jsonify({'error': 'At least two users must have Steam connected'}), 400
        
        # Use steam_service to find common games
        games = steam_service.find_common_games(user_ids)
        
        return jsonify({
            'games': games,
            'total_users': len(user_ids),
            'steam_connected_users': len(steam_connected_users),
            'common_games_count': len([g for g in games if g.get('is_common', False)])
        }), 200
        
    except APIException as e:
        return jsonify({'error': e.message}), e.status_code
    except Exception as e:
        print(f"Error in common_games: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ============================================================================
# DEBUG ROUTES - COMMENTED OUT FOR PRODUCTION
# ============================================================================

# @steam.route('/force-sync/<int:user_id>', methods=['POST'])
# @jwt_required()
# def force_sync(user_id):
#     """Force sync with detailed logging - DEBUG ROUTE"""
#     # ... (debug code commented out)

# @steam.route('/debug-steam-api/<steam_id>', methods=['GET'])
# @jwt_required()
# def debug_steam_api(steam_id):
#     """Debug Steam API calls"""
#     # ... (debug code commented out)

# @steam.route('/debug-user-games/<int:user_id>', methods=['GET'])
# @jwt_required()
# def debug_user_games(user_id):
#     """Debug endpoint to check user's games in database"""
#     # ... (debug code commented out)

@steam.route('/game-details/<int:app_id>', methods=['GET'])
@jwt_required()
def get_game_details(app_id):
    """Get detailed information about a specific game"""
    try:
        if not steam_service:
            return jsonify({'error': 'Steam service not available'}), 503
        
        details = steam_service.get_game_details(app_id)
        
        if not details:
            return jsonify({'error': 'Game not found'}), 404
        
        return jsonify(details), 200
        
    except Exception as e:
        print(f"Error getting game details for {app_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@steam.route('/user-profile', methods=['GET'])
@jwt_required()
def get_steam_profile():
    """Get user's Steam profile information"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if not user.steam_id:
            return jsonify({'error': 'Steam not connected'}), 400
        
        # Get fresh profile data from Steam API
        if steam_service:
            try:
                profile = steam_service.get_user_profile(user.steam_id)
                return jsonify({
                    'steam_profile': profile,
                    'cached_data': {
                        'steam_username': user.steam_username,
                        'steam_avatar_url': user.steam_avatar_url,
                        'steam_profile_url': user.steam_profile_url,
                        'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
                    }
                }), 200
            except Exception as e:
                # Fall back to cached data if API fails
                return jsonify({
                    'cached_data': {
                        'steam_username': user.steam_username,
                        'steam_avatar_url': user.steam_avatar_url,
                        'steam_profile_url': user.steam_profile_url,
                        'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
                    },
                    'api_error': str(e)
                }), 200
        else:
            return jsonify({'error': 'Steam service not available'}), 503
        
    except Exception as e:
        print(f"Error getting Steam profile: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500