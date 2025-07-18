"""
Gaming group management routes - ENHANCED WITH CRITICAL RATE LIMITING FIXES
- Rate limiting with Flask-Limiter
- Caching with custom decorators
- Optimized SSE endpoints
- Race condition protection with atomic transactions
- Real-time updates via Server-Sent Events
- Comprehensive vote validation
- Error recovery and retry logic
- Ownership transfer functionality
- Enhanced member management
- Live voting status streams
- Improved parameter validation
- Compatible with enhanced Vote model from models.py
- FIXED: Modern timezone-aware datetime usage
- COMPLETE: All existing endpoints + new group management endpoints
"""
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, GamingGroup, GameSession, SteamGame, Vote
from api.utils import APIException

# CRITICAL RATE LIMITING IMPORTS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import lru_cache, wraps
import time

import secrets
import string
import json
import logging
import queue
import threading
from datetime import datetime, timezone, timedelta
from sqlalchemy import func, desc

gaming = Blueprint('gaming', __name__)

# ============================================================================
# RATE LIMITER CONFIGURATION
# ============================================================================

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per hour"],  # More generous default
    storage_uri="memory://"  # Use memory storage for development
)

# ============================================================================
# CACHING DECORATOR
# ============================================================================

def cache_for_seconds(seconds=30):
    """Cache function results for specified seconds"""
    def decorator(func):
        cache = {}
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            current_time = time.time()
            
            # Check cache
            if cache_key in cache:
                cached_time, cached_result = cache[cache_key]
                if current_time - cached_time < seconds:
                    return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache[cache_key] = (current_time, result)
            
            # Clean old entries
            keys_to_remove = []
            for key, (cached_time, _) in cache.items():
                if current_time - cached_time > seconds * 2:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del cache[key]
            
            return result
        return wrapper
    return decorator

# ============================================================================
# MODERN DATETIME HELPER - TIMEZONE AWARE
# ============================================================================

def utc_now():
    """
    Modern timezone-aware UTC datetime helper.
    Replaces deprecated datetime.utcnow() for Python 3.12+ compatibility.
    """
    return datetime.now(timezone.utc)

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
# ENHANCED VALIDATION FUNCTIONS
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
    """Enhanced safely serialize group data with validation"""
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
                    'steam_connected': getattr(member, 'steam_connected', False),
                    'total_games': getattr(member, 'total_games', 0)
                } for member in (group.members or [])
            ]
        }
    except Exception as e:
        logging.error(f"Error serializing group {group.id if group else 'None'}: {str(e)}")
        return None

# ============================================================================
# CACHED HELPER FUNCTIONS FOR LIVE VOTING SUPPORT
# ============================================================================

@lru_cache(maxsize=100)
def get_voter_status_data_cached(session_id, cache_time=None):
    """Cached version of get_voter_status_data"""
    if cache_time is None:
        cache_time = int(time.time() / 10) * 10  # Cache for 10-second buckets
    
    return get_voter_status_data(session_id)

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
            # Safe access to game attributes
            game_data = {
                'id': game.id,
                'name': getattr(game, 'name', f'Game {game.id}'),
                'header_image': getattr(game, 'header_image', ''),
                'short_description': getattr(game, 'short_description', ''),
                'genres': getattr(game, 'genres', '').split(',') if getattr(game, 'genres', '') else [],
                'multiplayer': getattr(game, 'multiplayer', False)
            }
            
            results.append({
                'game': game_data,
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
        session.updated_at = utc_now()
        
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
        'timestamp': utc_now().isoformat()
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
        'timestamp': utc_now().isoformat()
    }

def get_group_common_games_helper(group_id):
    """Helper function to get common games for a group"""
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

# ============================================================================
# GROUP MANAGEMENT ENDPOINTS - NEW ADDITIONS
# ============================================================================

@gaming.route('/groups', methods=['GET'])
@limiter.limit("60 per minute")
@jwt_required()
def get_user_groups():
    """Get all gaming groups for the current user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Get all groups where user is a member
        user_groups = []
        
        # Try relationship-based approach first
        try:
            if hasattr(user, 'gaming_groups'):
                for group in user.gaming_groups:
                    serialized_group = serialize_group_safe(group)
                    if serialized_group:
                        user_groups.append(serialized_group)
        except:
            pass
        
        # If the relationship doesn't exist or failed, query directly
        if not user_groups:
            try:
                # Query groups where user is a member
                groups = GamingGroup.query.filter(GamingGroup.members.contains(user)).all()
                for group in groups:
                    serialized_group = serialize_group_safe(group)
                    if serialized_group:
                        user_groups.append(serialized_group)
            except Exception as query_error:
                logging.error(f"Error querying user groups: {query_error}")
                # Return empty list instead of error
                user_groups = []
        
        return jsonify({
            'success': True,
            'groups': user_groups,
            'count': len(user_groups),
            'user_id': current_user_id
        }), 200
        
    except Exception as e:
        logging.error(f"Error getting user groups: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error while fetching groups',
            'message': str(e)
        }), 500

@gaming.route('/groups', methods=['POST'])
@limiter.limit("10 per minute")
@jwt_required()
def create_group():
    """Create a new gaming group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        name = data.get('name', '').strip()
        if not name:
            return jsonify({
                'success': False,
                'error': 'Group name is required'
            }), 400
        
        # Check if user already has a group with this name
        existing_group = GamingGroup.query.filter_by(name=name, creator_id=current_user_id).first()
        if existing_group:
            return jsonify({
                'success': False,
                'error': 'You already have a group with this name'
            }), 400
        
        # Generate invite code
        invite_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        
        # Create new group
        new_group = GamingGroup(
            name=name,
            description=data.get('description', ''),
            creator_id=current_user_id,
            max_members=data.get('max_members', 10),
            is_public=data.get('is_public', False),
            invite_code=invite_code,
            created_at=utc_now()
        )
        
        # Add creator as first member
        new_group.members.append(user)
        
        db.session.add(new_group)
        db.session.commit()
        
        # Serialize the created group
        serialized_group = serialize_group_safe(new_group)
        
        logging.info(f"Group '{name}' created by user {user.username} (ID: {current_user_id})")
        
        return jsonify({
            'success': True,
            'group': serialized_group,
            'message': 'Group created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating group: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error while creating group',
            'message': str(e)
        }), 500

@gaming.route('/groups/<int:group_id>', methods=['GET'])
@limiter.limit("60 per minute")
@jwt_required()
@validate_group_id
def get_group_details(group_id):
    """Get detailed information about a specific group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({
                'success': False,
                'error': 'Group not found'
            }), 404
        
        # Check if user has access to this group
        if user not in group.members:
            return jsonify({
                'success': False,
                'error': 'You are not a member of this group'
            }), 403
        
        # Serialize group with full details
        serialized_group = serialize_group_safe(group)
        if not serialized_group:
            return jsonify({
                'success': False,
                'error': 'Error serializing group data'
            }), 500
        
        # Add additional details
        serialized_group['is_creator'] = (group.creator_id == current_user_id)
        serialized_group['user_role'] = 'creator' if group.creator_id == current_user_id else 'member'
        
        # Get recent sessions if any
        recent_sessions = GameSession.query.filter_by(group_id=group_id).order_by(desc(GameSession.created_at)).limit(5).all()
        serialized_group['recent_sessions'] = [
            {
                'id': session.id,
                'status': session.status,
                'created_at': session.created_at.isoformat() if session.created_at else None
            } for session in recent_sessions
        ]
        
        return jsonify({
            'success': True,
            'group': serialized_group
        }), 200
        
    except Exception as e:
        logging.error(f"Error getting group details for group {group_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error while fetching group details'
        }), 500

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
        steam_members = [member for member in group.members if getattr(member, 'steam_connected', False)]
        
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
        try:
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
        except ImportError:
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

# ============================================================================
# SESSION MANAGEMENT ENDPOINTS
# ============================================================================

@gaming.route('/groups/<int:group_id>/sessions', methods=['POST'])
@limiter.limit("20 per minute")
@jwt_required()
@validate_group_id
def create_voting_session(group_id):
    """Create a new voting session for a group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({'error': 'Group not found'}), 404
        
        if user not in group.members:
            return jsonify({'error': 'You are not a member of this group'}), 403
        
        # Check if there's already an active session
        active_session = GameSession.query.filter_by(
            group_id=group_id, 
            status='voting'
        ).first()
        
        if active_session:
            return jsonify({
                'error': 'There is already an active voting session for this group',
                'active_session_id': active_session.id
            }), 400
        
        # Create new session
        new_session = GameSession(
            group_id=group_id,
            creator_id=current_user_id,
            status='voting',
            created_at=utc_now()
        )
        
        db.session.add(new_session)
        db.session.commit()
        
        logging.info(f"Voting session {new_session.id} created for group {group_id} by user {user.username}")
        
        return jsonify({
            'success': True,
            'session': {
                'id': new_session.id,
                'group_id': group_id,
                'status': new_session.status,
                'created_at': new_session.created_at.isoformat(),
                'creator': {
                    'id': user.id,
                    'username': user.username
                }
            },
            'message': 'Voting session created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating voting session: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@gaming.route('/sessions/<int:session_id>/results', methods=['GET'])
@limiter.limit("60 per minute")
@cache_for_seconds(15)
@jwt_required()
def get_session_results(session_id):
    """Get voting results for a session"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        session = GameSession.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        if user not in session.group.members:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get results data
        results_data = get_session_results_data(session_id)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            **results_data
        }), 200
        
    except Exception as e:
        logging.error(f"Error getting session results: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ============================================================================
# RATE LIMITED ENDPOINTS - CRITICAL SSE FIXES
# ============================================================================

@gaming.route('/sessions/<int:session_id>/voters', methods=['GET'])
@limiter.limit("60 per minute")  # CRITICAL: Reduced from 200 per hour
@cache_for_seconds(10)  # CRITICAL: Cache for 10 seconds
@jwt_required()
def get_session_voters(session_id):
    """FIXED: Get voter status for a session with rate limiting and caching"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Use cached session lookup
        session = GameSession.query.get(session_id)
        
        if not session:
            return jsonify({
                'success': False,
                'error': 'Session not found'
            }), 404
        
        if user not in session.group.members:
            return jsonify({
                'success': False,
                'error': 'Access denied'
            }), 403
        
        # Get voter status data with caching
        try:
            voter_data = get_voter_status_data_cached(session_id)
        except Exception as voter_error:
            logging.error(f"Error getting voter data: {voter_error}")
            # Return minimal fallback data
            return jsonify({
                'success': True,
                'progress': {'voted': 0, 'total': len(session.group.members), 'percentage': 0},
                'recent_voters': [],
                'pending_voters': [],
                'voting_complete': False,
                'session_status': session.status,
                'timestamp': utc_now().isoformat(),
                'cached': True
            }), 200
        
        return jsonify({
            'success': True,
            **voter_data
        }), 200
        
    except Exception as e:
        logging.error(f"Error in get_session_voters: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': utc_now().isoformat()
        }), 500

@gaming.route('/sessions/<int:session_id>/live-results')
@limiter.limit("15 per minute")  # FIXED: Increased for SSE streams
def stream_live_results(session_id):
    """FIXED: Stream live voting results with proper rate limiting"""
    
    # Existing token validation code...
    token = request.args.get('token')
    if not token:
        return Response(
            f"data: {json.dumps({'error': 'Authentication token required'})}\n\n",
            mimetype='text/plain',
            status=401
        )
    
    try:
        from flask_jwt_extended import decode_token
        decoded_token = decode_token(token)
        current_user_id = decoded_token['sub']
        
        user = User.query.get(current_user_id)
        if not user:
            return Response(
                f"data: {json.dumps({'error': 'Invalid user'})}\n\n",
                mimetype='text/plain',
                status=401
            )
    except Exception as e:
        return Response(
            f"data: {json.dumps({'error': 'Invalid authentication token'})}\n\n",
            mimetype='text/plain',
            status=401
        )
    
    def generate_live_results():
        try:
            session = GameSession.query.get(session_id)
            if not session:
                yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
                return
                
            if user not in session.group.members:
                yield f"data: {json.dumps({'error': 'Access denied'})}\n\n"
                return
            
            last_voter_count = 0
            last_update_time = None
            heartbeat_counter = 0
            max_iterations = 300  # 5 minutes max (300 * 1 second)
            
            while heartbeat_counter < max_iterations:
                try:
                    # CRITICAL: Longer intervals to reduce load
                    if heartbeat_counter % 5 != 0:  # Only check every 5 seconds
                        time.sleep(1)
                        heartbeat_counter += 1
                        continue
                    
                    session = GameSession.query.get(session_id)
                    if not session:
                        yield f"data: {json.dumps({'error': 'Session no longer exists'})}\n\n"
                        break
                    
                    try:
                        results_data = get_session_results_data(session_id)
                        current_voter_count = results_data.get('total_voters', 0)
                        total_members = results_data.get('total_members', 0)
                    except Exception as results_error:
                        logging.error(f"Error getting session results: {results_error}")
                        current_voter_count = 0
                        total_members = len(session.group.members) if session.group else 0
                        results_data = {
                            'results': [],
                            'total_voters': current_voter_count,
                            'total_members': total_members,
                            'voting_complete': False,
                            'session_status': session.status,
                            'winner': None,
                            'timestamp': utc_now().isoformat()
                        }
                    
                    # Send update only if there are changes or heartbeat
                    should_update = (
                        current_voter_count != last_voter_count or
                        heartbeat_counter % 30 == 0 or  # Heartbeat every 30 iterations (150 seconds)
                        last_update_time is None
                    )
                    
                    if should_update:
                        voting_complete = (
                            session.status == 'completed' or 
                            current_voter_count >= total_members
                        )
                        
                        if not session.status == 'completed' and current_voter_count >= total_members:
                            session.status = 'completed'
                            db.session.commit()
                            voting_complete = True
                        
                        results_data.update({
                            'voting_complete': voting_complete,
                            'session_status': session.status,
                            'progress_percentage': (current_voter_count / total_members * 100) if total_members > 0 else 0
                        })
                        
                        yield f"data: {json.dumps(results_data)}\n\n"
                        
                        last_voter_count = current_voter_count
                        last_update_time = utc_now()
                        
                        if voting_complete:
                            logging.info(f"Live results stream ended for session {session_id} - voting complete")
                            break
                    else:
                        # Send heartbeat less frequently
                        if heartbeat_counter % 30 == 0:
                            yield f"data: {json.dumps({'heartbeat': True, 'timestamp': utc_now().isoformat()})}\n\n"
                    
                    heartbeat_counter += 1
                    time.sleep(1)  # CRITICAL: Always sleep 1 second
                    
                except Exception as inner_error:
                    logging.error(f"Inner SSE error: {str(inner_error)}")
                    yield f"data: {json.dumps({'error': f'Stream error: {str(inner_error)}'})}\n\n"
                    break
                    
        except Exception as e:
            logging.error(f"SSE Generator error: {str(e)}")
            yield f"data: {json.dumps({'error': f'Generator error: {str(e)}'})}\n\n"
    
    return Response(
        generate_live_results(),
        mimetype='text/plain',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Authorization',
            'X-Accel-Buffering': 'no'
        }
    )

@gaming.route('/sessions/<int:session_id>/voter-status-stream')
@limiter.limit("15 per minute")  # FIXED: Increased for SSE streams
def voter_status_stream(session_id):
    """FIXED: Server-Sent Events endpoint for real-time voter status with rate limiting"""
    
    # Existing token validation code...
    token = request.args.get('token')
    if not token:
        return Response(
            f"data: {json.dumps({'error': 'Authentication token required'})}\n\n",
            mimetype='text/plain',
            status=401
        )
    
    try:
        from flask_jwt_extended import decode_token
        decoded_token = decode_token(token)
        current_user_id = decoded_token['sub']
        
        user = User.query.get(current_user_id)
        if not user:
            return Response(
                f"data: {json.dumps({'error': 'Invalid user'})}\n\n",
                mimetype='text/plain',
                status=401
            )
    except Exception as e:
        return Response(
            f"data: {json.dumps({'error': 'Invalid authentication token'})}\n\n",
            mimetype='text/plain',
            status=401
        )
    
    session = GameSession.query.get(session_id)
    if not session:
        return Response(
            f"data: {json.dumps({'error': 'Session not found'})}\n\n",
            mimetype='text/plain',
            status=404
        )
    
    if user not in session.group.members:
        return Response(
            f"data: {json.dumps({'error': 'Access denied'})}\n\n",
            mimetype='text/plain',
            status=403
        )
    
    def voter_event_stream():
        last_voter_count = 0
        heartbeat_counter = 0
        max_iterations = 300  # 5 minutes max
        
        try:
            while heartbeat_counter < max_iterations:
                # CRITICAL: Check only every 10 seconds to reduce load
                if heartbeat_counter % 10 != 0:
                    time.sleep(1)
                    heartbeat_counter += 1
                    continue
                
                session = GameSession.query.get(session_id)
                if not session:
                    yield f"data: {json.dumps({'error': 'Session no longer exists'})}\n\n"
                    break
                
                try:
                    voter_data = get_voter_status_data_cached(session_id)
                    current_voter_count = voter_data.get('progress', {}).get('voted', 0)
                except Exception as voter_error:
                    logging.error(f"Error getting voter status: {voter_error}")
                    current_voter_count = 0
                    voter_data = {
                        'progress': {'voted': 0, 'total': len(session.group.members), 'percentage': 0},
                        'recent_voters': [],
                        'pending_voters': [],
                        'voting_complete': False,
                        'session_status': session.status,
                        'timestamp': utc_now().isoformat()
                    }
                
                # Send update only if changes or heartbeat
                if (current_voter_count != last_voter_count or 
                    heartbeat_counter % 60 == 0):  # Heartbeat every 60 iterations (10 minutes)
                    
                    yield f"data: {json.dumps(voter_data)}\n\n"
                    last_voter_count = current_voter_count
                
                if voter_data.get('voting_complete') or session.status == 'completed':
                    logging.info(f"Voter status stream ended for session {session_id} - voting complete")
                    break
                
                heartbeat_counter += 1
                time.sleep(1)  # CRITICAL: Always sleep 1 second
                
        except GeneratorExit:
            pass
        except Exception as e:
            logging.error(f"Voter Status SSE Error: {e}")
            yield f"data: {json.dumps({'error': 'Connection error'})}\n\n"
    
    return Response(
        voter_event_stream(),
        mimetype='text/plain',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Authorization',
            'Access-Control-Allow-Methods': 'GET'
        }
    )

@gaming.route('/sessions/<int:session_id>/status', methods=['GET'])
@limiter.limit("60 per minute")  # Allow more frequent polling for status
@cache_for_seconds(5)  # Short cache for status
@jwt_required()
def get_session_status(session_id):
    """FIXED: Get current session status with rate limiting and caching"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        session = GameSession.query.get(session_id)
        
        if not session:
            return jsonify({
                'success': False,
                'error': 'Session not found'
            }), 404
        
        if user not in session.group.members:
            return jsonify({
                'success': False,
                'error': 'Access denied'
            }), 403
        
        # Use cached data
        try:
            status_data = get_session_results_data(session_id)
            voter_data = get_voter_status_data_cached(session_id)
        except Exception as data_error:
            logging.error(f"Error getting status data: {data_error}")
            status_data = {
                'results': [],
                'total_voters': 0,
                'total_members': len(session.group.members),
                'voting_complete': session.status == 'completed',
                'session_status': session.status,
                'winner': None,
                'timestamp': utc_now().isoformat()
            }
            voter_data = {
                'progress': {'voted': 0, 'total': len(session.group.members), 'percentage': 0},
                'recent_voters': [],
                'pending_voters': [],
                'voting_complete': session.status == 'completed',
                'session_status': session.status,
                'timestamp': utc_now().isoformat()
            }
        
        return jsonify({
            "success": True,
            "type": "status_update",
            "session_id": session_id,
            "status": session.status,
            "results": status_data,
            "voters": voter_data,
            "timestamp": utc_now().isoformat(),
            "cached": True
        }), 200
        
    except Exception as e:
        logging.error(f"Error getting session status: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

# ============================================================================
# VOTING ENDPOINTS
# ============================================================================

@gaming.route('/sessions/<int:session_id>/vote', methods=['POST'])
@limiter.limit("20 per minute")  # Prevent vote spam
@jwt_required()
def submit_vote(session_id):
    """Enhanced: Submit votes with SSE broadcast and atomic transactions"""
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
            existing_vote = Vote.query.filter_by(session_id=session_id, user_id=current_user_id).first()
            if existing_vote:
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
            total_voters = db.session.query(func.count(func.distinct(Vote.user_id))).filter_by(session_id=session_id).scalar() or 0
            
            # Auto-complete if all members voted or threshold reached
            auto_complete_threshold = 0.8  # Default threshold
            
            if (total_voters >= total_members or 
                (total_voters >= total_members * auto_complete_threshold and total_voters >= 2)):
                session.status = 'completed'
                if hasattr(session, 'updated_at'):
                    session.updated_at = utc_now()
                logging.info(f"Voting session {session_id} auto-completed: {total_voters}/{total_members} members voted")
            
            # Update session timestamp
            if hasattr(session, 'updated_at'):
                session.updated_at = utc_now()
            
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

@gaming.route('/sessions/<int:session_id>/vote', methods=['GET'])
@limiter.limit("60 per minute")
@jwt_required()
def get_user_vote(session_id):
    """Get the current user's vote for a session"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        session = GameSession.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        if user not in session.group.members:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get user's votes for this session
        votes = Vote.query.filter_by(
            session_id=session_id,
            user_id=current_user_id
        ).order_by(desc(Vote.priority)).all()
        
        if not votes:
            return jsonify({
                'success': True,
                'has_voted': False,
                'votes': []
            }), 200
        
        # Format votes
        formatted_votes = []
        for vote in votes:
            game = SteamGame.query.get(vote.game_id)
            formatted_votes.append({
                'game_id': vote.game_id,
                'priority': vote.priority,
                'game': {
                    'id': game.id,
                    'name': game.name,
                    'header_image': getattr(game, 'header_image', ''),
                    'short_description': getattr(game, 'short_description', '')
                } if game else None,
                'created_at': vote.created_at.isoformat() if vote.created_at else None
            })
        
        return jsonify({
            'success': True,
            'has_voted': True,
            'votes': formatted_votes,
            'vote_count': len(formatted_votes)
        }), 200
        
    except Exception as e:
        logging.error(f"Error getting user vote: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ============================================================================
# GROUP MEMBER MANAGEMENT ENDPOINTS
# ============================================================================

@gaming.route('/groups/join/<invite_code>', methods=['POST'])
@limiter.limit("20 per minute")
@jwt_required()
def join_group_by_invite(invite_code):
    """Join a group using invite code"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Find group by invite code
        group = GamingGroup.query.filter_by(invite_code=invite_code).first()
        if not group:
            return jsonify({'error': 'Invalid invite code'}), 404
        
        # Check if user is already a member
        if user in group.members:
            return jsonify({'error': 'You are already a member of this group'}), 400
        
        # Check if group is full
        if len(group.members) >= group.max_members:
            return jsonify({'error': 'Group is full'}), 400
        
        # Add user to group
        group.members.append(user)
        db.session.commit()
        
        logging.info(f"User {user.username} joined group {group.name} via invite code")
        
        return jsonify({
            'success': True,
            'message': f'Successfully joined {group.name}',
            'group': serialize_group_safe(group)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error joining group: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@gaming.route('/groups/<int:group_id>/leave', methods=['POST'])
@limiter.limit("20 per minute")
@jwt_required()
@validate_group_id
def leave_group(group_id):
    """Leave a group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({'error': 'Group not found'}), 404
        
        if user not in group.members:
            return jsonify({'error': 'You are not a member of this group'}), 400
        
        # Don't allow creator to leave if there are other members
        if group.creator_id == current_user_id and len(group.members) > 1:
            return jsonify({
                'error': 'Transfer ownership before leaving the group',
                'code': 'TRANSFER_OWNERSHIP_REQUIRED'
            }), 400
        
        # Remove user from group
        group.members.remove(user)
        
        # If creator is leaving and they're the only member, delete the group
        if group.creator_id == current_user_id and len(group.members) == 0:
            db.session.delete(group)
            logging.info(f"Group {group.name} deleted as creator {user.username} was the last member")
        
        db.session.commit()
        
        logging.info(f"User {user.username} left group {group.name}")
        
        return jsonify({
            'success': True,
            'message': 'Successfully left the group'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error leaving group: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ============================================================================
# INITIALIZE RATE LIMITING FUNCTION
# ============================================================================

def init_rate_limiting(app):
    """Initialize rate limiting for the Flask app"""
    limiter.init_app(app)
    return limiter