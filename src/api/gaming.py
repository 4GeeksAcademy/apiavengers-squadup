"""
Gaming group management routes - COMPLETE ENHANCED VERSION WITH LIVE VOTING
- Race condition protection with atomic transactions
- Real-time updates via Server-Sent Events
- Comprehensive vote validation
- Error recovery and retry logic
- Ownership transfer functionality
- Enhanced member management
- Live voting status streams
- Improved parameter validation
- Compatible with enhanced Vote model from models.py
"""
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, GamingGroup, GameSession, SteamGame, Vote
from api.utils import APIException
import secrets
import string
import json
import time
import logging
import queue
import threading
from datetime import datetime, timezone
from functools import wraps
from sqlalchemy import func, desc

gaming = Blueprint('gaming', __name__)

# ============================================================================
# SSE MANAGER FOR PROPER CONNECTION HANDLING
# ============================================================================

class VotingSSEManager:
    """Manages Server-Sent Events connections for real-time voting updates"""
    def __init__(self):
        self.listeners = {}  # session_id -> list of queues
        self.lock = threading.Lock()
    
    def add_listener(self, session_id, listener_queue):
        with self.lock:
            if session_id not in self.listeners:
                self.listeners[session_id] = []
            self.listeners[session_id].append(listener_queue)
    
    def remove_listener(self, session_id, listener_queue):
        with self.lock:
            if session_id in self.listeners:
                try:
                    self.listeners[session_id].remove(listener_queue)
                    if not self.listeners[session_id]:
                        del self.listeners[session_id]
                except ValueError:
                    pass
    
    def broadcast_update(self, session_id, data):
        with self.lock:
            if session_id in self.listeners:
                dead_listeners = []
                for i, listener in enumerate(self.listeners[session_id]):
                    try:
                        listener.put_nowait(data)
                    except queue.Full:
                        dead_listeners.append(listener)
                
                # Remove dead listeners
                for dead_listener in dead_listeners:
                    try:
                        self.listeners[session_id].remove(dead_listener)
                    except ValueError:
                        pass

# Initialize the SSE manager
voting_sse_manager = VotingSSEManager()

# ============================================================================
# ENHANCED VALIDATION FUNCTIONS (MERGED FROM BOTH FILES)
# ============================================================================

def validate_group_id(f):
    """Enhanced decorator to validate group ID parameter with detailed error handling"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        group_id = kwargs.get('group_id') or request.view_args.get('group_id')
        
        # Check for invalid group IDs
        if not group_id or group_id == 'undefined' or group_id == 'null':
            logging.error(f"Invalid group_id received: {group_id}")
            return jsonify({
                'error': 'Invalid group ID provided',
                'code': 'INVALID_GROUP_ID'
            }), 400
            
        # Validate group ID format (assuming integer)
        try:
            group_id_int = int(group_id)
            if group_id_int <= 0:
                raise ValueError("Group ID must be positive")
            kwargs['group_id'] = group_id_int
        except (ValueError, TypeError):
            logging.error(f"Group ID is not a valid integer: {group_id}")
            return jsonify({
                'error': 'Group ID must be a valid positive integer',
                'code': 'INVALID_GROUP_ID_FORMAT'
            }), 400
            
        return f(*args, **kwargs)
    return decorated_function


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
        logging.error(f"Error validating games: {str(e)}")
    
    return errors


def serialize_group_safe(group):
    """Enhanced safely serialize group data with validation (from File 1)"""
    if not group or not hasattr(group, 'id'):
        logging.error(f"Invalid group object for serialization: {group}")
        return None
        
    try:
        return {
            'id': group.id,
            'name': group.name or 'Unnamed Group',
            'description': group.description,
            'creator': {
                'id': group.creator.id,
                'username': group.creator.username
            } if group.creator else None,
            'current_members': len(group.members) if group.members else 0,
            'max_members': group.max_members or 10,
            'invite_code': group.invite_code,
            'is_public': group.is_public or False,
            'created_at': group.created_at.isoformat() if group.created_at else None,
            'members': [
                {
                    'id': member.id,
                    'username': member.username,
                    'steam_connected': member.steam_connected or False,
                    'total_games': member.total_games or 0
                } for member in (group.members or [])
            ]
        }
    except Exception as e:
        logging.error(f"Error serializing group {group.id if group else 'None'}: {str(e)}")
        return None


# ============================================================================
# HELPER FUNCTIONS FOR LIVE VOTING SUPPORT
# ============================================================================

def get_session_results_data(session_id):
    """Helper function to get session results data for live updates"""
    session = GameSession.query.get_or_404(session_id)
    
    # Get all votes for this session using Vote model
    votes = Vote.query.filter_by(session_id=session_id).all()
    
    # Calculate game results
    game_scores = {}
    total_voters = len(set(vote.user_id for vote in votes))
    
    for vote in votes:
        game_id = vote.game_id
        priority = vote.priority
        
        if game_id not in game_scores:
            game_scores[game_id] = {
                'total_points': 0,
                'vote_count': 0,
                'voters': set()
            }
        
        game_scores[game_id]['total_points'] += priority
        game_scores[game_id]['vote_count'] += 1
        game_scores[game_id]['voters'].add(vote.user_id)
    
    # Get game details and create results
    results = []
    for game_id, scores in game_scores.items():
        game = SteamGame.query.get(game_id)
        if game:
            results.append({
                'game': {
                    'id': game.id,
                    'name': game.name,
                    'header_image': game.header_image,
                    'short_description': game.short_description,
                    'genres': game.genres.split(',') if game.genres else [],
                    'multiplayer': game.multiplayer
                },
                'total_points': scores['total_points'],
                'vote_count': len(scores['voters']),
                'average_score': scores['total_points'] / len(scores['voters']) if scores['voters'] else 0
            })
    
    # Sort by total points, then by vote count
    results.sort(key=lambda x: (x['total_points'], x['vote_count']), reverse=True)
    
    # Get total member count
    total_members = len(session.group.members) if session.group else 0
    
    # Determine if voting is complete
    voting_complete = (session.status == 'completed' or 
                      (total_voters >= total_members * 0.8 and total_voters >= 2))
    
    # Auto-complete session if threshold met
    if voting_complete and session.status == 'voting':
        session.status = 'completed'
        session.updated_at = datetime.utcnow()
        
        # Set winner if we have results
        if results:
            winner = results[0]
            # Store winner info in session if your model supports it
            try:
                session.vote_results = json.dumps({
                    'winner_game_id': winner['game']['id'],
                    'winner_points': winner['total_points'],
                    'winner_votes': winner['vote_count']
                })
            except:
                pass
        
        db.session.commit()
    
    return {
        'results': results,
        'total_voters': total_voters,
        'total_members': total_members,
        'voting_complete': voting_complete,
        'session_status': session.status,
        'winner': results[0] if results and voting_complete else None,
        'timestamp': datetime.utcnow().isoformat()
    }


def get_voter_status_data(session_id):
    """Helper function to get voter status data for live updates"""
    session = GameSession.query.get_or_404(session_id)
    
    # Get all group members
    members = session.group.members if session.group else []
    
    # Get users who have voted
    voted_user_ids = set()
    votes = Vote.query.filter_by(session_id=session_id).all()
    for vote in votes:
        voted_user_ids.add(vote.user_id)
    
    # Separate into voted and pending
    recent_voters = []
    pending_voters = []
    
    for member in members:
        user_data = {
            'id': member.id,
            'username': member.username,
            'avatar_url': getattr(member, 'avatar_url', None) or getattr(member, 'steam_avatar_url', None)
        }
        
        if member.id in voted_user_ids:
            recent_voters.append(user_data)
        else:
            pending_voters.append(user_data)
    
    # Sort recent voters by vote time (most recent first)
    vote_times = {}
    for vote in votes:
        if vote.user_id not in vote_times or vote.created_at > vote_times[vote.user_id]:
            vote_times[vote.user_id] = vote.created_at
    
    recent_voters.sort(key=lambda x: vote_times.get(x['id'], datetime.min), reverse=True)
    
    # Calculate progress
    total_members = len(members)
    voted_count = len(voted_user_ids)
    progress_percentage = (voted_count / total_members * 100) if total_members > 0 else 0
    
    # Check if voting is complete
    voting_complete = (session.status == 'completed' or 
                      (voted_count >= total_members * 0.8 and voted_count >= 2))
    
    return {
        'progress': {
            'voted': voted_count,
            'total': total_members,
            'percentage': round(progress_percentage, 1)
        },
        'recent_voters': recent_voters,
        'pending_voters': pending_voters,
        'voting_complete': voting_complete,
        'session_status': session.status,
        'timestamp': datetime.utcnow().isoformat()
    }


# ============================================================================
# GROUP MANAGEMENT ROUTES - ENHANCED WITH OWNERSHIP TRANSFER
# ============================================================================

@gaming.route('/groups/<int:group_id>/transfer-ownership/<int:user_id>', methods=['POST'])
@jwt_required()
@validate_group_id
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
        
        logging.info(f"Transferring ownership of group '{group.name}' from {old_creator_username} to {new_creator_username}")
        
        # Transfer ownership
        group.creator_id = user_id
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Group ownership transferred to {new_creator_username}",
            "action": "ownership_transferred",
            "old_creator": old_creator_username,
            "new_creator": new_creator_username,
            "group": serialize_group_safe(group) or group.serialize()
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        logging.error(f"Unexpected error in transfer_group_ownership: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/members', methods=['GET'])
@jwt_required()
@validate_group_id
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
        logging.error(f"Error getting group members: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/common-games', methods=['GET'])
@jwt_required()
@validate_group_id
def get_group_common_games(group_id):
    """Enhanced: Get common games for a group with comprehensive validation"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Find the group with additional validation
        group = GamingGroup.query.get(group_id)
        if not group:
            logging.warning(f"Group {group_id} not found for user {user.id}")
            return jsonify({
                'error': 'Group not found',
                'code': 'GROUP_NOT_FOUND'
            }), 404
            
        # Check if user is a member of the group
        if user not in group.members:
            logging.warning(f"User {user.id} attempted to access group {group_id} without membership")
            return jsonify({
                'error': 'You are not a member of this group',
                'code': 'ACCESS_DENIED'
            }), 403
            
        # Get Steam-connected members
        steam_members = [member for member in group.members if member.steam_connected]
        
        if len(steam_members) < 2:
            return jsonify({
                'games': [],
                'message': 'Need at least 2 Steam-connected members to find common games',
                'steam_connected_count': len(steam_members),
                'total_members': len(group.members)
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
                'games': multiplayer_games[:20],  # Limit to 20 games
                'group_id': group.id,
                'steam_connected_count': len(steam_members),
                'total_members': len(group.members),
                'total_games': len(multiplayer_games)
            }), 200
        else:
            return jsonify({
                'error': 'Steam service not available',
                'code': 'SERVICE_UNAVAILABLE'
            }), 503
        
    except Exception as e:
        logging.error(f"Error getting common games for group {group_id}: {str(e)}")
        return jsonify({
            'error': 'Internal server error while fetching common games',
            'code': 'INTERNAL_ERROR'
        }), 500


@gaming.route('/groups/<int:group_id>/kick/<int:user_id>', methods=['POST'])
@jwt_required()
@validate_group_id
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
        
        logging.info(f"Kicking {kicked_username} from group '{group_name}'")
        
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
                logging.info(f"Removed {votes_removed} votes from {len(active_sessions)} active sessions")
        except Exception as cleanup_error:
            logging.warning(f"Error cleaning up user votes: {cleanup_error}")
            # Don't fail the kick operation for cleanup errors
        
        db.session.commit()
        
        logging.info(f"Successfully kicked {kicked_username} from group '{group_name}'")
        
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
        logging.error(f"Unexpected error in kick_member: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/leave', methods=['POST'])
@jwt_required()
@validate_group_id
def leave_group(group_id):
    """Enhanced leave group with better validation and error handling"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({
                'error': 'Group not found',
                'code': 'GROUP_NOT_FOUND'
            }), 404
            
        if user not in group.members:
            return jsonify({
                'error': 'You are not a member of this group',
                'code': 'NOT_A_MEMBER'
            }), 400
            
        is_creator = (group.creator_id == user.id)
        member_count = len(group.members)
        
        logging.info(f"User {user.id} ({user.username}) leaving group {group.id} ({group.name}). "
                    f"Is creator: {is_creator}, Member count: {member_count}")
        
        # Handle different leave scenarios
        if is_creator and member_count > 1:
            # Transfer ownership to another member
            other_members = [m for m in group.members if m.id != user.id]
            new_creator = other_members[0]  # Pick first available member
            
            group.creator_id = new_creator.id
            group.members.remove(user)
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'action': 'left_with_transfer',
                'message': f'Left group. Ownership transferred to {new_creator.username}',
                'new_creator': new_creator.username,
                'group_deleted': False
            }), 200
            
        elif is_creator and member_count == 1:
            # Last member and creator - delete the group
            group_name = group.name
            db.session.delete(group)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'action': 'auto_deleted',
                'message': f'Group "{group_name}" was deleted (you were the last member)',
                'group_deleted': True
            }), 200
            
        else:
            # Regular member leaving
            group.members.remove(user)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'action': 'member_left',
                'message': f'Successfully left "{group.name}"',
                'group_deleted': False
            }), 200
            
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error in leave_group for group {group_id}, user {current_user_id}: {str(e)}")
        return jsonify({
            'error': 'Internal server error while leaving group',
            'code': 'INTERNAL_ERROR'
        }), 500


@gaming.route('/groups/<int:group_id>/delete', methods=['DELETE'])
@jwt_required()
@validate_group_id
def delete_group(group_id):
    """Enhanced delete group with validation"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({
                'error': 'Group not found',
                'code': 'GROUP_NOT_FOUND'
            }), 404
            
        if group.creator_id != user.id:
            return jsonify({
                'error': 'Only the group creator can delete the group',
                'code': 'INSUFFICIENT_PERMISSIONS'
            }), 403
            
        group_name = group.name
        member_count = len(group.members)
        
        logging.info(f"User {user.id} deleting group {group.id} ({group_name}) with {member_count} members")
        
        # Delete the group (cascade should handle related records)
        db.session.delete(group)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Group "{group_name}" deleted successfully',
            'group_deleted': True
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting group {group_id}: {str(e)}")
        return jsonify({
            'error': 'Internal server error while deleting group',
            'code': 'INTERNAL_ERROR'
        }), 500


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
            "group": serialize_group_safe(group) or group.serialize()
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
    """Enhanced groups list endpoint with safe serialization"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Get user's groups with proper joins
        user_groups = GamingGroup.query.filter(
            GamingGroup.members.contains(user)
        ).all()
        
        # Serialize groups safely
        serialized_groups = []
        for group in user_groups:
            serialized = serialize_group_safe(group)
            if serialized:  # Only add valid serialized groups
                serialized_groups.append(serialized)
            else:
                logging.warning(f"Skipping invalid group in serialization for user {user.id}")
        
        logging.info(f"Returning {len(serialized_groups)} valid groups for user {user.id}")
        
        return jsonify({
            'success': True,
            'groups': serialized_groups,
            'total': len(serialized_groups)
        }), 200
        
    except Exception as e:
        logging.error(f"Error getting groups for user {current_user_id}: {str(e)}")
        return jsonify({
            'error': 'Internal server error while fetching groups',
            'code': 'INTERNAL_ERROR'
        }), 500


@gaming.route('/groups/<int:group_id>', methods=['GET'])
@jwt_required()
@validate_group_id
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
            "group": serialize_group_safe(group) or group.serialize()
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
            "group": serialize_group_safe(group) or group.serialize()
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
# ENHANCED VOTING SYSTEM WITH LIVE UPDATES
# ============================================================================

@gaming.route('/groups/<int:group_id>/active-session', methods=['GET'])
@jwt_required()
@validate_group_id
def get_active_session(group_id):
    """Get the currently active voting session for a group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Find active session
        active_session = GameSession.query.filter_by(
            group_id=group_id, 
            status='voting'
        ).order_by(desc(GameSession.created_at)).first()
        
        if not active_session:
            return jsonify({"success": True, "session": None}), 200
        
        # Get votable games count and vote statistics
        common_games = get_group_common_games_helper(group_id)
        vote_count = Vote.query.filter_by(session_id=active_session.id).count()
        unique_voters = Vote.get_voter_count(active_session.id)
        
        return jsonify({
            "success": True,
            "session": {
                'id': active_session.id,
                'session_name': active_session.session_name,
                'description': active_session.description,
                'status': active_session.status,
                'created_at': active_session.created_at.isoformat(),
                'group_id': active_session.group_id,
                'games_count': len(common_games),
                'total_voters': unique_voters,
                'vote_count': vote_count
            },
            "votable_games": common_games
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        logging.error(f"Error getting active session: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/groups/<int:group_id>/start-vote', methods=['POST'])
@jwt_required()
@validate_group_id
def start_voting_session(group_id):
    """Enhanced start voting session with live voting support"""
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
        
        # Get common games for the group
        common_games = get_group_common_games_helper(group_id)
        
        if not common_games:
            raise APIException("No common multiplayer games found for this group", status_code=400)
        
        data = request.get_json()
        session_name = data.get('session_name', f'Squad Vote - {datetime.now().strftime("%m/%d %H:%M")}')
        description = data.get('description', 'Vote for the next game to play!')
        
        session = GameSession(
            group_id=group_id,
            session_name=session_name,
            description=description,
            status='voting',
            vote_results=json.dumps({
                'auto_complete_threshold': data.get('auto_complete_threshold', 0.8),
                'max_choices': data.get('max_choices', 3),
                'votable_games': [{
                    'id': game['id'],
                    'name': game['name'],
                    'header_image': game.get('header_image', ''),
                    'short_description': game.get('short_description', ''),
                    'genres': game.get('genres', []),
                    'multiplayer': game.get('multiplayer', True)
                } for game in common_games]
            })
        )
        
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Voting session started successfully",
            "session": {
                'id': session.id,
                'session_name': session.session_name,
                'description': session.description,
                'status': session.status,
                'created_at': session.created_at.isoformat(),
                'group_id': session.group_id,
                'games_count': len(common_games)
            },
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
        logging.error(f"Error starting voting session: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/vote', methods=['POST'])
@jwt_required()
def submit_vote(session_id):
    """🚀 ENHANCED: Submit votes with SSE broadcast and atomic transactions"""
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
            
            # Auto-complete if all members voted or threshold reached
            auto_complete_threshold = 0.8  # Default threshold
            try:
                # Try to get threshold from session vote_results
                if session.vote_results:
                    vote_config = json.loads(session.vote_results)
                    auto_complete_threshold = vote_config.get('auto_complete_threshold', 0.8)
            except:
                pass
            
            if (total_voters >= total_members or 
                (total_voters >= total_members * auto_complete_threshold and total_voters >= 2)):
                session.status = 'completed'
                session.updated_at = datetime.utcnow()
                logging.info(f"Voting session {session_id} auto-completed: {total_voters}/{total_members} members voted")
            
            # Update session timestamp
            session.updated_at = datetime.utcnow()
            
            # Commit happens automatically with 'with' block
        
        # CRITICAL: Broadcast update to all SSE listeners AFTER successful commit
        try:
            updated_results = get_session_results_data(session_id)
            voting_sse_manager.broadcast_update(session_id, updated_results)
            logging.info(f"Broadcasted SSE update for session {session_id}")
        except Exception as sse_error:
            logging.error(f"Failed to broadcast SSE update: {sse_error}")
            # Don't fail the vote submission for SSE errors
        
        logging.info(f"Vote submitted by {user.username} for session {session_id} ({len(created_votes)} votes)")
        
        return jsonify({
            "success": True,
            "message": "Vote submitted successfully",
            "session_status": session.status,
            "total_voters": total_voters,
            "total_members": total_members,
            "votes_created": len(created_votes),
            "voting_complete": session.status == 'completed'
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        logging.error(f"Error submitting vote: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


# ============================================================================
# LIVE VOTING UPDATES - SERVER-SENT EVENTS
# ============================================================================

@gaming.route('/sessions/<int:session_id>/live-results', methods=['GET'])
@jwt_required()
def stream_live_results(session_id):
    """🚀 ENHANCED: Server-Sent Events endpoint for real-time voting results"""
    
    def generate_live_updates():
        """Generator function for SSE updates"""
        try:
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            session = GameSession.query.get(session_id)
            
            if not session or user not in session.group.members:
                yield f"data: {json.dumps({'error': 'Access denied'})}\n\n"
                return
            
            last_vote_count = 0
            update_count = 0
            
            # Send initial data
            try:
                results_data = get_session_results_data(session_id)
                yield f"data: {json.dumps(results_data)}\n\n"
                last_vote_count = results_data.get('total_voters', 0)
                update_count += 1
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                return
            
            # Continue sending updates while session is active
            while session.status == 'voting' and update_count < 1000:
                try:
                    time.sleep(2)  # Check every 2 seconds
                    
                    # Refresh session status
                    db.session.refresh(session)
                    
                    # Get updated results
                    new_results = get_session_results_data(session_id)
                    current_vote_count = new_results.get('total_voters', 0)
                    
                    # Send update if there are changes or it's a heartbeat
                    if (current_vote_count != last_vote_count or 
                        new_results.get('voting_complete') != results_data.get('voting_complete') or
                        update_count % 15 == 0):  # Send heartbeat every 30 seconds
                        
                        results_data = new_results
                        yield f"data: {json.dumps(results_data)}\n\n"
                        last_vote_count = current_vote_count
                        update_count += 1
                    
                    # Stop if voting is complete
                    if new_results.get('voting_complete'):
                        break
                        
                except Exception as e:
                    logging.error(f"SSE Error: {e}")
                    yield f"data: {json.dumps({'error': 'Connection error'})}\n\n"
                    break
            
            # Send final update
            try:
                final_results = get_session_results_data(session_id)
                yield f"data: {json.dumps(final_results)}\n\n"
            except:
                pass
                
        except Exception as e:
            logging.error(f"SSE Setup Error: {e}")
            yield f"data: {json.dumps({'error': 'Authentication error'})}\n\n"
    
    return Response(
        generate_live_updates(),
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


@gaming.route('/sessions/<int:session_id>/voter-status-stream', methods=['GET'])
@jwt_required()
def voter_status_stream(session_id):
    """🚀 ENHANCED: Server-Sent Events endpoint for real-time voter status with proper connection handling"""
    current_user_id = get_jwt_identity()
    
    # Verify session access
    session = GameSession.query.get_or_404(session_id)
    user = User.query.get(current_user_id)
    
    if not session or user not in session.group.members:
        return jsonify({'error': 'Access denied'}), 403
    
    def voter_event_stream():
        last_voter_count = 0
        
        try:
            while session.status == 'voting':
                # Get current voter status
                voter_data = get_voter_status_data(session_id)
                current_voter_count = voter_data.get('progress', {}).get('voted', 0)
                
                # Send update if there are changes
                if current_voter_count != last_voter_count:
                    yield f"data: {json.dumps(voter_data)}\n\n"
                    last_voter_count = current_voter_count
                
                # Check if voting is complete
                if voter_data.get('voting_complete'):
                    yield f"data: {json.dumps(voter_data)}\n\n"
                    break
                
                time.sleep(2)  # Poll every 2 seconds
                try:
                    db.session.refresh(session)
                except:
                    # Session might be deleted
                    break
                
        except GeneratorExit:
            pass
        except Exception as e:
            logging.error(f"Voter Status SSE Error: {e}")
            yield f"data: {json.dumps({'error': 'Connection error'})}\n\n"
    
    return Response(
        voter_event_stream(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type, Cache-Control',
            'Access-Control-Allow-Methods': 'GET'
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
        logging.error(f"Error getting session results: {str(e)}")
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
        logging.error(f"Error closing voting session: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


# ============================================================================
# SESSION MANAGEMENT ENDPOINTS (MISSING FROM FRONTEND)
# ============================================================================

@gaming.route('/groups/<int:group_id>/sessions', methods=['GET'])
@jwt_required()
@validate_group_id
def get_group_sessions(group_id):
    """Get all sessions for a group with optional filtering"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        group = GamingGroup.query.get(group_id)
        
        if not group:
            raise APIException("Group not found", status_code=404)
        if user not in group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Get query parameters
        limit = request.args.get('limit', type=int, default=10)
        status_filter = request.args.get('status')  # 'voting', 'completed', etc.
        include_stats = request.args.get('include_stats', 'false').lower() == 'true'
        
        # Build query
        query = GameSession.query.filter_by(group_id=group_id)
        
        if status_filter:
            query = query.filter(GameSession.status == status_filter)
        
        # Order by most recent first
        sessions = query.order_by(GameSession.created_at.desc()).limit(limit).all()
        
        # Serialize sessions
        sessions_data = []
        for session in sessions:
            session_data = session.serialize()
            
            if include_stats:
                # Add voting statistics
                total_voters = Vote.get_voter_count(session.id)
                total_members = len(group.members)
                
                session_data.update({
                    'total_voters': total_voters,
                    'total_members': total_members,
                    'participation_rate': (total_voters / total_members * 100) if total_members > 0 else 0,
                    'is_complete': session.status == 'completed'
                })
            
            sessions_data.append(session_data)
        
        return jsonify({
            "success": True,
            "sessions": sessions_data,
            "total": len(sessions_data),
            "group_id": group_id
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        logging.error(f"Error getting group sessions: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>', methods=['GET'])
@jwt_required()
def get_session_details(session_id):
    """Get detailed information about a specific session"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        if user not in session.group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Get votable games from session or group's common games
        votable_games = []
        if session.votable_games:
            try:
                votable_games = json.loads(session.votable_games)
            except:
                pass
        
        if not votable_games:
            # Fallback to group's common games
            votable_games = get_group_common_games_helper(session.group_id)
        
        return jsonify({
            "success": True,
            "session": session.serialize(),
            "votable_games": votable_games,
            "group": serialize_group_safe(session.group) or session.group.serialize()
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        logging.error(f"Error getting session details: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@gaming.route('/sessions/<int:session_id>/status', methods=['GET'])
@jwt_required()
def get_session_status(session_id):
    """Get current session status for polling fallback"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        if user not in session.group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Get current status data (same as SSE data)
        status_data = get_session_results_data(session_id)
        voter_data = get_voter_status_data(session_id)
        
        return jsonify({
            "success": True,
            "type": "status_update",
            "session_id": session_id,
            "status": session.status,
            "results": status_data,
            "voters": voter_data,
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        logging.error(f"Error getting session status: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


# ============================================================================
# ADDITIONAL VOTE MANAGEMENT ENDPOINTS
# ============================================================================

@gaming.route('/sessions/<int:session_id>/voters', methods=['GET'])
@jwt_required()
def get_session_voters(session_id):
    """Get voter status for a session"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        session = GameSession.query.get(session_id)
        
        if not session:
            raise APIException("Session not found", status_code=404)
        
        if user not in session.group.members:
            raise APIException("You are not a member of this group", status_code=403)
        
        # Get voter status data
        voter_data = get_voter_status_data(session_id)
        
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
                "avatar_url": getattr(member, 'avatar_url', None) or getattr(member, 'steam_avatar_url', None),
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
            "completion_rate": (len(voters) / len(session.group.members) * 100) if session.group.members else 0,
            **voter_data  # Include the live voter data as well
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        logging.error(f"Error getting session voters: {str(e)}")
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
        logging.error(f"Error getting user votes: {str(e)}")
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
        logging.error(f"Error getting game vote details: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


def get_group_common_games_helper(group_id):
    """Helper function to get common games for a group (renamed to avoid conflict with endpoint)"""
    try:
        group = GamingGroup.query.get(group_id)
        if not group:
            return []
        
        # Get Steam-connected members
        steam_members = [m for m in group.members if getattr(m, 'steam_id', None) and getattr(m, 'steam_connected', False)]
        if len(steam_members) < 2:
            return []
        
        # Get user IDs
        user_ids = [m.id for m in steam_members]
        
        # Use steam_service to find common games
        try:
            from api.steam_service import steam_service
            if steam_service:
                common_games = steam_service.find_common_games(user_ids)
                # Filter for multiplayer games only
                multiplayer_games = [g for g in common_games if g.get('multiplayer') or g.get('co_op')]
                return multiplayer_games[:20]  # Limit to 20 games
        except ImportError:
            logging.warning("Steam service not available")
        
        return []
        
    except Exception as e:
        logging.error(f"Error getting common games: {str(e)}")
        return []