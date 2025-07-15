"""
Gaming-focused API routes for SquadUp
Handles group creation, game matching, and sessions
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
from collections import defaultdict  # Import for tallying votes

gaming = Blueprint('gaming', __name__)

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
        
        invite_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        
        group = GamingGroup(
            name=name,
            description=description,
            creator_id=current_user_id,
            is_public=is_public,
            max_members=max_members,
            invite_code=invite_code
        )
        
        db.session.add(group)
        db.session.flush()
        
        creator = User.query.get(current_user_id)
        group.members.append(creator)
        
        db.session.commit()
        
        return jsonify({"message": "Group created successfully", "group": group.serialize()}), 201
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/groups/join/<string:invite_code>', methods=['POST'])
@jwt_required()
def join_group_by_code(invite_code):
    """Join a gaming group using an invite code."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.filter_by(invite_code=invite_code).first()

        if not group:
            raise APIException("Group with this invite code not found", status_code=404)
        
        if user in group.members:
            return jsonify({"message": "Already a member of this group", "group": group.serialize()}), 200
        
        if len(group.members) >= group.max_members:
            raise APIException("Group is full", status_code=400)

        group.members.append(user)
        db.session.commit()
        
        return jsonify({"message": "Successfully joined group", "group": group.serialize()}), 200
            
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
        
        return jsonify({"message": "Successfully left group"}), 200
        
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
        
        user = User.query.get(current_user_id)
        if not group.is_public and user not in group.members:
            raise APIException("Access denied", status_code=403)
        
        return jsonify({"group": group.serialize()}), 200
        
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
        
        return jsonify({"groups": [group.serialize() for group in user.groups]}), 200
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

# ============================================================================
# GAME SYNERGY AND MATCHING ROUTES
# ============================================================================

@gaming.route('/groups/<int:group_id>/common-games', methods=['GET'])
@jwt_required()
def get_common_games(group_id):
    """Find common games among group members"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in group.members:
            raise APIException("Access denied", status_code=403)
        
        member_ids = [member.id for member in group.members]
        
        common_games = steam_service.find_common_games(member_ids)
        
        filters = {
            'coverage': request.args.get('coverage'),
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
                    sync_results.append({"user": member.username, "success": True, "new_games": new_games, "updated_games": updated_games})
                except Exception as e:
                    sync_results.append({"user": member.username, "success": False, "error": str(e)})
            else:
                sync_results.append({"user": member.username, "success": False, "error": "Steam not connected"})
        
        return jsonify({"message": "Group library sync completed", "results": sync_results}), 200
        
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

# ============================================================================
# GAME SESSION MANAGEMENT ROUTES
# ============================================================================

@gaming.route('/groups/<int:group_id>/quick-vote', methods=['POST'])
@jwt_required()
def start_quick_vote_session(group_id):
    """Creates a new, simple game session and returns a list of votable games."""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)

        if not group:
            raise APIException("Group not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in group.members:
            raise APIException("Access denied", status_code=403)

        session = GameSession(
            group_id=group_id,
            session_name=f"Quick Vote - {datetime.utcnow().strftime('%Y-%m-%d')}",
            status='voting'
        )
        db.session.add(session)
        db.session.commit()

        member_ids = [member.id for member in group.members]
        if len(member_ids) < 1: # Can be 1 for testing, but ideally 2
            raise APIException("Cannot start a vote in an empty group.", status_code=400)
            
        common_games = steam_service.find_common_games(member_ids)
        
        votable_games = [
            game for game in common_games 
            if (game.get('multiplayer') or game.get('co_op')) and game['ownership_stats']['coverage_percentage'] >= 50
        ][:20]

        return jsonify({
            "message": "Quick vote session started!",
            "session": session.serialize(),
            "votable_games": votable_games
        }), 201

    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/sessions/<int:session_id>/submit-votes', methods=['POST'])
@jwt_required()
def submit_votes(session_id):
    """Submits a ranked list of votes for the current user."""
    try:
        current_user_id = get_jwt_identity()
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in session.group.members:
            raise APIException("Access denied", status_code=403)
        
        if session.status != 'voting':
            raise APIException("This session is no longer open for voting.", status_code=400)
        
        data = request.get_json()
        game_ids = data.get('votes')
        
        if not isinstance(game_ids, list) or not (1 <= len(game_ids) <= 3):
            raise APIException("Invalid vote format. Please provide a list of 1 to 3 game IDs.", status_code=400)

        vote_results = json.loads(session.vote_results) if session.vote_results else {"votes": {}}
        vote_results['votes'][str(current_user_id)] = game_ids
        
        session.vote_results = json.dumps(vote_results)
        db.session.commit()
        
        return jsonify({"message": "Your votes have been submitted successfully!"}), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/sessions/<int:session_id>/results', methods=['GET'])
@jwt_required()
def get_session_results(session_id):
    """Gets the calculated results for a voting session."""
    try:
        current_user_id = get_jwt_identity()
        session = GameSession.query.get(session_id)

        if not session:
            raise APIException("Session not found", status_code=404)

        user = User.query.get(current_user_id)
        if user not in session.group.members:
            raise APIException("Access denied", status_code=403)

        if not session.vote_results:
            raise APIException("No votes have been cast for this session yet.", status_code=400)
        
        vote_data = json.loads(session.vote_results)
        if 'votes' not in vote_data or not vote_data['votes']:
            return jsonify({"winner": None, "results": []}), 200

        points_system = {0: 3, 1: 2, 2: 1}
        game_scores = defaultdict(int)

        for user_id, voted_games in vote_data['votes'].items():
            for i, game_id in enumerate(voted_games):
                if i in points_system:
                    game_scores[int(game_id)] += points_system[i]
        
        if not game_scores:
            raise APIException("Vote data was invalid.", status_code=400)

        winner_id = max(game_scores, key=game_scores.get)

        voted_game_ids = list(game_scores.keys())
        games_in_vote = SteamGame.query.filter(SteamGame.id.in_(voted_game_ids)).all()
        games_dict = {game.id: game.serialize() for game in games_in_vote}

        results = sorted(
            [{"game": games_dict.get(gid), "score": score} for gid, score in game_scores.items() if games_dict.get(gid)],
            key=lambda x: x['score'],
            reverse=True
        )

        if session.status == 'voting':
            session.status = 'completed'
            db.session.commit()

        return jsonify({"session": session.serialize(), "winner": games_dict.get(winner_id), "results": results}), 200

    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

# ============================================================================
# PUBLIC DISCOVERY AND STATS ROUTES
# ============================================================================
# These routes are for future enhancements and are not part of the core MVP loop.

@gaming.route('/public/groups', methods=['GET'])
@jwt_required()
def discover_public_groups():
    # Placeholder for future implementation
    return jsonify({"groups": []}), 200  # Add actual logic later

@gaming.route('/public/popular-games', methods=['GET'])
@jwt_required()
def get_popular_games():
    # Placeholder for future implementation
    return jsonify({"games": []}), 200  # Add actual logic later

@gaming.route('/stats/user', methods=['GET'])
@jwt_required()
def get_user_gaming_stats():
    # Placeholder for future implementation
    current_user_id = get_jwt_identity()
    return jsonify({"stats": {}}), 200  # Add actual logic later

@gaming.route('/groups/<int:group_id>/stats', methods=['GET'])
@jwt_required()
def get_group_stats(group_id):
    # Placeholder for future implementation
    return jsonify({"stats": {}}), 200  # Add actual logic later