# src/api/steam_status.py - Steam Status Proxy Endpoint
from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import User
from api.steam_service import steam_service
from api.utils import utc_now

steam_status = Blueprint('steam_status', __name__)

@steam_status.route('/status', methods=['GET'])
@jwt_required()
def get_comprehensive_steam_status():
    """Get comprehensive Steam status for frontend"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get Steam service status
        steam_available = steam_service is not None
        api_configured = bool(steam_service and steam_service.api_key) if steam_available else False
        
        # Get user Steam connection status
        user_status = {
            'connected': user.is_steam_connected,
            'steam_id': user.steam_id if user.is_steam_connected else None,
            'steam_username': user.steam_username if user.is_steam_connected else None,
            'steam_avatar_url': user.steam_avatar_url if user.is_steam_connected else None,
            'total_games': user.total_games if user.is_steam_connected else 0,
            'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
        }
        
        # Get sync status
        sync_status = {
            'can_sync': False,
            'cooldown_remaining': 0,
            'message': 'Steam not connected'
        }
        
        if user.is_steam_connected and steam_service:
            can_sync, message = user.can_sync_steam()
            cooldown_remaining = user.steam_sync_cooldown_remaining()
            
            sync_status = {
                'can_sync': can_sync,
                'cooldown_remaining': cooldown_remaining,
                'message': message,
                'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
            }
        
        return jsonify({
            'success': True,
            'steam_service': {
                'available': steam_available,
                'api_configured': api_configured,
                'status': 'operational' if steam_available and api_configured else 'limited'
            },
            'user_connection': user_status,
            'sync_status': sync_status,
            'timestamp': utc_now().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting Steam status: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
