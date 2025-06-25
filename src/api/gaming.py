"""
Gaming-focused API routes for SquadUp
Handles Steam integration, group creation, and game matching
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, SteamGame, GamingGroup, GameSession
from api.steam_service import steam_service
from api.utils import APIException
import secrets
import string
import json
from datetime import datetime

gaming = Blueprint('gaming', __name__)

# ============================================================================
# STEAM INTEGRATION ROUTES
# ============================================================================

@gaming.route('/steam/connect', methods=['POST'])
@jwt_required()
def connect_steam():
    """Connect user's Steam account"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        steam_id = data.get('steam_id')
        if not steam_id:
            raise APIException("Steam ID is required", status_code=400)
        
        # Validate Steam ID format (64-bit)
        try:
            steam_id_int = int(steam_id)
            if steam_id_int < 76561197960265729:  # Minimum Steam ID64
                raise ValueError()
        except ValueError:
            raise APIException("Invalid Steam ID format", status_code=400)
        
        success = steam_service.connect_user_steam(current_user_id, steam_id)
        
        if success:
            return jsonify({
                "message": "Steam account connected successfully",
                "steam_id": steam_id
            }), 200
        else:
            raise APIException("Failed to connect Steam account", status_code=500)
            
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/steam/sync-library', methods=['POST'])
@jwt_required()
def sync_steam_library():
    """Sync user's Steam game library"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user.is_steam_connected:
            raise APIException("Steam account not connected", status_code=400)
        
        new_games, updated_games = steam_service.sync_user_library(current_user_id)
        
        return jsonify({
            "message": "Library synced successfully",
            "new_games": new_games,
            "updated_games": updated_games,
            "total_games": len(user.owned_games)
        }), 200
        
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/steam/library', methods=['GET'])
@jwt_required()
def get_user_library():
    """Get user's Steam game library"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user.is_steam_connected:
            raise APIException("Steam account not connected", status_code=400)
        
        # Get query parameters for filtering
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        search = request.args.get('search', '')
        
        # Build query
        query = user.owned_games
        
        if search:
            query = [game for game in query if search.lower() in game.name.lower()]
        
        # Paginate results
        start = (page - 1) * per_page
        end = start + per_page
        games = query[start:end]
        
        return jsonify({
            "games": [game.serialize() for game in games],
            "total": len(user.owned_games),
            "page": page,
            "per_page": per_page,
            "last_synced": user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
        }), 200
        
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

# ============================================================================
# GROUP MANAGEMENT ROUTES
# ============================================================================

@gaming.route('/groups', methods=['POST'])
@jwt_required()
def create_group():
    """Create a new gaming group"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        is_public = data.get('is_public', False)
        max_members = data.get('max_members', 10)
        
        if not name:
            raise APIException("Group name is required", status_code=400)
        
        if len(name) > 100:
            raise APIException("Group name too long", status_code=400)
        
        # Generate unique invite code
        invite_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        
        # Create group
        group = GamingGroup(
            name=name,
            description=description,
            creator_id=current_user_id,
            is_public=is_public,
            max_members=max_members,
            invite_code=invite_code
        )
        
        db.session.add(group)
        db.session.flush()  # Get the group ID
        
        # Add creator as the first member
        creator = User.query.get(current_user_id)
        group.members.append(creator)
        
        db.session.commit()
        
        return jsonify({
            "message": "Group created successfully",
            "group": group.serialize()
        }), 201
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/groups/<int:group_id>/join', methods=['POST'])
@jwt_required()
def join_group(group_id):
    """Join a gaming group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.