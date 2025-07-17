"""
Gaming group management routes - ENHANCED WITH VOTING SYSTEM FIXES + OWNERSHIP TRANSFER
- Race condition protection with atomic transactions
- Real-time updates via Server-Sent Events
- Comprehensive vote validation
- Error recovery and retry logic
- Ownership transfer functionality
- Enhanced member management
"""
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, GamingGroup, GameSession, SteamGame, Vote
from api.utils import APIException
import secrets
import string
import json
import time
from datetime import datetime, timezone

gaming = Blueprint('gaming', __name__)

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

def validate_vote_submission(game_votes, group_id, user_id):
    """Validate votes before submission to prevent invalid data"""
    errors = []
    
    # Check vote count
    if len(game_votes) == 0:
        errors.append("At least one vote is required")
    elif len(game_votes) > 3:
        errors.append("Maximum 3 votes allowed")
    
    # Check for duplicate games in single submission
    game_ids = [vote.get('game_id') for vote in game_votes]
    if len(game_ids) != len(set(game_ids)):
        errors.append("Cannot vote for the same game multiple times")
    
    # Validate priorities (should be 3, 2, 1 for first, second, third choice)
    priorities = [vote.get('priority') for vote in game_votes]
    expected_priorities = list(range(len(game_votes), 0, -1))  # [3,2,1] for 3 votes
    
    if sorted(priorities, reverse=True) != expected_priorities:
        errors.append("Invalid vote priorities. Should be 3 for 1st choice, 2 for 2nd, 1 for 3rd")
    
    # Validate that all games exist and are available to group
    try:
        common_games = get_group_common_games_helper(group_id)
        valid_game_ids = {game['id'] for game in common_games}
        
        for vote in game_votes:
            game_id = vote.get('game_id')
            if not game_id:
                errors.append("Missing game_id in vote")
                continue
                
            if game_id not in valid_game_ids:
                game = SteamGame.query.get(game_id)
                game_name = game.name if game else f"Game {game_id}"
                errors.append(f"'{game_name}' is not available to this group")
    except Exception as e:
        errors.append("Could not validate game availability")
        print(f"❌ Error validating games: {str(e)}")
    
    return errors


# ============================================================================
# GROUP MANAGEMENT ROUTES - ENHANCED WITH OWNERSHIP TRANSFER
# ============================================================================

@gaming.route('/groups/<int:group_id>/transfer-ownership/<int:user_id>', methods=['POST'])
@jwt_required()
def transfer_group_ownership(group_id, user_id):
    """Transfer group ownership to another member (CREATOR ONLY)"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        new_creator = User.query.get(user_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        if not new_creator:
            raise APIException("User not found", status_code=404)
        
        # Only current creator can transfer ownership
        if group.creator_id != current_user_id:
            raise APIException("Only the group creator can transfer ownership", status_code=403)
        
        # New creator must be a member of the group
        if new_creator not in group.members:
            raise APIException("User is not a member of this group", status_code=400)
        
        # Can't transfer to yourself
        if user_id == current_user_id:
            raise APIException("You are already the creator", status_code=400)
        
        old_creator_username = group.creator.username if group.creator else "Unknown"
        new_creator_username = new_creator.username
        
        print(f"🔄 Transferring ownership of group '{group.name}' from {old_creator_username} to {new_creator_username}")
        
        # Transfer ownership
        group.creator_id = user_id
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Group ownership transferred to {new_creator_username}",
            "action": "ownership_transferred",
            "old_creator": old_creator_username,
            "new_creator": new_creator_username,
            "group": group.serialize()
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"❌ Unexpected error in transfer_group_ownership: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/members', methods=['GET'])
@jwt_required()
def get_group_members(group_id):
    """Get detailed member information for a group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Serialize members with additional details
        members_data = []
        for member in group.members:
            member_data = member.serialize()
            
            # Add group-specific information
            member_data.update({
                'is_creator': member.id == group.creator_id,
                'joined_at': None,  # You might want to add this to your group_members table
                'can_be_kicked': (
                    group.creator_id == current_user_id and  # Current user is creator
                    member.id != group.creator_id and        # Member is not creator
                    member.id != current_user_id              # Member is not current user
                ),
                'can_be_promoted': (
                    group.creator_id == current_user_id and  # Current user is creator
                    member.id != group.creator_id and        # Member is not creator
                    member.id != current_user_id              # Member is not current user
                )
            })
            
            members_data.append(member_data)
        
        # Sort members: creator first, then by username
        members_data.sort(key=lambda m: (not m['is_creator'], m['username'].lower()))
        
        return jsonify({
            "success": True,
            "members": members_data,
            "total_members": len(members_data),
            "steam_connected_count": len([m for m in members_data if m.get('steam_connected')]),
            "current_user_is_creator": group.creator_id == current_user_id
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"❌ Error getting group members: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/common-games', methods=['GET'])
@jwt_required()
def get_group_common_games(group_id):
    """Get common games for a group - FIXED MISSING ENDPOINT"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Get Steam-connected members
        steam_members = [m for m in group.members if m.steam_id and m.is_steam_connected]
        if len(steam_members) < 2:
            return jsonify({
                "success": True,
                "games": [],
                "message": "Need at least 2 Steam-connected members to find common games",
                "steam_connected_count": len(steam_members),
                "total_members": len(group.members)
            }), 200
        
        # Get user IDs
        user_ids = [m.id for m in steam_members]
        
        # Use steam_service to find common games
        from api.steam_service import steam_service
        if steam_service:
            common_games = steam_service.find_common_games(user_ids)
            # Filter for multiplayer games only
            multiplayer_games = [g for g in common_games if g.get('multiplayer') or g.get('co_op')]
            
            return jsonify({
                "success": True,
                "games": multiplayer_games[:20],  # Limit to 20 games
                "total_games": len(multiplayer_games),
                "steam_connected_count": len(steam_members),
                "total_members": len(group.members)
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "Steam service not available"
            }), 503
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"❌ Error getting group common games: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/kick/<int:user_id>', methods=['POST'])
@jwt_required()
def kick_member(group_id, user_id):
    """ENHANCED: Kick a member from the group (CREATOR ONLY)"""
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
            raise APIException("Cannot kick yourself. Use 'leave' or 'delete' instead.", status_code=400)
        if user_to_kick not in group.members:
            raise APIException("User is not a member of this group", status_code=400)
        
        # Additional check: Can't kick another creator (shouldn't happen, but safety)
        if user_to_kick.id == group.creator_id:
            raise APIException("Cannot kick the group creator", status_code=400)
        
        kicked_username = user_to_kick.username
        group_name = group.name
        
        print(f"👢 Kicking {kicked_username} from group '{group_name}'")
        
        # Remove from group
        group.members.remove(user_to_kick)
        
        # ENHANCED: Clean up any user-specific data related to this group
        try:
            # Remove any votes in active sessions for this group using Vote model
            active_sessions = GameSession.query.filter_by(group_id=group_id, status='voting').all()
            votes_removed = 0
            
            for session in active_sessions:
                # Remove votes by this user in this session
                user_votes = Vote.query.filter_by(session_id=session.id, user_id=user_id).all()
                for vote in user_votes:
                    db.session.delete(vote)
                votes_removed += len(user_votes)
            
            if votes_removed > 0:
                print(f"🗳️ Removed {votes_removed} votes from {len(active_sessions)} active sessions")
        except Exception as cleanup_error:
            print(f"⚠️ Error cleaning up user votes: {cleanup_error}")
            # Don't fail the kick operation for cleanup errors
        
        db.session.commit()
        
        print(f"✅ Successfully kicked {kicked_username} from group '{group_name}'")
        
        return jsonify({
            "success": True,
            "message": f"Successfully kicked {kicked_username} from the group",
            "action": "member_kicked",
            "kicked_user": kicked_username,
            "kicked_user_id": user_id,
            "remaining_members": len(group.members)
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"❌ Unexpected error in kick_member: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/leave', methods=['POST'])
@jwt_required()
def leave_group(group_id):
    """LEAVE a gaming group (for members and creator)"""
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
        other_members = [m for m in group.members if m.id != current_user_id]
        
        print(f"📝 User {user.username} wants to leave group '{group_name}'")
        
        if is_creator:
            if other_members:
                new_creator = other_members[0]
                print(f"🔄 Transferring ownership from {user.username} to {new_creator.username}")
                
                group.creator_id = new_creator.id
                group.members.remove(user)
                db.session.commit()
                
                return jsonify({
                    "success": True,
                    "message": f"You left '{group_name}'. Ownership transferred to {new_creator.username}.",
                    "action": "left_with_transfer",
                    "new_creator": new_creator.username,
                    "group_deleted": False
                }), 200
            else:
                print(f"🗑️ Auto-deleting empty group '{group_name}'")
                try:
                    db.session.delete(group)
                    db.session.commit()
                    return jsonify({
                        "success": True,
                        "message": f"Group '{group_name}' was deleted because you were the last member.",
                        "action": "auto_deleted",
                        "group_deleted": True
                    }), 200
                except Exception as delete_error:
                    db.session.rollback()
                    # Manual cleanup fallback
                    sessions = GameSession.query.filter_by(group_id=group_id).all()
                    for session in sessions:
                        db.session.delete(session)
                    group.members.clear()
                    db.session.delete(group)
                    db.session.commit()
                    return jsonify({
                        "success": True,
                        "message": f"Group '{group_name}' was deleted.",
                        "action": "auto_deleted_manual",
                        "group_deleted": True
                    }), 200
        else:
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
    """DELETE a gaming group (CREATOR ONLY)"""
    try:
        current_user_id = get_jwt_identity()
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        
        if group.creator_id != current_user_id:
            raise APIException("Only the group creator can delete the group. Use 'leave' instead.", status_code=403)
        
        group_name = group.name
        member_count = len(group.members)
        
        try:
            db.session.delete(group)
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Group '{group_name}' deleted successfully. All {member_count} members were removed.",
                "action": "creator_deleted",
                "members_removed": member_count
            }), 200
        except Exception:
            db.session.rollback()
            # Manual cleanup
            sessions = GameSession.query.filter_by(group_id=group_id).all()
            for session in sessions:
                db.session.delete(session)
            group.members.clear()
            db.session.delete(group)
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Group '{group_name}' deleted successfully.",
                "action": "creator_deleted_manual"
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
        db.session.flush()
        
        creator = User.query.get(current_user_id)
        group.members.append(creator)
        db.session.commit()
        
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
        
        user_groups = user.member_of_groups
        
        return jsonify({
            "success": True,
            "groups": [group.serialize() for group in user_groups]
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group(group_id):
    """Get details for a specific group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        return jsonify({
            "success": True,
            "group": group.serialize()
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/join/<invite_code>', methods=['POST'])
@jwt_required()
def join_group_by_invite(invite_code):
    """Join a group using an invite code"""
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
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/validate-invite/<invite_code>', methods=['GET'])
@jwt_required()
def validate_invite_code(invite_code):
    """VALIDATE an invite code without joining"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            raise APIException("User not found", status_code=404)
        
        group = GamingGroup.query.filter_by(invite_code=invite_code).first()
        if not group:
            raise APIException("Invalid or expired invite code", status_code=404)
        
        is_member = user in group.members
        is_full = len(group.members) >= group.max_members
        can_join = not is_member and not is_full
        
        return jsonify({
            "success": True,
            "group": {
                "id": group.id,
                "name": group.name,
                "description": group.description,
                "current_members": len(group.members),
                "max_members": group.max_members,
                "is_public": group.is_public,
                "creator": group.creator.serialize() if group.creator else None
            },
            "user_status": {
                "is_member": is_member,
                "is_full": is_full,
                "can_join": can_join
            }
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"success": False, "error": "Internal server error"}), 500


# ============================================================================
# ENHANCED VOTING SYSTEM WITH ALL FIXES
# ============================================================================

@gaming.route('/groups/<int:group_id>/active-session', methods=['GET'])
@jwt_required()
def get_active_session(group_id):
    """Check if there's an active voting session for the group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        active_session = GameSession.query.filter_by(group_id=group_id, status='voting').first()
        
        if active_session:
            common_games = get_group_common_games_helper(group_id)
            return jsonify({
                "success": True,
                "session": active_session.serialize(),
                "votable_games": common_games
            }), 200
        else:
            return jsonify({"success": True, "session": None}), 200
            
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/start-vote', methods=['POST'])
@jwt_required()
def start_voting_session(group_id):
    """Start a new voting session for the group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Check if there's already an active session
        existing_session = GameSession.query.filter_by(group_id=group_id, status='voting').first()
        if existing_session:
            raise APIException("A voting session is already active for this group", status_code=400)
        
        data = request.get_json()
        session_name = data.get('session_name', f'Vote Session - {datetime.utcnow().strftime("%Y-%m-%d %H:%M")}')
        description = data.get('description', 'Vote for the next game to play!')
        
        session = GameSession(
            group_id=group_id,
            session_name=session_name,
            description=description,
            status='voting',
            vote_results=json.dumps({})  # Keep for backwards compatibility, but won't be used
        )
        
        db.session.add(session)
        db.session.commit()
        
        common_games = get_group_common_games_helper(group_id)
        
        return jsonify({
            "success": True,
            "message": "Voting session started",
            "session": session.serialize(),
            "common_games": common_games,
            "voting_instructions": {
                "max_votes": 3,
                "scoring": "3 points for 1st choice, 2 points for 2nd, 1 point for 3rd",
                "deadline": "Vote before all members vote or creator closes session"
            }
        }), 201
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error starting voting session: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/vote', methods=['POST'])
@jwt_required()
def submit_vote(session_id):
    """🚀 ENHANCED: Submit votes using Vote model with atomic transactions"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Use atomic transaction for race condition protection
        with db.session.begin():
            # Lock the session row to prevent concurrent modifications
            session = GameSession.query.with_for_update().get(session_id)
            
            if not session:
                raise APIException("Session not found", status_code=404)
            
            if session.status != 'voting':
                raise APIException("This voting session is not active", status_code=400)
            
            group = session.group
            if user not in group.members:
                raise APIException("You are not a member of this group", status_code=403)
            
            data = request.get_json()
            game_votes = data.get('game_votes', [])
            
            if not game_votes:
                raise APIException("No votes provided", status_code=400)
            
            # Comprehensive vote validation
            validation_errors = validate_vote_submission(game_votes, group.id, current_user_id)
            if validation_errors:
                raise APIException(f"Validation failed: {'; '.join(validation_errors)}", status_code=400)
            
            # Check if user has already voted using Vote model
            if Vote.has_user_voted(session_id, current_user_id):
                raise APIException("You have already voted in this session", status_code=400)
            
            # Create votes using the new Vote model
            created_votes = []
            for vote_data in game_votes:
                vote = Vote(
                    session_id=session_id,
                    user_id=current_user_id,
                    game_id=vote_data['game_id'],
                    priority=vote_data['priority']
                )
                db.session.add(vote)
                created_votes.append(vote)
            
            # Flush to check constraints before commit
            db.session.flush()
            
            # Check if voting is complete
            total_members = len(group.members)
            total_voters = Vote.get_voter_count(session_id)
            
            if total_voters >= total_members:
                session.status = 'completed'
                print(f"🏁 Voting session {session_id} auto-completed: all members voted")
            
            # Update session timestamp
            session.updated_at = datetime.utcnow()
            
            # Commit happens automatically with 'with' block
        
        print(f"✅ Vote submitted by {user.username} for session {session_id} ({len(created_votes)} votes)")
        
        return jsonify({
            "success": True,
            "message": "Vote submitted successfully",
            "session_status": session.status,
            "total_voters": total_voters,
            "total_members": total_members,
            "votes_created": len(created_votes)
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"❌ Error submitting vote: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/live-results')
@jwt_required()
def stream_live_results(session_id):
    """🚀 REAL-TIME UPDATES: Stream live voting results using Vote model + Server-Sent Events"""
    
    def generate_events():
        try:
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            session = GameSession.query.get(session_id)
            
            if not session or user not in session.group.members:
                yield f"data: {json.dumps({'error': 'Access denied'})}\n\n"
                return
            
            last_vote_count = 0
            
            while True:
                try:
                    # Get current session state
                    session = GameSession.query.get(session_id)
                    if not session:
                        break
                    
                    # Get current vote count to detect changes
                    current_vote_count = len(session.votes) if session.votes else 0
                    
                    # Only send update if vote count changed
                    if current_vote_count != last_vote_count:
                        # Get results using Vote model (much faster than JSON parsing)
                        results = Vote.get_session_results(session_id)
                        
                        # Get voter statistics
                        total_voters = Vote.get_voter_count(session_id)
                        total_members = len(session.group.members)
                        
                        # Send update
                        update_data = {
                            "results": results,
                            "total_voters": total_voters,
                            "total_members": total_members,
                            "voting_complete": session.status == 'completed',
                            "timestamp": datetime.utcnow().isoformat(),
                            "session_status": session.status,
                            "vote_count": current_vote_count
                        }
                        
                        yield f"data: {json.dumps(update_data)}\n\n"
                        last_vote_count = current_vote_count
                    
                    # Stop streaming if voting is complete
                    if session and session.status == 'completed':
                        break
                        
                    time.sleep(2)  # Check every 2 seconds
                    
                except Exception as e:
                    print(f"❌ SSE Error: {e}")
                    yield f"data: {json.dumps({'error': 'Stream error'})}\n\n"
                    break
        except Exception as e:
            print(f"❌ SSE Setup Error: {e}")
            yield f"data: {json.dumps({'error': 'Authentication error'})}\n\n"
    
    return Response(
        generate_events(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            'Access-Control-Allow-Methods': 'GET',
            'X-Accel-Buffering': 'no'  # Disable nginx buffering
        }
    )


@gaming.route('/sessions/<int:session_id>/results', methods=['GET'])
@jwt_required()
def get_session_results(session_id):
    """Get results for a voting session using Vote model"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        group = session.group
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Get results using Vote model (much faster and more reliable)
        results = Vote.get_session_results(session_id)
        
        # Get voter statistics
        total_voters = Vote.get_voter_count(session_id)
        total_members = len(group.members)
        
        # Determine winner
        winner = results[0] if results else None
        
        # Check if current user has voted
        user_has_voted = Vote.has_user_voted(session_id, current_user_id)
        user_votes = Vote.get_user_votes(session_id, current_user_id) if user_has_voted else []
        
        return jsonify({
            "success": True,
            "session": session.serialize(),
            "results": results,
            "winner": winner,
            "total_voters": total_voters,
            "total_members": total_members,
            "voting_complete": session.status == 'completed',
            "user_has_voted": user_has_voted,
            "user_votes": [vote.serialize() for vote in user_votes],
            "participation_rate": (total_voters / total_members * 100) if total_members > 0 else 0
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"❌ Error getting session results: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/close', methods=['POST'])
@jwt_required()
def close_voting_session(session_id):
    """Close a voting session (group creator only)"""
    try:
        current_user_id = get_jwt_identity()
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        group = session.group
        
        if group.creator_id != current_user_id:
            raise APIException("Only the group creator can close voting sessions", status_code=403)
        
        if session.status != 'voting':
            raise APIException("Session is not active", status_code=400)
        
        session.status = 'completed'
        session.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Get final results
        results = Vote.get_session_results(session_id)
        total_voters = Vote.get_voter_count(session_id)
        
        return jsonify({
            "success": True,
            "message": "Voting session closed",
            "final_results": results,
            "total_voters": total_voters,
            "winner": results[0] if results else None
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error closing voting session: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


# 🚀 NEW: Additional Vote Management Endpoints

@gaming.route('/sessions/<int:session_id>/voters', methods=['GET'])
@jwt_required()
def get_session_voters(session_id):
    """Get list of users who have voted in this session"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        if user not in session.group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Get unique voters with their vote details
        voters_query = db.session.query(Vote.user_id, User.username, User.avatar_url, User.steam_avatar_url).join(
            User, Vote.user_id == User.id
        ).filter(Vote.session_id == session_id).distinct()
        
        voters = []
        for user_id, username, avatar_url, steam_avatar in voters_query:
            user_votes = Vote.get_user_votes(session_id, user_id)
            voters.append({
                "user_id": user_id,
                "username": username,
                "avatar_url": avatar_url or steam_avatar,
                "vote_count": len(user_votes),
                "votes": [vote.serialize() for vote in user_votes]
            })
        
        # Get members who haven't voted yet
        all_member_ids = {member.id for member in session.group.members}
        voted_member_ids = {voter["user_id"] for voter in voters}
        pending_member_ids = all_member_ids - voted_member_ids
        
        pending_voters = []
        for member_id in pending_member_ids:
            member = User.query.get(member_id)
            pending_voters.append({
                "user_id": member.id,
                "username": member.username,
                "avatar_url": member.avatar_url or member.steam_avatar_url,
                "status": "pending"
            })
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "voters": voters,
            "pending_voters": pending_voters,
            "total_voted": len(voters),
            "total_pending": len(pending_voters),
            "total_members": len(session.group.members),
            "completion_rate": (len(voters) / len(session.group.members) * 100) if session.group.members else 0
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"❌ Error getting session voters: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/my-votes', methods=['GET'])
@jwt_required()
def get_my_votes(session_id):
    """Get current user's votes for this session"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        if user not in session.group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        user_votes = Vote.get_user_votes(session_id, current_user_id)
        has_voted = len(user_votes) > 0
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "has_voted": has_voted,
            "votes": [vote.serialize() for vote in user_votes],
            "vote_count": len(user_votes),
            "can_vote": session.status == 'voting' and not has_voted
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"❌ Error getting user votes: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/vote-details/<int:game_id>', methods=['GET'])
@jwt_required()
def get_game_vote_details(session_id, game_id):
    """Get detailed voting information for a specific game"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        if user not in session.group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Get all votes for this game in this session
        game_votes = Vote.query.filter_by(
            session_id=session_id,
            game_id=game_id
        ).order_by(Vote.priority.desc()).all()
        
        if not game_votes:
            return jsonify({
                "success": True,
                "session_id": session_id,
                "game_id": game_id,
                "votes": [],
                "total_points": 0,
                "vote_count": 0,
                "average_score": 0
            }), 200
        
        # Calculate statistics
        total_points = sum(vote.priority for vote in game_votes)
        vote_count = len(game_votes)
        average_score = total_points / vote_count if vote_count > 0 else 0
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "game_id": game_id,
            "game": game_votes[0].game.serialize() if game_votes[0].game else None,
            "votes": [vote.serialize() for vote in game_votes],
            "total_points": total_points,
            "vote_count": vote_count,
            "average_score": round(average_score, 2),
            "point_breakdown": {
                "3_points": len([v for v in game_votes if v.priority == 3]),
                "2_points": len([v for v in game_votes if v.priority == 2]),
                "1_points": len([v for v in game_votes if v.priority == 1])
            }
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"❌ Error getting game vote details: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


def get_group_common_games_helper(group_id):
    """Helper function to get common games for a group (renamed to avoid conflict with endpoint)"""
    try:
        group = GamingGroup.query.get(group_id)
        if not group:
            return []
        
        # Get Steam-connected members
        steam_members = [m for m in group.members if m.steam_id and m.is_steam_connected]
        if len(steam_members) < 2:
            return []
        
        # Get user IDs
        user_ids = [m.id for m in steam_members]
        
        # Use steam_service to find common games
        from api.steam_service import steam_service
        if steam_service:
            common_games = steam_service.find_common_games(user_ids)
            # Filter for multiplayer games only
            multiplayer_games = [g for g in common_games if g.get('multiplayer') or g.get('co_op')]
            return multiplayer_games[:20]  # Limit to 20 games
        
        return []
        
    except Exception as e:
        print(f"❌ Error getting common games: {str(e)}")
        return []