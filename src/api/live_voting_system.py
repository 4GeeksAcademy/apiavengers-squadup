# src/api/live_voting_system.py - COMPLETE LIVE VOTING SYSTEM WITH SSE

from flask import Blueprint, request, jsonify, Response, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from api.models import db, User, GamingGroup, GameSession, SteamGame, Vote
from api.utils import APIException, utc_now
import json
import time
import threading
import queue
from datetime import datetime
from collections import defaultdict
from sqlalchemy import func

live_voting = Blueprint('live_voting', __name__)

# ============================================================================
# CENTRALIZED SSE CONNECTION MANAGER
# ============================================================================

class LiveVotingManager:
    """
    Centralized manager for live voting sessions with SSE
    Handles the complete voting flow: lobby -> voting -> results
    """
    def __init__(self):
        # Connection management
        self.session_connections = defaultdict(dict)  # session_id -> {user_id: connection_queue}
        self.connection_lock = threading.Lock()
        
        # Session state tracking
        self.session_states = {}  # session_id -> current_state
        self.session_data = {}    # session_id -> session_data_cache
        
        # Event history for reconnections
        self.event_history = defaultdict(list)  # session_id -> [events]
        
        print("🎮 LiveVotingManager initialized")
    
    def add_connection(self, session_id, user_id, connection_queue):
        """Add a new SSE connection"""
        with self.connection_lock:
            if session_id not in self.session_connections:
                self.session_connections[session_id] = {}
            
            self.session_connections[session_id][user_id] = connection_queue
            
            # Send recent events to new connection
            self._send_event_history(session_id, user_id)
            
            print(f"📡 User {user_id} connected to session {session_id}")
            
            # Broadcast user joined
            self.broadcast_to_session(session_id, {
                'type': 'user_connected',
                'user_id': user_id,
                'timestamp': utc_now().isoformat(),
                'total_connections': len(self.session_connections[session_id])
            }, exclude_user=user_id)
    
    def remove_connection(self, session_id, user_id):
        """Remove SSE connection"""
        with self.connection_lock:
            if session_id in self.session_connections:
                self.session_connections[session_id].pop(user_id, None)
                
                if not self.session_connections[session_id]:
                    del self.session_connections[session_id]
                    # Clean up session data if no connections
                    self.session_states.pop(session_id, None)
                    self.session_data.pop(session_id, None)
                else:
                    # Broadcast user disconnected
                    self.broadcast_to_session(session_id, {
                        'type': 'user_disconnected',
                        'user_id': user_id,
                        'timestamp': utc_now().isoformat(),
                        'total_connections': len(self.session_connections[session_id])
                    })
                
                print(f"📡 User {user_id} disconnected from session {session_id}")
    
    def broadcast_to_session(self, session_id, event_data, exclude_user=None):
        """Broadcast event to all users in a session"""
        with self.connection_lock:
            if session_id in self.session_connections:
                # Add to event history
                self._add_to_event_history(session_id, event_data)
                
                dead_connections = []
                
                for user_id, connection_queue in self.session_connections[session_id].items():
                    if exclude_user and user_id == exclude_user:
                        continue
                        
                    try:
                        connection_queue.put_nowait(event_data)
                    except queue.Full:
                        dead_connections.append(user_id)
                
                # Clean up dead connections
                for user_id in dead_connections:
                    self.remove_connection(session_id, user_id)
    
    def _add_to_event_history(self, session_id, event_data):
        """Add event to history for reconnections"""
        self.event_history[session_id].append({
            **event_data,
            'timestamp': utc_now().isoformat()
        })
        
        # Keep only last 50 events
        if len(self.event_history[session_id]) > 50:
            self.event_history[session_id] = self.event_history[session_id][-50:]
    
    def _send_event_history(self, session_id, user_id):
        """Send recent events to reconnecting user"""
        if session_id in self.event_history and user_id in self.session_connections[session_id]:
            connection_queue = self.session_connections[session_id][user_id]
            
            # Send last 10 events
            recent_events = self.event_history[session_id][-10:]
            for event in recent_events:
                try:
                    connection_queue.put_nowait({
                        'type': 'history_event',
                        'original_event': event
                    })
                except queue.Full:
                    break
    
    def get_session_state(self, session_id):
        """Get current session state"""
        return self.session_states.get(session_id, 'unknown')
    
    def set_session_state(self, session_id, state):
        """Set session state and broadcast change"""
        old_state = self.session_states.get(session_id)
        self.session_states[session_id] = state
        
        if old_state != state:
            self.broadcast_to_session(session_id, {
                'type': 'state_change',
                'old_state': old_state,
                'new_state': state,
                'timestamp': utc_now().isoformat()
            })

# Global manager instance
live_voting_manager = LiveVotingManager()

# ============================================================================
# SSE CONNECTION ENDPOINT
# ============================================================================

@live_voting.route('/sessions/<int:session_id>/live-stream')
def live_voting_stream(session_id):
    """
    Main SSE endpoint for live voting
    Handles: lobby -> voting -> results flow
    """
    # Validate token from query params
    token = request.args.get('token')
    if not token:
        return Response(
            f"data: {json.dumps({'error': 'Authentication token required'})}\n\n",
            mimetype='text/event-stream',
            status=401
        )
    
    try:
        decoded_token = decode_token(token)
        current_user_id = decoded_token['sub']
        user = User.query.get(current_user_id)
        
        if not user:
            return Response(
                f"data: {json.dumps({'error': 'Invalid user'})}\n\n",
                mimetype='text/event-stream',
                status=401
            )
    except Exception:
        return Response(
            f"data: {json.dumps({'error': 'Invalid authentication token'})}\n\n",
            mimetype='text/event-stream',
            status=401
        )
    
    # Validate session access
    session = GameSession.query.get(session_id)
    if not session:
        return Response(
            f"data: {json.dumps({'error': 'Session not found'})}\n\n",
            mimetype='text/event-stream',
            status=404
        )
    
    if user not in session.group.members:
        return Response(
            f"data: {json.dumps({'error': 'Access denied'})}\n\n",
            mimetype='text/event-stream',
            status=403
        )
    
    def generate_live_stream():
        app = current_app._get_current_object()
        connection_queue = queue.Queue(maxsize=100)
        
        with app.app_context():
            try:
                # Add connection to manager
                live_voting_manager.add_connection(session_id, current_user_id, connection_queue)
                
                # Send initial session state
                initial_state = get_complete_session_state(session_id, current_user_id)
                yield f"data: {json.dumps(initial_state)}\n\n"
                
                # Main event loop
                while True:
                    try:
                        # Get event from queue (blocking with timeout)
                        event = connection_queue.get(timeout=30)  # 30 second timeout
                        yield f"data: {json.dumps(event)}\n\n"
                        
                    except queue.Empty:
                        # Send heartbeat
                        yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': time.time()})}\n\n"
                        
                        # Check if session is still active
                        db.session.expire_all()
                        current_session = GameSession.query.get(session_id)
                        if not current_session or current_session.status == 'completed':
                            break
                    
            except GeneratorExit:
                pass
            except Exception as e:
                current_app.logger.error(f"Live voting stream error: {e}")
                yield f"data: {json.dumps({'error': f'Stream error: {str(e)}'})}\n\n"
            finally:
                # Clean up connection
                live_voting_manager.remove_connection(session_id, current_user_id)
    
    return Response(
        generate_live_stream(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Authorization',
            'X-Accel-Buffering': 'no'
        }
    )

# ============================================================================
# VOTING FLOW MANAGEMENT
# ============================================================================

def get_complete_session_state(session_id, user_id):
    """Get complete session state for a user"""
    try:
        session = GameSession.query.get(session_id)
        if not session:
            return {'error': 'Session not found'}
        
        # Base session info
        session_data = {
            'type': 'session_state',
            'session': session.serialize(),
            'user_id': user_id,
            'timestamp': utc_now().isoformat()
        }
        
        # Add state-specific data based on session status
        if session.status == 'planning' or session.status == 'lobby':
            session_data.update(get_lobby_state(session_id, user_id))
        elif session.status == 'voting':
            session_data.update(get_voting_state(session_id, user_id))
        elif session.status == 'completed':
            session_data.update(get_results_state(session_id, user_id))
        
        return session_data
        
    except Exception as e:
        current_app.logger.error(f"Error getting session state: {e}")
        return {'error': f'Failed to get session state: {str(e)}'}

def get_lobby_state(session_id, user_id):
    """Get lobby state: common games, members waiting"""
    try:
        session = GameSession.query.get(session_id)
        group = session.group
        
        # Get common games from Steam libraries
        common_games = get_group_common_games(group.id)
        
        # Get group members
        members = []
        for member in group.members:
            member_data = {
                'id': member.id,
                'username': member.username,
                'avatar_url': member.avatar_url or member.steam_avatar_url,
                'steam_connected': member.is_steam_connected,
                'is_ready': True,  # In lobby, everyone is "ready"
                'total_games': member.total_games or 0
            }
            members.append(member_data)
        
        return {
            'state': 'lobby',
            'common_games': common_games,
            'members': members,
            'total_common_games': len(common_games),
            'steam_connected_members': len([m for m in members if m['steam_connected']]),
            'can_start_voting': len(common_games) > 0 and len([m for m in members if m['steam_connected']]) >= 2
        }
        
    except Exception as e:
        current_app.logger.error(f"Error getting lobby state: {e}")
        return {'state': 'lobby', 'error': str(e)}

def get_voting_state(session_id, user_id):
    """Get voting state: who voted, who's pending, current results"""
    try:
        session = GameSession.query.get(session_id)
        group = session.group
        
        # Get votable games
        votable_games = []
        if hasattr(session, 'votable_games') and session.votable_games:
            try:
                votable_games = json.loads(session.votable_games)
            except:
                votable_games = get_group_common_games(group.id)
        else:
            votable_games = get_group_common_games(group.id)
        
        # Get voting status for each member
        voted_user_ids = set()
        votes = Vote.query.filter_by(session_id=session_id).all()
        for vote in votes:
            voted_user_ids.add(vote.user_id)
        
        members_status = []
        for member in group.members:
            has_voted = member.id in voted_user_ids
            member_votes = []
            
            if has_voted:
                user_votes = Vote.query.filter_by(
                    session_id=session_id, 
                    user_id=member.id
                ).order_by(Vote.priority.desc()).all()
                
                for vote in user_votes:
                    game = SteamGame.query.get(vote.game_id)
                    if game:
                        member_votes.append({
                            'game': game.serialize(),
                            'priority': vote.priority,
                            'points': vote.priority
                        })
            
            members_status.append({
                'id': member.id,
                'username': member.username,
                'avatar_url': member.avatar_url or member.steam_avatar_url,
                'has_voted': has_voted,
                'vote_count': len(member_votes),
                'votes': member_votes,
                'status': 'voted' if has_voted else 'voting'
            })
        
        # Get current user's vote status
        user_has_voted = user_id in voted_user_ids
        user_votes = []
        if user_has_voted:
            user_vote_objects = Vote.query.filter_by(
                session_id=session_id, 
                user_id=user_id
            ).order_by(Vote.priority.desc()).all()
            
            for vote in user_vote_objects:
                game = SteamGame.query.get(vote.game_id)
                if game:
                    user_votes.append({
                        'game': game.serialize(),
                        'priority': vote.priority,
                        'points': vote.priority
                    })
        
        # Calculate progress
        total_members = len(group.members)
        voted_count = len(voted_user_ids)
        progress_percentage = (voted_count / total_members * 100) if total_members > 0 else 0
        
        # Check if voting should auto-complete
        auto_complete_threshold = getattr(session, 'auto_complete_threshold', 0.8)
        should_auto_complete = (
            voted_count >= total_members * auto_complete_threshold and
            voted_count >= 2
        )
        
        return {
            'state': 'voting',
            'votable_games': votable_games,
            'members_status': members_status,
            'user_has_voted': user_has_voted,
            'user_votes': user_votes,
            'can_vote': not user_has_voted and session.status == 'voting',
            'progress': {
                'voted': voted_count,
                'total': total_members,
                'percentage': round(progress_percentage, 1)
            },
            'voting_settings': {
                'max_choices': getattr(session, 'max_choices', 3),
                'auto_complete_threshold': auto_complete_threshold,
                'should_auto_complete': should_auto_complete
            }
        }
        
    except Exception as e:
        current_app.logger.error(f"Error getting voting state: {e}")
        return {'state': 'voting', 'error': str(e)}

def get_results_state(session_id, user_id):
    """Get results state: final vote tallies, winner"""
    try:
        session = GameSession.query.get(session_id)
        
        # Get vote results using Vote model
        results = Vote.get_session_results(session_id)
        
        # Get voting statistics
        total_voters = Vote.get_voter_count(session_id)
        total_members = len(session.group.members)
        
        # Get winner info
        winner = results[0] if results else None
        
        return {
            'state': 'results',
            'results': results,
            'winner': winner,
            'statistics': {
                'total_voters': total_voters,
                'total_members': total_members,
                'participation_rate': (total_voters / total_members * 100) if total_members > 0 else 0,
                'total_votes_cast': sum(len(Vote.get_user_votes(session_id, member.id)) for member in session.group.members)
            },
            'session_completed_at': session.completed_at.isoformat() if hasattr(session, 'completed_at') and session.completed_at else None
        }
        
    except Exception as e:
        current_app.logger.error(f"Error getting results state: {e}")
        return {'state': 'results', 'error': str(e)}

def get_group_common_games(group_id):
    """Get common multiplayer games for a group from synced Steam libraries"""
    try:
        group = GamingGroup.query.get(group_id)
        if not group:
            return []
        
        # Get Steam-connected members
        steam_members = [m for m in group.members if m.is_steam_connected and m.steam_id]
        
        if len(steam_members) < 2:
            return []
        
        # Get common games using SQL for efficiency
        user_ids = [m.id for m in steam_members]
        
        # Find games owned by ALL steam members
        common_games_query = db.session.query(SteamGame).join(
            user_games
        ).filter(
            user_games.c.user_id.in_(user_ids)
        ).group_by(
            SteamGame.id
        ).having(
            func.count(func.distinct(user_games.c.user_id)) == len(user_ids)
        ).filter(
            # Only multiplayer games
            (SteamGame.multiplayer == True) | (SteamGame.co_op == True)
        ).order_by(
            SteamGame.name
        ).limit(50)  # Limit to 50 games for performance
        
        common_games = []
        for game in common_games_query:
            game_data = game.serialize()
            # Add ownership info
            game_data['owned_by_all'] = True
            game_data['owner_count'] = len(user_ids)
            common_games.append(game_data)
        
        return common_games
        
    except Exception as e:
        current_app.logger.error(f"Error getting common games: {e}")
        return []

# ============================================================================
# VOTING FLOW CONTROL ENDPOINTS
# ============================================================================

@live_voting.route('/sessions/<int:session_id>/start-voting', methods=['POST'])
@jwt_required()
def start_voting_phase(session_id):
    """Start the voting phase for a session"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        session = GameSession.query.get_or_404(session_id)
        
        # Check permissions (creator or admin)
        if session.creator_id != current_user_id:
            # Check if user is group creator
            if session.group.creator_id != current_user_id:
                return jsonify({'error': 'Only session or group creator can start voting'}), 403
        
        # Validate session can start voting
        if session.status not in ['planning', 'lobby']:
            return jsonify({'error': 'Session cannot start voting from current state'}), 400
        
        # Get common games
        common_games = get_group_common_games(session.group.id)
        if len(common_games) == 0:
            return jsonify({'error': 'No common multiplayer games found'}), 400
        
        # Update session
        session.status = 'voting'
        session.updated_at = utc_now()
        if hasattr(session, 'votable_games'):
            session.votable_games = json.dumps(common_games)
        
        db.session.commit()
        
        # Broadcast state change
        live_voting_manager.set_session_state(session_id, 'voting')
        live_voting_manager.broadcast_to_session(session_id, {
            'type': 'voting_started',
            'started_by': user.username,
            'votable_games': common_games,
            'voting_settings': {
                'max_choices': getattr(session, 'max_choices', 3),
                'auto_complete_threshold': getattr(session, 'auto_complete_threshold', 0.8)
            },
            'timestamp': utc_now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'message': 'Voting started successfully',
            'session_status': session.status,
            'votable_games_count': len(common_games)
        })
        
    except Exception as e:
        current_app.logger.error(f"Error starting voting: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@live_voting.route('/sessions/<int:session_id>/submit-vote', methods=['POST'])
@jwt_required()
def submit_live_vote(session_id):
    """Submit vote and broadcast update"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        session = GameSession.query.get_or_404(session_id)
        
        if session.status != 'voting':
            return jsonify({'error': 'Voting is not active'}), 400
        
        if user not in session.group.members:
            return jsonify({'error': 'Access denied'}), 403
        
        # Check if user already voted
        existing_vote = Vote.query.filter_by(session_id=session_id, user_id=current_user_id).first()
        if existing_vote:
            return jsonify({'error': 'You have already voted'}), 400
        
        data = request.get_json()
        game_votes = data.get('game_votes', [])
        
        if not game_votes:
            return jsonify({'error': 'No votes provided'}), 400
        
        # Validate vote count
        max_choices = getattr(session, 'max_choices', 3)
        if len(game_votes) > max_choices:
            return jsonify({'error': f'Maximum {max_choices} votes allowed'}), 400
        
        # Create votes in transaction
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
        
        db.session.commit()
        
        # Check if voting should auto-complete
        total_voters = Vote.get_voter_count(session_id)
        total_members = len(session.group.members)
        auto_complete_threshold = getattr(session, 'auto_complete_threshold', 0.8)
        
        should_complete = (
            total_voters >= total_members * auto_complete_threshold and
            total_voters >= 2
        )
        
        if should_complete:
            # Auto-complete session
            session.status = 'completed'
            session.completed_at = utc_now()
            session.updated_at = utc_now()
            
            # Set winner
            results = Vote.get_session_results(session_id)
            if results and hasattr(session, 'winner_game_id'):
                winner = results[0]
                session.winner_game_id = winner['game']['id']
                session.winner_votes = winner['vote_count']
                session.winner_points = winner['total_points']
            
            db.session.commit()
            
            # Broadcast completion
            live_voting_manager.set_session_state(session_id, 'completed')
            live_voting_manager.broadcast_to_session(session_id, {
                'type': 'voting_completed',
                'completed_by': 'auto_complete',
                'final_results': results,
                'winner': results[0] if results else None,
                'timestamp': utc_now().isoformat()
            })
        else:
            # Broadcast vote submitted
            live_voting_manager.broadcast_to_session(session_id, {
                'type': 'vote_submitted',
                'user_id': current_user_id,
                'username': user.username,
                'vote_count': len(created_votes),
                'progress': {
                    'voted': total_voters,
                    'total': total_members,
                    'percentage': (total_voters / total_members * 100) if total_members > 0 else 0
                },
                'timestamp': utc_now().isoformat()
            })
        
        return jsonify({
            'success': True,
            'message': 'Vote submitted successfully',
            'votes_created': len(created_votes),
            'session_status': session.status,
            'voting_completed': session.status == 'completed'
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error submitting vote: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@live_voting.route('/sessions/<int:session_id>/complete-voting', methods=['POST'])
@jwt_required()
def complete_voting_phase(session_id):
    """Manually complete voting phase"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        session = GameSession.query.get_or_404(session_id)
        
        # Check permissions
        if session.creator_id != current_user_id and session.group.creator_id != current_user_id:
            return jsonify({'error': 'Only session or group creator can complete voting'}), 403
        
        if session.status != 'voting':
            return jsonify({'error': 'Session is not in voting state'}), 400
        
        # Complete session
        session.status = 'completed'
        session.completed_at = utc_now()
        session.updated_at = utc_now()
        
        # Set winner
        results = Vote.get_session_results(session_id)
        if results and hasattr(session, 'winner_game_id'):
            winner = results[0]
            session.winner_game_id = winner['game']['id']
            session.winner_votes = winner['vote_count']
            session.winner_points = winner['total_points']
        
        db.session.commit()
        
        # Broadcast completion
        live_voting_manager.set_session_state(session_id, 'completed')
        live_voting_manager.broadcast_to_session(session_id, {
            'type': 'voting_completed',
            'completed_by': user.username,
            'final_results': results,
            'winner': results[0] if results else None,
            'timestamp': utc_now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'message': 'Voting completed successfully',
            'final_results': results,
            'winner': results[0] if results else None
        })
        
    except Exception as e:
        current_app.logger.error(f"Error completing voting: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# ============================================================================
# SESSION STATE ENDPOINTS
# ============================================================================

@live_voting.route('/sessions/<int:session_id>/state', methods=['GET'])
@jwt_required()
def get_session_state_endpoint(session_id):
    """Get current session state (for polling fallback)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        session = GameSession.query.get_or_404(session_id)
        
        if user not in session.group.members:
            return jsonify({'error': 'Access denied'}), 403
        
        state_data = get_complete_session_state(session_id, current_user_id)
        
        return jsonify({
            'success': True,
            **state_data
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting session state: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@live_voting.route('/sessions/<int:session_id>/connections', methods=['GET'])
@jwt_required()
def get_session_connections(session_id):
    """Get current SSE connections for debugging"""
    try:
        current_user_id = get_jwt_identity()
        session = GameSession.query.get_or_404(session_id)
        
        # Check if user is creator or group creator
        if session.creator_id != current_user_id and session.group.creator_id != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        with live_voting_manager.connection_lock:
            connection_count = len(live_voting_manager.session_connections.get(session_id, {}))
            connected_users = list(live_voting_manager.session_connections.get(session_id, {}).keys())
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'total_connections': connection_count,
            'connected_user_ids': connected_users,
            'session_state': live_voting_manager.get_session_state(session_id)
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting connections: {e}")
        return jsonify({'error': 'Internal server error'}), 500