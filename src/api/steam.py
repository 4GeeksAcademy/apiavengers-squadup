from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User
from api.steam_service import steam_service
from api.utils import APIException

steam = Blueprint('steam', __name__)

@steam.route('/owned-games', methods=['GET'])
@jwt_required()
def get_owned_games():
    """Get user's owned Steam games (fixes 404 in loadUserGames)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user.steam_id:
            return jsonify({'error': 'Steam not connected'}), 400
        games = [g.serialize() for g in user.owned_games]
        return jsonify({'games': games})
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@steam.route('/sync-games', methods=['POST'])
@jwt_required()
def sync_games():
    """Sync user's Steam library (fixes sync button issues)"""
    try:
        user_id = get_jwt_identity()
        new_games, updated_games = steam_service.sync_user_library(user_id)
        return jsonify({
            'message': 'Library synced successfully',
            'new_games': new_games,
            'updated_games': updated_games
        })
    except APIException as e:
        return jsonify({'error': e.message}), e.status_code
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@steam.route('/common-games', methods=['POST'])
@jwt_required()
def common_games():
    """Get common games for user IDs (fixes 400 in dashboard fetchCommonGames—ensures user_ids validation)"""
    try:
        data = request.json
        user_ids = data.get('user_ids', [])
        if len(user_ids) < 2:
            return jsonify({'error': 'At least two user IDs required'}), 400
        games = steam_service.find_common_games(user_ids)
        return jsonify({'games': games})
    except APIException as e:
        return jsonify({'error': e.message}), e.status_code
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500