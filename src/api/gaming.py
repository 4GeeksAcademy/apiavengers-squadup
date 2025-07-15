"""
Gaming-focused API routes for SquadUp - ENHANCED VERSION
Handles group creation, game matching, sessions, and group management
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
from collections import defaultdict

gaming = Blueprint('gaming', __name__)

# ============================================================================
# GROUP MANAGEMENT ROUTES - ENHANCED
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
    """Leave a gaming group - ENHANCED VERSION"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        if user not in group.members:
            raise APIException("Not a member of this group", status_code=400)
        
        # Check if user is the creator
        if group.creator_id == current_user_id:
            # If creator is leaving, handle group ownership
            remaining_members = [m for m in group.members if m.id != current_user_id]
            
            if remaining_members:
                # Transfer ownership to the next member (oldest member by join date)
                new_creator = remaining_members[0]  # Simple: first remaining member
                group.creator_id = new_creator.id
                print(f"🔄 Group ownership transferred from {user.username} to {new_creator.username}")
            else:
                # If no remaining members, delete the group
                print(f"🗑️ Deleting empty group: {group.name}")
                db.session.delete(group)
                db.session.commit()
                return jsonify({"message": "Group deleted as last member left"}), 200
        
        # Remove user from group
        group.members.remove(user)
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully left group {group.name}",
            "group_deleted": False
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"Error leaving group: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/groups/<int:group_id>/delete', methods=['DELETE'])
@jwt_required()
def delete_group(group_id):
    """Delete a gaming group (creator only)"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        if group.creator_id != current_user_id:
            raise APIException("Only the group creator can delete the group", status_code=403)
        
        group_name = group.name
        db.session.delete(group)
        db.session.commit()
        
        return jsonify({"message": f"Group '{group_name}' deleted successfully"}), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/groups/<int:group_id>/kick/<int:user_id>', methods=['POST'])
@jwt_required()
def kick_member(group_id, user_id):
    """Kick a member from the group (creator only)"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        user_to_kick = User.query.get(user_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        if not user_to_kick:
            raise APIException("User not found", status_code=404)
        
        if group.creator_id != current_user_id:
            raise APIException("Only the group creator can kick members", status_code=403)
        
        if user_to_kick.id == current_user_id:
            raise APIException("Cannot kick yourself. Use leave instead", status_code=400)
        
        if user_to_kick not in group.members:
            raise APIException("User is not a member of this group", status_code=400)
        
        group.members.remove(user_to_kick)
        db.session.commit()
        
        return jsonify({"message": f"Successfully kicked {user_to_kick.username} from the group"}), 200
        
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
# GAME SYNERGY AND MATCHING ROUTES - FIXED
# ============================================================================

@gaming.route('/groups/<int:group_id>/common-games', methods=['GET'])
@jwt_required()
def get_common_games(group_id):
    """Find common games among group members - FIXED VERSION"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in group.members:
            raise APIException("Access denied", status_code=403)
        
        # Get only Steam-connected members
        steam_connected_members = [member for member in group.members if member.is_steam_connected]
        
        if len(steam_connected_members) < 2:
            return jsonify({
                "games": [],
                "group_size": len(group.members),
                "steam_connected_count": len(steam_connected_members),
                "message": "Need at least 2 members with Steam connected to find common games"
            }), 200
        
        member_ids = [member.id for member in steam_connected_members]
        
        try:
            common_games = steam_service.find_common_games(member_ids)
        except Exception as steam_error:
            print(f"Steam service error: {steam_error}")
            return jsonify({
                "games": [],
                "error": "Failed to fetch common games from Steam service",
                "group_size": len(group.members),
                "steam_connected_count": len(steam_connected_members)
            }), 500
        
        # Apply filters if provided
        filters = {
            'coverage': request.args.get('coverage'),
            'multiplayer_only': request.args.get('multiplayer') == 'true',
            'genres': request.args.getlist('genres'),
            'min_players': request.args.get('min_players')
        }
        
        try:
            filtered_games = steam_service.filter_games(common_games, filters)
        except Exception as filter_error:
            print(f"Filter error: {filter_error}")
            filtered_games = common_games  # Return unfiltered if filter fails
        
        return jsonify({
            "games": filtered_games,
            "group_size": len(group.members),
            "steam_connected_count": len(steam_connected_members),
            "total_unique_games": len(common_games),
            "filtered_count": len(filtered_games),
            "filters_applied": filters
        }), 200
        
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        print(f"Error in get_common_games: {str(e)}")
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
        
        # Allow any member to trigger sync, not just creator
        user = User.query.get(current_user_id)
        if user not in group.members:
            raise APIException("Only group members can sync libraries", status_code=403)
        
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
# GAME SESSION MANAGEMENT ROUTES - UNCHANGED
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

        # Get Steam-connected members only
        steam_connected_members = [member for member in group.members if member.is_steam_connected]
        member_ids = [member.id for member in steam_connected_members]
        
        if len(member_ids) < 1:
            raise APIException("Need at least one member with Steam connected to start voting.", status_code=400)
            
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

        return jsonify({
            "session": session.serialize(), 
            "winner": games_dict.get(winner_id), 
            "results": results
        }), 200

    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

# ============================================================================
# PUBLIC DISCOVERY AND STATS ROUTES
# ============================================================================

@gaming.route('/public/groups', methods=['GET'])
@jwt_required()
def discover_public_groups():
    """Discover public groups"""
    try:
        # Get public groups with member counts
        public_groups = GamingGroup.query.filter_by(is_public=True).all()
        
        groups_data = []
        for group in public_groups:
            group_data = group.serialize()
            group_data['can_join'] = len(group.members) < group.max_members
            groups_data.append(group_data)
        
        return jsonify({"groups": groups_data}), 200
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/public/popular-games', methods=['GET'])
@jwt_required()
def get_popular_games():
    """Get most popular games across all users"""
    try:
        from sqlalchemy import text
        
        # Get most owned games
        result = db.session.execute(text("""
            SELECT sg.name, sg.steam_appid, sg.header_image, COUNT(ug.user_id) as owner_count
            FROM steam_game sg
            JOIN user_games ug ON sg.id = ug.game_id
            GROUP BY sg.id, sg.name, sg.steam_appid, sg.header_image
            ORDER BY owner_count DESC
            LIMIT 20
        """))
        
        popular_games = []
        for row in result:
            popular_games.append({
                'name': row.name,
                'steam_appid': row.steam_appid,
                'header_image': row.header_image,
                'owner_count': row.owner_count
            })
        
        return jsonify({"games": popular_games}), 200
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@gaming.route('/stats/user', methods=['GET'])
@jwt_required()
def get_user_gaming_stats():
    """Get user's gaming statistics"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            raise APIException("User not found", status_code=404)
        
        # Calculate user stats
        total_games = len(user.owned_games)
        total_groups = len(user.groups)
        groups_created = len(user.created_groups)
        
        # Get total playtime
        from sqlalchemy import text
        result = db.session.execute(text("""
            SELECT SUM(hours_played) as total_hours
            FROM user_games 
            WHERE user_id = :user_id
        """), {'user_id': current_user_id})
        
        total_hours = result.fetchone()[0] or 0
        
        # Get favorite genres
        genre_counts = {}
        for game in user.owned_games:
            if game.genres:
                try:
                    genres = json.loads(game.genres)
                    for genre in genres:
                        genre_counts[genre] = genre_counts.get(genre, 0) + 1
                except:
                    pass
        
        top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        stats = {
            "total_games": total_games,
            "total_groups": total_groups,
            "groups_created": groups_created,
            "total_playtime_hours": total_hours,
            "steam_connected": user.is_steam_connected,
            "top_genres": [{"genre": genre, "count": count} for genre, count in top_genres],
            "last_sync": user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
        }
        
        return jsonify({"stats": stats}), 200
        
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
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
        
        # Calculate group stats
        total_members = len(group.members)
        steam_connected_members = len([m for m in group.members if m.is_steam_connected])
        
        # Get common games count
        if steam_connected_members >= 2:
            try:
                member_ids = [m.id for m in group.members if m.is_steam_connected]
                common_games = steam_service.find_common_games(member_ids)
                common_games_count = len([g for g in common_games if g.get('is_common', False)])
                total_unique_games = len(common_games)
            except:
                common_games_count = 0
                total_unique_games = 0
        else:
            common_games_count = 0
            total_unique_games = 0
        
        # Get session count
        session_count = GameSession.query.filter_by(group_id=group_id).count()
        
        stats = {
            "total_members": total_members,
            "steam_connected_members": steam_connected_members,
            "common_games_count": common_games_count,
            "total_unique_games": total_unique_games,
            "total_sessions": session_count,
            "created_at": group.created_at.isoformat(),
            "creator": group.creator.username if group.creator else "Unknown"
        }
        
        return jsonify({"stats": stats}), 200
        
    except APIException as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500