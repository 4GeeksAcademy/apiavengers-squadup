# src/api/steam_proxy.py - Copy this entire content

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User
from api.steam_service import steam_service
from api.utils import APIException, utc_now

steam_proxy = Blueprint('steam_proxy', __name__)

@steam_proxy.route('/status', methods=['GET'])
@jwt_required()
def get_steam_status():
    """Get comprehensive Steam status - eliminates frontend CORS issues"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Get Steam service availability
        steam_available = steam_service is not None
        api_configured = bool(steam_service and steam_service.api_key) if steam_available else False
        
        # Get user connection status
        user_connection = {
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
        
        if user.is_steam_connected:
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
            'user_connection': user_connection,
            'sync_status': sync_status,
            'server_time': utc_now().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting Steam status: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@steam_proxy.route('/health', methods=['GET'])
def steam_health():
    """Steam service health check - public endpoint"""
    try:
        health_data = {
            'steam_service': 'available' if steam_service else 'unavailable',
            'api_key': 'configured' if (steam_service and steam_service.api_key) else 'missing',
            'database': 'unknown'
        }
        
        # Test database
        try:
            from sqlalchemy import text
            db.session.execute(text('SELECT 1'))
            health_data['database'] = 'healthy'
        except:
            health_data['database'] = 'unhealthy'
        
        overall_status = 'healthy' if all(
            status in ['available', 'configured', 'healthy'] 
            for status in health_data.values()
        ) else 'degraded'
        
        return jsonify({
            'status': overall_status,
            'components': health_data,
            'timestamp': utc_now().isoformat()
        }), 200 if overall_status == 'healthy' else 503
        
    except Exception as e:
        current_app.logger.error(f"Steam health check error: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': utc_now().isoformat()
        }), 500

@steam_proxy.route('/validate-connection', methods=['POST'])
@jwt_required()
def validate_steam_connection():
    """Validate Steam connection health"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        connection_health = {
            'is_connected': user.is_steam_connected,
            'has_steam_id': bool(user.steam_id),
            'has_username': bool(user.steam_username),
            'has_avatar': bool(user.steam_avatar_url),
            'has_games': (user.total_games or 0) > 0,
            'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
        }
        
        # Determine overall health
        if connection_health['is_connected']:
            if connection_health['has_games'] and connection_health['has_username']:
                status = 'healthy'
                message = 'Steam connection is working properly'
            elif connection_health['has_username']:
                status = 'partial'
                message = 'Steam connected but no games synced'
            else:
                status = 'incomplete'
                message = 'Steam connection incomplete'
        else:
            status = 'disconnected'
            message = 'Steam account not connected'
        
        recommendations = []
        if not connection_health['is_connected']:
            recommendations.append("Connect your Steam account to access gaming features")
        elif not connection_health['has_games']:
            recommendations.append("Sync your Steam library to see your games")
        elif not connection_health['has_username']:
            recommendations.append("Steam connection may be incomplete - try reconnecting")
        else:
            recommendations.append("Your Steam connection is healthy!")
        
        return jsonify({
            'success': True,
            'status': status,
            'message': message,
            'health': connection_health,
            'recommendations': recommendations
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error validating Steam connection: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500