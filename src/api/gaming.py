"""
Gaming group management routes - PROPER LEAVE/DELETE LOGIC
Creator can DELETE group, members can LEAVE, auto-cleanup empty groups
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
# 🔧 FIXED: Removed 'Vote' from imports since it doesn't exist
from api.models import db, User, GamingGroup, GameSession, SteamGame
from api.utils import APIException
import secrets
import string
import json
from datetime import datetime

gaming = Blueprint('gaming', __name__)

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
        
        # 🔧 FIXED: Use correct relationship name
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
        
        # 🔧 FIXED: Use correct relationship name
        # Get groups where user is a member
        user_groups = user.member_of_groups
        
        return jsonify({
            "success": True,
            "groups": [group.serialize() for group in user_groups]
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"❌ Error getting user groups: {str(e)}")
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
        print(f"❌ Error getting group: {str(e)}")
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
        
        # Add user to group
        group.members.append(user)
        db.session.commit()
        
        print(f"🎉 {user.username} joined group '{group.name}' via invite")
        
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
        print(f"❌ Error joining group: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


# ============================================================================
# VOTING SYSTEM IMPLEMENTATION
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
        
        # Check for active session
        active_session = GameSession.query.filter_by(
            group_id=group_id,
            status='voting'
        ).first()
        
        if active_session:
            # Get common games for this session
            common_games = get_group_common_games(group_id)
            
            return jsonify({
                "success": True,
                "session": active_session.serialize(),
                "votable_games": common_games
            }), 200
        else:
            return jsonify({
                "success": True,
                "session": None
            }), 200
            
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"❌ Error checking active session: {str(e)}")
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
        existing_session = GameSession.query.filter_by(
            group_id=group_id,
            status='voting'
        ).first()
        
        if existing_session:
            raise APIException("A voting session is already active for this group", status_code=400)
        
        data = request.get_json()
        session_name = data.get('session_name', f'Vote Session - {datetime.utcnow().strftime("%Y-%m-%d %H:%M")}')
        description = data.get('description', 'Vote for the next game to play!')
        
        # Create new voting session
        session = GameSession(
            group_id=group_id,
            session_name=session_name,
            description=description,
            status='voting',
            vote_results=json.dumps({})  # Initialize empty vote results
        )
        
        db.session.add(session)
        db.session.commit()
        
        # Get common games for voting
        common_games = get_group_common_games(group_id)
        
        print(f"✅ Voting session started for group {group_id}: {session.id}")
        
        return jsonify({
            "success": True,
            "message": "Voting session started",
            "session": session.serialize(),
            "common_games": common_games
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
    """Submit votes for a voting session"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        session = GameSession.query.get(session_id)
        
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
        
        # Load existing vote results
        try:
            vote_results = json.loads(session.vote_results) if session.vote_results else {}
        except:
            vote_results = {}
        
        # Initialize vote structure if needed
        if 'votes' not in vote_results:
            vote_results['votes'] = {}
        if 'voters' not in vote_results:
            vote_results['voters'] = {}
        
        # Check if user already voted
        user_id_str = str(current_user_id)
        if user_id_str in vote_results['voters']:
            raise APIException("You have already voted in this session", status_code=400)
        
        # Process votes
        user_votes = []
        for vote in game_votes:
            game_id = str(vote.get('game_id'))
            priority = vote.get('priority', 1)
            
            if game_id not in vote_results['votes']:
                vote_results['votes'][game_id] = {'total_points': 0, 'vote_count': 0, 'voters': []}
            
            # Add points based on priority (higher priority = more points)
            vote_results['votes'][game_id]['total_points'] += priority
            vote_results['votes'][game_id]['vote_count'] += 1
            vote_results['votes'][game_id]['voters'].append({
                'user_id': current_user_id,
                'username': user.username,
                'points': priority
            })
            
            user_votes.append({'game_id': game_id, 'points': priority})
        
        # Record that this user has voted
        vote_results['voters'][user_id_str] = {
            'username': user.username,
            'votes': user_votes,
            'voted_at': datetime.utcnow().isoformat()
        }
        
        # Update session with new vote results
        session.vote_results = json.dumps(vote_results)
        
        # Check if all members have voted (optional: auto-close session)
        total_members = len(group.members)
        total_voters = len(vote_results['voters'])
        
        if total_voters >= total_members:
            session.status = 'completed'
            print(f"🏁 Voting session {session_id} auto-completed: all members voted")
        
        db.session.commit()
        
        print(f"✅ Vote submitted by {user.username} for session {session_id}")
        
        return jsonify({
            "success": True,
            "message": "Vote submitted successfully",
            "session_status": session.status,
            "total_voters": total_voters,
            "total_members": total_members
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error submitting vote: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/results', methods=['GET'])
@jwt_required()
def get_session_results(session_id):
    """Get results for a voting session"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        group = session.group
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Load vote results
        try:
            vote_results = json.loads(session.vote_results) if session.vote_results else {}
        except:
            vote_results = {}
        
        votes = vote_results.get('votes', {})
        voters = vote_results.get('voters', {})
        
        if not votes:
            return jsonify({
                "success": True,
                "session": session.serialize(),
                "results": [],
                "winner": None,
                "total_voters": 0,
                "voting_complete": session.status == 'completed'
            }), 200
        
        # Get game details and calculate results
        results = []
        for game_id, vote_data in votes.items():
            try:
                game = SteamGame.query.get(int(game_id))
                if game:
                    results.append({
                        "game": game.serialize(),
                        "total_points": vote_data['total_points'],
                        "vote_count": vote_data['vote_count'],
                        "average_score": vote_data['total_points'] / vote_data['vote_count'] if vote_data['vote_count'] > 0 else 0
                    })
            except ValueError:
                # Skip invalid game IDs
                continue
        
        # Sort by total points (highest first)
        results.sort(key=lambda x: x['total_points'], reverse=True)
        
        # Determine winner
        winner = results[0] if results else None
        
        return jsonify({
            "success": True,
            "session": session.serialize(),
            "results": results,
            "winner": winner,
            "total_voters": len(voters),
            "total_members": len(group.members),
            "voting_complete": session.status == 'completed'
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
        
        # Only group creator can close the session
        if group.creator_id != current_user_id:
            raise APIException("Only the group creator can close voting sessions", status_code=403)
        
        if session.status != 'voting':
            raise APIException("Session is not active", status_code=400)
        
        session.status = 'completed'
        db.session.commit()
        
        print(f"🔒 Voting session {session_id} closed by creator")
        
        return jsonify({
            "success": True,
            "message": "Voting session closed"
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error closing session: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


def get_group_common_games(group_id):
    """Helper function to get common games for a group"""
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


# ============================================================================
# SUMMARY OF THE LOGIC:
# ============================================================================
# """
# 👑 CREATOR POWERS:
#    - DELETE group (removes everyone, deletes all sessions)
#    - KICK any member
#    - LEAVE group (transfers ownership or auto-deletes if empty)
#    - CLOSE voting sessions

# 👤 MEMBER POWERS:
#    - LEAVE group (just removes them)
#    - START voting sessions
#    - VOTE in sessions
#    - VIEW results

# 🗳️ VOTING FEATURES:
#    - Start voting sessions for game selection
#    - Submit ranked votes for multiple games
#    - View real-time results
#    - Auto-complete when all members vote
#    - Creator can manually close sessions

# 🤖 AUTO-CLEANUP:
#    - Empty groups are automatically deleted
#    - Ownership is transferred if creator leaves but others remain
#    - Sessions auto-complete when all members vote

# 🚫 PREVENTS:
#    - Orphaned empty groups
#    - Members deleting groups (only creators can)
#    - Kicking yourself (use leave/delete instead)
#    - Multiple active voting sessions per group
#    - Double voting in same session
# """

# src/api/gaming.py - ADD this join endpoint to your existing file

@gaming.route('/groups/join/<invite_code>', methods=['POST'])
@jwt_required()
def join_group_by_invite_endpoint(invite_code):
    """
    JOIN a group using an invite code via API endpoint
    This is the missing endpoint that JoinGroup.jsx is trying to call
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            raise APIException("User not found", status_code=404)
        
        # Find group by invite code
        group = GamingGroup.query.filter_by(invite_code=invite_code).first()
        
        if not group:
            raise APIException("Invalid or expired invite code", status_code=404)
        
        # Check if user is already a member
        if user in group.members:
            return jsonify({
                "success": True,
                "message": f"You're already a member of '{group.name}'",
                "group": group.serialize(),
                "already_member": True
            }), 200
        
        # Check if group is full
        if len(group.members) >= group.max_members:
            raise APIException("Group is full", status_code=400)
        
        # Add user to group
        group.members.append(user)
        db.session.commit()
        
        print(f"🎉 {user.username} joined group '{group.name}' via invite code {invite_code}")
        
        return jsonify({
            "success": True,
            "message": f"Successfully joined '{group.name}'!",
            "group": group.serialize()
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error in join_group_by_invite_endpoint: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/validate-invite/<invite_code>', methods=['GET'])
@jwt_required()
def validate_invite_code(invite_code):
    """
    VALIDATE an invite code without joining - useful for previewing group info
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            raise APIException("User not found", status_code=404)
        
        # Find group by invite code
        group = GamingGroup.query.filter_by(invite_code=invite_code).first()
        
        if not group:
            raise APIException("Invalid or expired invite code", status_code=404)
        
        # Check current status
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
        print(f"❌ Error validating invite code: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500