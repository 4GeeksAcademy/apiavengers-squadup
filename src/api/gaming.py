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
from sqlalchemy import func

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
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        if user in group.members:
            raise APIException("Already a member of this group", status_code=400)
        
        if len(group.members) >= group.max_members:
            raise APIException("Group is full", status_code=400)
        
        if not group.is_public:
            data = request.get_json()
            invite_code = data.get('invite_code', '')
            if invite_code != group.invite_code:
                raise APIException("Invalid invite code", status_code=400)
        
        group.members.append(user)
        db.session.commit()
        
        return jsonify({
            "message": "Successfully joined group",
            "group": group.serialize()
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/groups/<int:group_id>/leave', methods=['POST'])
@jwt_required()
def leave_group(group_id):
    """Leave a gaming group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        if user not in group.members:
            raise APIException("Not a member of this group", status_code=400)
        
        if group.creator_id == current_user_id:
            raise APIException("Group creator cannot leave. Transfer ownership first.", status_code=400)
        
        group.members.remove(user)
        db.session.commit()
        
        return jsonify({
            "message": "Successfully left group"
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/groups/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group(group_id):
    """Get group details"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        # Check if user is member or if group is public
        user = User.query.get(current_user_id)
        if not group.is_public and user not in group.members:
            raise APIException("Access denied", status_code=403)
        
        return jsonify({
            "group": group.serialize()
        }), 200
        
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/groups', methods=['GET'])
@jwt_required()
def get_user_groups():
    """Get user's gaming groups"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        return jsonify({
            "groups": [group.serialize() for group in user.groups]
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

# ============================================================================
# GAME SYNERGY AND MATCHING ROUTES
# ============================================================================

@gaming.route('/groups/<int:group_id>/common-games', methods=['GET'])
@jwt_required()
def get_common_games(group_id):
    """Find common games among group members - THE CORE SYNERGY ENGINE"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in group.members:
            raise APIException("Access denied", status_code=403)
        
        # Get all member IDs
        member_ids = [member.id for member in group.members]
        
        # Get common games using steam service
        common_games = steam_service.find_common_games(member_ids)
        
        # Apply filters from query parameters
        filters = {
            'coverage': request.args.get('coverage'),  # all, most, some, few
            'multiplayer_only': request.args.get('multiplayer') == 'true',
            'genres': request.args.getlist('genres'),
            'min_players': request.args.get('min_players')
        }
        
        filtered_games = steam_service.filter_games(common_games, filters)
        
        return jsonify({
            "games": filtered_games,
            "group_size": len(group.members),
            "total_unique_games": len(common_games),
            "filtered_count": len(filtered_games),
            "filters_applied": filters
        }), 200
        
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/groups/<int:group_id>/sync-all', methods=['POST'])
@jwt_required()
def sync_all_group_libraries(group_id):
    """Sync Steam libraries for all group members"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        if group.creator_id != current_user_id:
            raise APIException("Only group creator can sync all libraries", status_code=403)
        
        sync_results = []
        
        for member in group.members:
            if member.is_steam_connected:
                try:
                    new_games, updated_games = steam_service.sync_user_library(member.id)
                    sync_results.append({
                        "user": member.username,
                        "success": True,
                        "new_games": new_games,
                        "updated_games": updated_games
                    })
                except Exception as e:
                    sync_results.append({
                        "user": member.username,
                        "success": False,
                        "error": str(e)
                    })
            else:
                sync_results.append({
                    "user": member.username,
                    "success": False,
                    "error": "Steam not connected"
                })
        
        return jsonify({
            "message": "Group library sync completed",
            "results": sync_results
        }), 200
        
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

# ============================================================================
# GAME SESSION MANAGEMENT ROUTES
# ============================================================================

@gaming.route('/groups/<int:group_id>/sessions', methods=['POST'])
@jwt_required()
def create_game_session(group_id):
    """Create a new game voting session"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in group.members:
            raise APIException("Access denied", status_code=403)
        
        data = request.get_json()
        session_name = data.get('session_name', '').strip()
        description = data.get('description', '').strip()
        
        if not session_name:
            raise APIException("Session name is required", status_code=400)
        
        # Create session
        session = GameSession(
            group_id=group_id,
            session_name=session_name,
            description=description,
            status='planning'
        )
        
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            "message": "Game session created successfully",
            "session": session.serialize()
        }), 201
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/sessions/<int:session_id>/vote', methods=['POST'])
@jwt_required()
def vote_for_game(session_id):
    """Vote for a game in a session"""
    try:
        current_user_id = get_jwt_identity()
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in session.group.members:
            raise APIException("Access denied", status_code=403)
        
        if session.status != 'voting':
            raise APIException("Session is not in voting phase", status_code=400)
        
        data = request.get_json()
        game_id = data.get('game_id')
        
        if not game_id:
            raise APIException("Game ID is required", status_code=400)
        
        # Load existing votes
        vote_results = json.loads(session.vote_results) if session.vote_results else {}
        
        # Initialize votes if needed
        if 'votes' not in vote_results:
            vote_results['votes'] = {}
        
        # Record vote
        vote_results['votes'][str(current_user_id)] = game_id
        
        # Update session
        session.vote_results = json.dumps(vote_results)
        db.session.commit()
        
        return jsonify({
            "message": "Vote recorded successfully",
            "session": session.serialize()
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/groups/<int:group_id>/sessions', methods=['GET'])
@jwt_required()
def get_group_sessions(group_id):
    """Get all sessions for a group"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in group.members:
            raise APIException("Access denied", status_code=403)
        
        sessions = GameSession.query.filter_by(group_id=group_id).order_by(GameSession.created_at.desc()).all()
        
        return jsonify({
            "sessions": [session.serialize() for session in sessions]
        }), 200
        
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

# ============================================================================
# PUBLIC DISCOVERY ROUTES
# ============================================================================

@gaming.route('/public/groups', methods=['GET'])
@jwt_required()
def discover_public_groups():
    """Discover public gaming groups"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        search = request.args.get('search', '')
        
        query = GamingGroup.query.filter_by(is_public=True)
        
        if search:
            query = query.filter(GamingGroup.name.ilike(f'%{search}%'))
        
        # Paginate
        groups = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            "groups": [group.serialize() for group in groups.items],
            "page": page,
            "per_page": per_page,
            "total": groups.total,
            "pages": groups.pages
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/public/popular-games', methods=['GET'])
@jwt_required()
def get_popular_games():
    """Get most popular games across all users"""
    try:
        # Query to get games ordered by owner count
        popular_games = db.session.query(
            SteamGame,
            func.count(SteamGame.owners).label('owner_count')
        ).join(
            SteamGame.owners
        ).group_by(
            SteamGame.id
        ).order_by(
            func.count(SteamGame.owners).desc()
        ).limit(50).all()
        
        games_list = []
        for game, owner_count in popular_games:
            game_data = game.serialize()
            game_data['popularity_rank'] = len(games_list) + 1
            game_data['total_owners'] = owner_count
            games_list.append(game_data)
        
        return jsonify({
            "popular_games": games_list
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

# ============================================================================
# GAME STATISTICS AND ANALYTICS
# ============================================================================

@gaming.route('/stats/user', methods=['GET'])
@jwt_required()
def get_user_gaming_stats():
    """Get user's gaming statistics"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Get basic stats
        total_games = len(user.owned_games)
        total_groups = len(user.groups)
        created_groups = len(user.created_groups)
        
        # Get session participation
        sessions_participated = GameSession.query.join(GamingGroup).join(
            GamingGroup.members
        ).filter(User.id == current_user_id).count()
        
        return jsonify({
            "user_stats": {
                "total_games": total_games,
                "total_groups": total_groups,
                "created_groups": created_groups,
                "sessions_participated": sessions_participated,
                "steam_connected": user.is_steam_connected,
                "last_library_sync": user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/groups/<int:group_id>/stats', methods=['GET'])
@jwt_required()
def get_group_stats(group_id):
    """Get group gaming statistics"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in group.members:
            raise APIException("Access denied", status_code=403)
        
        # Get common games stats
        member_ids = [member.id for member in group.members]
        if len(member_ids) > 1:
            common_games = steam_service.find_common_games(member_ids)
            total_common = len(common_games)
            all_ownership = len([g for g in common_games if g['coverage_level'] == 'all'])
            most_ownership = len([g for g in common_games if g['coverage_level'] == 'most'])
        else:
            total_common = 0
            all_ownership = 0
            most_ownership = 0
        
        # Get session stats
        total_sessions = GameSession.query.filter_by(group_id=group_id).count()
        active_sessions = GameSession.query.filter_by(group_id=group_id, status='active').count()
        
        return jsonify({
            "group_stats": {
                "member_count": len(group.members),
                "total_common_games": total_common,
                "all_members_own": all_ownership,
                "most_members_own": most_ownership,
                "total_sessions": total_sessions,
                "active_sessions": active_sessions,
                "created_at": group.created_at.isoformat()
            }
        }), 200
        
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500