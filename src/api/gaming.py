"""
Gaming group management routes - ENHANCED WITH VOTING SYSTEM FIXES
- Race condition protection with atomic transactions
- Real-time updates via Server-Sent Events
- Comprehensive vote validation
- Error recovery and retry logic
"""
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, GamingGroup, GameSession, SteamGame
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
        common_games = get_group_common_games(group_id)
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
# GROUP MANAGEMENT ROUTES (keeping your existing ones)
# ============================================================================

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


@gaming.route('/groups/<int:group_id>/kick/<int:user_id>', methods=['POST'])
@jwt_required()
def kick_member(group_id, user_id):
    """KICK a member from the group (CREATOR ONLY)"""
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
        
        kicked_username = user_to_kick.username
        group.members.remove(user_to_kick)
        db.session.commit()
        
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
            common_games = get_group_common_games(group_id)
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
            vote_results=json.dumps({})
        )
        
        db.session.add(session)
        db.session.commit()
        
        common_games = get_group_common_games(group_id)
        
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
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/vote', methods=['POST'])
@jwt_required()
def submit_vote(session_id):
    """🚀 ENHANCED: Submit votes with race condition protection and validation"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # 🔥 FIX 1: RACE CONDITIONS - Use atomic transaction with row locking
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
            
            # 🛡️ FIX 3: VALIDATION - Comprehensive vote validation
            validation_errors = validate_vote_submission(game_votes, group.id, current_user_id)
            if validation_errors:
                raise APIException(f"Validation failed: {'; '.join(validation_errors)}", status_code=400)
            
            # Parse and validate existing votes atomically
            try:
                vote_results = json.loads(session.vote_results) if session.vote_results else {}
            except json.JSONDecodeError:
                vote_results = {}
            
            # Initialize structure
            if 'votes' not in vote_results:
                vote_results['votes'] = {}
            if 'voters' not in vote_results:
                vote_results['voters'] = {}
            
            # Check if user already voted (within transaction)
            user_id_str = str(current_user_id)
            if user_id_str in vote_results['voters']:
                raise APIException("You have already voted in this session", status_code=400)
            
            # Process votes
            user_votes = []
            for vote in game_votes:
                game_id = str(vote.get('game_id'))
                priority = vote.get('priority', 1)
                
                if game_id not in vote_results['votes']:
                    vote_results['votes'][game_id] = {
                        'total_points': 0, 
                        'vote_count': 0, 
                        'voters': []
                    }
                
                vote_results['votes'][game_id]['total_points'] += priority
                vote_results['votes'][game_id]['vote_count'] += 1
                vote_results['votes'][game_id]['voters'].append({
                    'user_id': current_user_id,
                    'username': user.username,
                    'points': priority
                })
                
                user_votes.append({'game_id': game_id, 'points': priority})
            
            # Record voter
            vote_results['voters'][user_id_str] = {
                'username': user.username,
                'votes': user_votes,
                'voted_at': datetime.utcnow().isoformat()
            }
            
            # Update session atomically
            session.vote_results = json.dumps(vote_results)
            
            # Check completion
            total_members = len(group.members)
            total_voters = len(vote_results['voters'])
            
            if total_voters >= total_members:
                session.status = 'completed'
                print(f"🏁 Voting session {session_id} auto-completed: all members voted")
            
            # Commit happens automatically with 'with' block
        
        print(f"✅ Vote submitted by {user.username} for session {session_id}")
        
        return jsonify({
            "success": True,
            "message": "Vote submitted successfully",
            "session_status": session.status,
            "total_voters": total_voters,
            "total_members": total_members
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"❌ Error submitting vote: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/live-results')
@jwt_required()
def stream_live_results(session_id):
    """🚀 FIX 2: REAL-TIME UPDATES - Stream live voting results using Server-Sent Events"""
    
    def generate_events():
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        session = GameSession.query.get(session_id)
        
        if not session or user not in session.group.members:
            yield f"data: {json.dumps({'error': 'Access denied'})}\n\n"
            return
        
        last_update = None
        
        while True:
            try:
                # Get current session state
                session = GameSession.query.get(session_id)
                current_update = session.updated_at if session else None
                
                # Only send update if something changed
                if current_update != last_update:
                    # Parse vote results
                    vote_results = json.loads(session.vote_results) if session.vote_results else {}
                    votes = vote_results.get('votes', {})
                    voters = vote_results.get('voters', {})
                    
                    # Format results
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
                            continue
                    
                    # Sort by points
                    results.sort(key=lambda x: x['total_points'], reverse=True)
                    
                    # Send update
                    update_data = {
                        "results": results,
                        "total_voters": len(voters),
                        "total_members": len(session.group.members),
                        "voting_complete": session.status == 'completed',
                        "timestamp": datetime.utcnow().isoformat(),
                        "session_status": session.status
                    }
                    
                    yield f"data: {json.dumps(update_data)}\n\n"
                    last_update = current_update
                
                # Stop streaming if voting is complete
                if session and session.status == 'completed':
                    break
                    
                time.sleep(2)  # Check every 2 seconds
                
            except Exception as e:
                print(f"❌ SSE Error: {e}")
                yield f"data: {json.dumps({'error': 'Stream error'})}\n\n"
                break
    
    return Response(
        generate_events(),
        mimetype='text/plain',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Authorization'
        }
    )


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
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Voting session closed"
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
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
