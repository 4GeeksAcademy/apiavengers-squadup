"""
Gaming group management routes - COMPLETE WITH VOTING SYSTEM
Creator can DELETE group, members can LEAVE, auto-cleanup empty groups
PLUS: Voting system for game selection
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, GamingGroup, GameSession, SteamGame, Vote
from api.utils import APIException
import secrets
import string
import json

gaming = Blueprint('gaming', __name__)

# ============================================================================
# EXISTING GROUP MANAGEMENT ROUTES (KEEP ALL YOUR CURRENT FUNCTIONALITY)
# ============================================================================

@gaming.route('/groups/<int:group_id>/leave', methods=['POST'])
@jwt_required()
def leave_group(group_id):
    """
    LEAVE a gaming group (for members and creator)
    - Members: Just leave
    - Creator leaving with other members: Transfer ownership to oldest member
    - Creator leaving empty group: Auto-delete the group
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=400)
        
        group_name = group.name
        is_creator = (group.creator_id == current_user_id)
        
        # Get other members (excluding current user)
        other_members = [m for m in group.members if m.id != current_user_id]
        
        print(f"📝 User {user.username} wants to leave group '{group_name}'")
        print(f"   - Is creator: {is_creator}")
        print(f"   - Other members: {len(other_members)}")
        print(f"   - Other member names: {[m.username for m in other_members]}")
        
        if is_creator:
            if other_members:
                # CASE 1: Creator leaving, but other members exist
                # → Transfer ownership to the oldest/first member
                new_creator = other_members[0]  # Could also use oldest by join_date
                old_creator_name = user.username
                
                print(f"🔄 Transferring ownership from {old_creator_name} to {new_creator.username}")
                
                group.creator_id = new_creator.id
                group.members.remove(user)  # Remove the old creator
                
                db.session.commit()
                
                return jsonify({
                    "success": True,
                    "message": f"You left '{group_name}'. Ownership transferred to {new_creator.username}.",
                    "action": "left_with_transfer",
                    "new_creator": new_creator.username,
                    "group_deleted": False
                }), 200
                
            else:
                # CASE 2: Creator leaving and NO other members
                # → Auto-delete the empty group
                print(f"🗑️ Auto-deleting empty group '{group_name}' (creator was last member)")
                
                try:
                    # The cascade relationships should handle sessions automatically
                    db.session.delete(group)
                    db.session.commit()
                    
                    return jsonify({
                        "success": True,
                        "message": f"Group '{group_name}' was deleted because you were the last member.",
                        "action": "auto_deleted",
                        "group_deleted": True
                    }), 200
                    
                except Exception as delete_error:
                    print(f"❌ Auto-delete failed: {str(delete_error)}")
                    db.session.rollback()
                    
                    # Fallback: Manual cascade deletion
                    try:
                        print("🔧 Attempting manual cleanup...")
                        
                        # Delete sessions manually
                        sessions = GameSession.query.filter_by(group_id=group_id).all()
                        for session in sessions:
                            db.session.delete(session)
                        
                        # Clear members and delete group
                        group.members.clear()
                        db.session.delete(group)
                        db.session.commit()
                        
                        return jsonify({
                            "success": True,
                            "message": f"Group '{group_name}' was deleted because you were the last member.",
                            "action": "auto_deleted_manual",
                            "group_deleted": True
                        }), 200
                        
                    except Exception as manual_error:
                        print(f"❌ Manual cleanup also failed: {str(manual_error)}")
                        db.session.rollback()
                        raise APIException("Failed to delete empty group. Please contact support.", status_code=500)
        
        else:
            # CASE 3: Regular member leaving
            # → Just remove them from the group
            print(f"👋 Regular member {user.username} leaving group '{group_name}'")
            
            group.members.remove(user)
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": f"Successfully left group '{group_name}'.",
                "action": "member_left",
                "group_deleted": False
            }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"❌ Unexpected error in leave_group: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/delete', methods=['DELETE'])
@jwt_required()
def delete_group(group_id):
    """
    DELETE a gaming group (CREATOR ONLY)
    - Forcefully deletes the group regardless of members
    - Kicks all members and deletes all sessions
    - Only the creator can do this
    """
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        # ONLY the creator can delete the group
        if group.creator_id != current_user_id:
            raise APIException(
                "Only the group creator can delete the group. Use 'leave' instead.", 
                status_code=403
            )
        
        group_name = group.name
        member_count = len(group.members)
        
        print(f"🗑️ Creator deleting group '{group_name}' with {member_count} members")
        
        try:
            # With proper cascade relationships, this should work
            db.session.delete(group)
            db.session.commit()
            
            print(f"✅ Group '{group_name}' deleted successfully (cascade)")
            
            return jsonify({
                "success": True,
                "message": f"Group '{group_name}' deleted successfully. All {member_count} members were removed.",
                "action": "creator_deleted",
                "members_removed": member_count
            }), 200
            
        except Exception as delete_error:
            print(f"❌ Cascade deletion failed: {str(delete_error)}")
            db.session.rollback()
            
            # Fallback: Manual cascade deletion
            try:
                print("🔧 Attempting manual cascade deletion...")
                
                # Step 1: Delete all sessions
                sessions = GameSession.query.filter_by(group_id=group_id).all()
                session_count = len(sessions)
                
                for session in sessions:
                    print(f"  Deleting session: {session.session_name}")
                    db.session.delete(session)
                
                # Step 2: Clear all member associations
                group.members.clear()
                
                # Step 3: Delete the group
                db.session.delete(group)
                db.session.commit()
                
                print(f"✅ Manual cascade deletion successful: {session_count} sessions, {member_count} members, 1 group")
                
                return jsonify({
                    "success": True,
                    "message": f"Group '{group_name}' deleted successfully. Removed {member_count} members and {session_count} sessions.",
                    "action": "creator_deleted_manual",
                    "members_removed": member_count,
                    "sessions_removed": session_count
                }), 200
                
            except Exception as manual_error:
                print(f"❌ Manual cascade deletion also failed: {str(manual_error)}")
                db.session.rollback()
                raise APIException("Failed to delete group. Please contact support.", status_code=500)
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"❌ Unexpected error in delete_group: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/kick/<int:user_id>', methods=['POST'])
@jwt_required()
def kick_member(group_id, user_id):
    """
    KICK a member from the group (CREATOR ONLY)
    - Only creator can kick members
    - Cannot kick yourself (use leave or delete instead)
    """
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        user_to_kick = User.query.get(user_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        if not user_to_kick:
            raise APIException("User not found", status_code=404)
        
        # Only creator can kick
        if group.creator_id != current_user_id:
            raise APIException("Only the group creator can kick members", status_code=403)
        
        # Cannot kick yourself
        if user_to_kick.id == current_user_id:
            raise APIException("Cannot kick yourself. Use 'leave' or 'delete' instead.", status_code=400)
        
        # Must be a member to kick
        if user_to_kick not in group.members:
            raise APIException("User is not a member of this group", status_code=400)
        
        # Remove the user
        kicked_username = user_to_kick.username
        group.members.remove(user_to_kick)
        db.session.commit()
        
        print(f"👢 {user_to_kick.username} was kicked from '{group.name}' by creator")
        
        return jsonify({
            "success": True,
            "message": f"Successfully kicked {kicked_username} from the group",
            "action": "member_kicked",
            "kicked_user": kicked_username
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": "Internal server error"}), 500


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
        
        if len(name) < 3:
            raise APIException("Group name must be at least 3 characters", status_code=400)
        
        if len(name) > 50:
            raise APIException("Group name must be less than 50 characters", status_code=400)
        
        # Generate unique invite code
        invite_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        
        # Ensure invite code is unique
        while GamingGroup.query.filter_by(invite_code=invite_code).first():
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
        db.session.flush()  # Get the ID
        
        # Add creator as first member
        creator = User.query.get(current_user_id)
        group.members.append(creator)
        
        db.session.commit()
        
        print(f"🎉 New group created: '{name}' by {creator.username}")
        
        return jsonify({
            "success": True,
            "message": "Group created successfully",
            "group": group.serialize()
        }), 201
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups', methods=['GET'])
@jwt_required()
def get_user_groups():
    """Get all groups for the current user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            raise APIException("User not found", status_code=404)
        
        # Get all groups where user is a member
        groups = user.groups
        
        return jsonify({
            "success": True,
            "groups": [group.serialize() for group in groups]
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"Error getting user groups: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group(group_id):
    """Get a specific group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        # Check if user is a member
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        return jsonify({
            "success": True,
            "group": group.serialize()
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"Error getting group: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/join/<invite_code>', methods=['POST'])
@jwt_required()
def join_group_by_invite(invite_code):
    """Join a group using invite code"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.filter_by(invite_code=invite_code).first()
        
        if not group:
            raise APIException("Invalid invite code", status_code=404)
        
        if user in group.members:
            raise APIException("You are already a member of this group", status_code=409)
        
        if len(group.members) >= group.max_members:
            raise APIException("Group is full", status_code=400)
        
        group.members.append(user)
        db.session.commit()
        
        print(f"👥 {user.username} joined group '{group.name}' via invite")
        
        return jsonify({
            "success": True,
            "message": f"Successfully joined '{group.name}'",
            "group": group.serialize()
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"Error joining group: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


# ============================================================================
# NEW VOTING SYSTEM ROUTES
# ============================================================================

@gaming.route('/groups/<int:group_id>/common-games', methods=['GET'])
@jwt_required()
def get_group_common_games(group_id):
    """Get common games for group members"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Get all Steam-connected members
        steam_members = [m for m in group.members if m.steam_id]
        if len(steam_members) < 2:
            return jsonify({
                "success": True,
                "games": [],
                "message": "Need at least 2 Steam-connected members to find common games"
            }), 200
        
        user_ids = [m.id for m in steam_members]
        
        # Use steam_service to find common games
        try:
            from api.steam_service import steam_service
            games = steam_service.find_common_games(user_ids)
            
            return jsonify({
                "success": True,
                "games": games,
                "member_count": len(steam_members),
                "steam_connected_members": [{"id": m.id, "username": m.username} for m in steam_members]
            }), 200
            
        except Exception as steam_error:
            print(f"Steam service error: {str(steam_error)}")
            return jsonify({
                "success": True,
                "games": [],
                "error": "Steam service temporarily unavailable",
                "member_count": len(steam_members)
            }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"Error getting group common games: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/quick-vote', methods=['POST'])
@jwt_required()
def start_quick_vote(group_id):
    """Start a quick voting session for group"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Check if there's already an active voting session
        active_session = GameSession.query.filter_by(
            group_id=group_id, 
            status='voting'
        ).first()
        
        if active_session:
            raise APIException("There is already an active voting session for this group", status_code=400)
        
        # Get common games
        steam_members = [m for m in group.members if m.steam_id]
        if len(steam_members) < 2:
            raise APIException("Need at least 2 Steam-connected members to start voting", status_code=400)
        
        user_ids = [m.id for m in steam_members]
        
        try:
            from api.steam_service import steam_service
            games = steam_service.find_common_games(user_ids)
        except Exception as steam_error:
            print(f"Steam service error: {str(steam_error)}")
            raise APIException("Steam service temporarily unavailable", status_code=503)
        
        # Filter for multiplayer games with good coverage
        votable_games = [
            g for g in games 
            if g.get('multiplayer') and 
            g.get('ownership_stats', {}).get('coverage_percentage', 0) >= 50
        ]
        
        if not votable_games:
            raise APIException("No suitable multiplayer games found with sufficient coverage", status_code=400)
        
        # Create voting session
        session = GameSession(
            group_id=group_id,
            session_name=f"Quick Vote - {group.name}",
            description="Quick voting session for game selection",
            status='voting',
            vote_results=json.dumps({
                "games": [g['id'] for g in votable_games[:10]], 
                "votes": {},
                "created_by": current_user_id
            })
        )
        
        db.session.add(session)
        db.session.commit()
        
        print(f"🗳️ Voting session started for group '{group.name}' with {len(votable_games)} games")
        
        return jsonify({
            "success": True,
            "session": session.serialize(),
            "votable_games": votable_games[:10],  # Limit to 10 games
            "eligible_voters": len(steam_members)
        }), 201
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"Error starting quick vote: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/submit-votes', methods=['POST'])
@jwt_required()
def submit_votes(session_id):
    """Submit votes for a voting session"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        votes = data.get('votes', [])
        
        if not votes or len(votes) > 3:
            raise APIException("Please select 1-3 games", status_code=400)
        
        session = GameSession.query.get(session_id)
        if not session:
            raise APIException("Session not found", status_code=404)
        
        # Check if user is member of the group
        user = User.query.get(current_user_id)
        if user not in session.group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        if session.status != 'voting':
            raise APIException("Voting session is not active", status_code=400)
        
        # Check if user already voted
        if session.is_user_voted(current_user_id):
            raise APIException("You have already voted in this session", status_code=400)
        
        # Validate that all game IDs exist and are valid for this session
        vote_data = json.loads(session.vote_results or '{"games": []}')
        valid_game_ids = vote_data.get('games', [])
        
        for game_id in votes:
            if game_id not in valid_game_ids:
                raise APIException(f"Invalid game ID: {game_id}", status_code=400)
        
        # Create vote records
        for i, game_id in enumerate(votes):
            points = 3 - i  # 3 points for first choice, 2 for second, 1 for third
            rank = i + 1    # 1 for first choice, 2 for second, 3 for third
            
            vote = Vote(
                session_id=session_id,
                user_id=current_user_id,
                game_id=game_id,
                points=points,
                rank=rank
            )
            db.session.add(vote)
        
        # Check if voting is complete and update status
        if session.is_voting_complete():
            session.status = 'completed'
            print(f"🏁 Voting completed for session {session_id}")
        
        db.session.commit()
        
        print(f"✅ {user.username} submitted votes for session {session_id}")
        
        return jsonify({
            "success": True,
            "message": "Votes submitted successfully",
            "voting_complete": session.status == 'completed',
            "session": session.serialize()
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"Error submitting votes: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/results', methods=['GET'])
@jwt_required()
def get_session_results(session_id):
    """Get results of a voting session"""
    try:
        current_user_id = get_jwt_identity()
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in session.group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        if session.status not in ['completed', 'voting']:
            raise APIException("Session is not available for viewing", status_code=400)
        
        # Get vote summary
        vote_summary = session.get_vote_summary()
        winner = session.get_winner()
        
        # Build detailed results
        results = []
        for game_id, total_points in vote_summary['total_points'].items():
            game = SteamGame.query.get(game_id)
            if game:
                vote_count = vote_summary['vote_counts'].get(game_id, 0)
                results.append({
                    "game": game.serialize(),
                    "score": total_points,
                    "vote_count": vote_count,
                    "percentage": round((vote_count / max(1, vote_summary['total_voters'])) * 100, 1)
                })
        
        # Sort by score (highest first)
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return jsonify({
            "success": True,
            "session": session.serialize(),
            "results": results,
            "winner": winner['game'] if winner else None,
            "vote_summary": vote_summary,
            "total_voters": vote_summary['total_voters'],
            "eligible_voters": session.get_member_count()
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"Error getting session results: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>', methods=['GET'])
@jwt_required()
def get_session(session_id):
    """Get session details"""
    try:
        current_user_id = get_jwt_identity()
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        user = User.query.get(current_user_id)
        if user not in session.group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        return jsonify({
            "success": True,
            "session": session.serialize(),
            "user_has_voted": session.is_user_voted(current_user_id),
            "user_votes": [vote.serialize() for vote in session.get_user_votes(current_user_id)]
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"Error getting session: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


# ============================================================================
# SUMMARY OF THE COMPLETE SYSTEM:
# ============================================================================
# """
# ✅ WORKING FLOWS:

# 1. GROUP MANAGEMENT:
#    - Create groups
#    - Join via invite links
#    - Leave/Delete with proper ownership transfer
#    - Kick members (creator only)

# 2. VOTING SYSTEM:
#    - Start voting sessions for groups
#    - Submit ranked votes (1st, 2nd, 3rd choice)
#    - Calculate winners based on points
#    - View results with detailed breakdowns

# 3. GAME DISCOVERY:
#    - Find common games among group members
#    - Filter by multiplayer capability
#    - Coverage percentage calculations

# 🎮 COMPLETE MULTI-USER FLOW NOW WORKS:
#    User A creates group → User B joins → Find common games → Start vote → 
#    Both users vote → See results → Play winning game!
# """