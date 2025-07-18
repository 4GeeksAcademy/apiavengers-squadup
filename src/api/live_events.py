# src/api/live_events.py - Real-time event broadcasting for live voting
from flask import Blueprint, request, jsonify, Response, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, GameSession, Vote, GamingGroup
from api.utils import APIException, utc_now
import json
import time
from datetime import datetime
from collections import defaultdict
from functools import wraps

live_events = Blueprint('live_events', __name__)

# Global event store for broadcasting (use Redis in production)
event_store = defaultdict(list)
active_connections = defaultdict(set)

def with_app_context(f):
    """Decorator to ensure Flask app context is maintained in SSE generators"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        def generator():
            app = current_app._get_current_object()
            with app.app_context():
                try:
                    yield from f(*args, **kwargs)
                except GeneratorExit:
                    current_app.logger.info("SSE client disconnected")
                except Exception as e:
                    current_app.logger.error(f"SSE Generator error: {e}")
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return Response(
            generator(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Authorization'
            }
        )
    return decorated_function

@live_events.route('/sessions/<int:session_id>/events')
@jwt_required()
@with_app_context
def stream_session_events(session_id):
    """🚀 Central SSE endpoint for all real-time session events"""
    
    current_user_id = get_jwt_identity()
    
    # Verify access to session
    session = GameSession.query.get(session_id)
    if not session:
        yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
        return
        
    user = User.query.get(current_user_id)
    if user not in session.group.members:
        yield f"data: {json.dumps({'error': 'Access denied'})}\n\n"
        return
    
    # Add this connection to active connections
    connection_id = f"{current_user_id}_{int(time.time())}"
    active_connections[session_id].add(connection_id)
    
    try:
        # Send initial state
        yield f"data: {json.dumps(get_session_live_state(session_id))}\n\n"
        
        last_event_id = len(event_store[session_id])
        heartbeat_counter = 0
        
        while True:
            # Refresh database session to get latest data
            db.session.expire_all()
            
            # Check for new events
            current_events = event_store[session_id]
            
            if len(current_events) > last_event_id:
                # Send new events
                for event in current_events[last_event_id:]:
                    yield f"data: {json.dumps(event)}\n\n"
                last_event_id = len(current_events)
            
            # Send heartbeat every 10 iterations (10 seconds)
            heartbeat_counter += 1
            if heartbeat_counter >= 10:
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': time.time()})}\n\n"
                heartbeat_counter = 0
            
            # Check if session is complete
            session = GameSession.query.get(session_id)
            if session and session.status == 'completed':
                yield f"data: {json.dumps({'type': 'session_completed', 'session_id': session_id})}\n\n"
                break
                
            time.sleep(1)  # Check every second
            
    except GeneratorExit:
        # Client disconnected
        active_connections[session_id].discard(connection_id)
        current_app.logger.info(f"SSE client disconnected: {connection_id}")
    except Exception as e:
        current_app.logger.error(f"SSE stream error: {e}")
        yield f"data: {json.dumps({'error': f'Stream error: {str(e)}'})}\n\n"
    finally:
        # Clean up connection
        active_connections[session_id].discard(connection_id)

# New dedicated endpoints for live results and voter status with app context
@live_events.route('/sessions/<int:session_id>/live-results')
@jwt_required()
@with_app_context  
def live_results_stream(session_id):
    """SSE endpoint for live voting results"""
    
    current_user_id = get_jwt_identity()
    token = request.args.get('token')
    
    # Verify session access
    session = GameSession.query.get(session_id)
    if not session:
        yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
        return
        
    user = User.query.get(current_user_id)
    if user not in session.group.members:
        yield f"data: {json.dumps({'error': 'Access denied'})}\n\n"
        return
    
    connection_id = f"results_{current_user_id}_{int(time.time())}"
    active_connections[f"{session_id}_results"].add(connection_id)
    
    try:
        while True:
            # Get live voting results with fresh data
            db.session.expire_all()
            results_data = get_live_voting_results(session_id)
            
            if results_data:
                yield f"data: {json.dumps(results_data)}\n\n"
            else:
                # Send heartbeat
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': time.time()})}\n\n"
            
            # Check if session completed
            session = GameSession.query.get(session_id)
            if session and session.status == 'completed':
                break
                
            time.sleep(2)  # Update every 2 seconds
            
    except GeneratorExit:
        active_connections[f"{session_id}_results"].discard(connection_id)
        current_app.logger.info("Live results SSE disconnected")
    except Exception as e:
        current_app.logger.error(f"Live results SSE error: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    finally:
        active_connections[f"{session_id}_results"].discard(connection_id)

@live_events.route('/sessions/<int:session_id>/voter-status-stream')
@jwt_required()
@with_app_context
def voter_status_stream(session_id):
    """SSE endpoint for voter status updates"""
    
    current_user_id = get_jwt_identity()
    token = request.args.get('token')
    
    # Verify session access
    session = GameSession.query.get(session_id)
    if not session:
        yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
        return
        
    user = User.query.get(current_user_id)
    if user not in session.group.members:
        yield f"data: {json.dumps({'error': 'Access denied'})}\n\n"
        return
    
    connection_id = f"voter_{current_user_id}_{int(time.time())}"
    active_connections[f"{session_id}_voters"].add(connection_id)
    
    try:
        while True:
            # Get voter status with fresh data
            db.session.expire_all()
            voter_data = get_voter_status_data(session_id)
            
            if voter_data:
                yield f"data: {json.dumps(voter_data)}\n\n"
            else:
                # Send heartbeat
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': time.time()})}\n\n"
            
            # Check if session completed
            session = GameSession.query.get(session_id)
            if session and session.status == 'completed':
                break
                
            time.sleep(2)  # Update every 2 seconds
            
    except GeneratorExit:
        active_connections[f"{session_id}_voters"].discard(connection_id)
        current_app.logger.info("Voter status SSE disconnected")
    except Exception as e:
        current_app.logger.error(f"Voter Status SSE Error: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    finally:
        active_connections[f"{session_id}_voters"].discard(connection_id)

def get_live_voting_results(session_id):
    """Get live voting results data"""
    try:
        session = GameSession.query.get(session_id)
        if not session:
            return None
        
        # Get current votes
        votes = Vote.query.filter_by(session_id=session_id).all()
        
        # Calculate results
        results = {}
        for vote in votes:
            game_id = vote.game_id
            if game_id not in results:
                # Get game info from steam library or use basic info
                game_info = {
                    'game_id': game_id,
                    'name': getattr(vote, 'game_name', f'Game {game_id}'),
                    'votes': 0,
                    'voters': []
                }
                results[game_id] = game_info
            
            results[game_id]['votes'] += 1
            results[game_id]['voters'].append({
                'user_id': vote.user_id,
                'username': vote.user.username if vote.user else 'Unknown',
                'priority': vote.priority
            })
        
        return {
            'session_id': session_id,
            'results': list(results.values()),
            'total_votes': len(votes),
            'timestamp': time.time(),
            'session_status': session.status
        }
        
    except Exception as e:
        current_app.logger.error(f"Error getting live voting results: {e}")
        return None

def get_voter_status_data(session_id):
    """Get voter status data"""
    try:
        session = GameSession.query.get(session_id)
        if not session:
            return None
            
        group = session.group
        
        # Get all group members
        members = group.members
        
        # Get who has voted
        voted_user_ids = db.session.query(Vote.user_id).filter_by(
            session_id=session_id
        ).distinct().all()
        voted_user_ids = set(user_id[0] for user_id in voted_user_ids)
        
        pending_voters = []
        recent_voters = []
        
        for member in members:
            user_data = {
                'user_id': member.id,
                'username': member.username,
                'avatar_url': member.avatar_url or member.steam_avatar_url
            }
            
            if member.id in voted_user_ids:
                # Get vote details
                user_votes = Vote.query.filter_by(
                    session_id=session_id,
                    user_id=member.id
                ).all()
                
                user_data.update({
                    'vote_count': len(user_votes),
                    'voted_at': max(vote.created_at for vote in user_votes).isoformat() if user_votes else None
                })
                recent_voters.append(user_data)
            else:
                pending_voters.append(user_data)
        
        return {
            'session_id': session_id,
            'pending_voters': pending_voters,
            'recent_voters': recent_voters,
            'progress': {
                'voted': len(recent_voters),
                'total': len(members),
                'percentage': (len(recent_voters) / len(members)) * 100 if members else 0
            },
            'session_status': session.status,
            'voting_complete': len(pending_voters) == 0,
            'timestamp': time.time(),
            'success': True
        }
        
    except Exception as e:
        current_app.logger.error(f"Error getting voter status: {e}")
        return None

@live_events.route('/sessions/<int:session_id>/broadcast', methods=['POST'])
@jwt_required()
def broadcast_event(session_id):
    """🚀 Broadcast events to all connected clients"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify access
        session = GameSession.query.get(session_id)
        if not session:
            raise APIException("Session not found", status_code=404)
            
        user = User.query.get(current_user_id)
        if user not in session.group.members:
            raise APIException("Access denied", status_code=403)
        
        event_type = data.get('type')
        if not event_type:
            raise APIException("Event type required", status_code=400)
        
        # Create event
        event = {
            'type': event_type,
            'session_id': session_id,
            'user_id': current_user_id,
            'username': user.username,
            'timestamp': utc_now().isoformat(),
            'data': data.get('data', {})
        }
        
        # Store event
        event_store[session_id].append(event)
        
        # Limit event history (keep last 100 events)
        if len(event_store[session_id]) > 100:
            event_store[session_id] = event_store[session_id][-100:]
        
        print(f"📡 Broadcasting event to {len(active_connections[session_id])} connections: {event_type}")
        
        return jsonify({
            "success": True,
            "event": event,
            "active_connections": len(active_connections[session_id])
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"❌ Broadcast error: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

@live_events.route('/sessions/<int:session_id>/state', methods=['GET'])
@jwt_required()
def get_session_state(session_id):
    """Get current live state snapshot"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify access
        session = GameSession.query.get(session_id)
        if not session:
            raise APIException("Session not found", status_code=404)
            
        user = User.query.get(current_user_id)
        if user not in session.group.members:
            raise APIException("Access denied", status_code=403)
        
        state = get_session_live_state(session_id)
        
        return jsonify({
            "success": True,
            **state
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"success": False, "error": "Internal server error"}), 500

def get_session_live_state(session_id):
    """Helper to get comprehensive session state"""
    session = GameSession.query.get(session_id)
    if not session:
        return {'error': 'Session not found'}
    
    # Get member status
    group_members = session.group.members
    voted_user_ids = db.session.query(Vote.user_id).filter_by(
        session_id=session_id
    ).distinct().all()
    voted_user_ids = [user_id[0] for user_id in voted_user_ids]
    
    # Build member status
    members_status = []
    for member in group_members:
        has_voted = member.id in voted_user_ids
        vote_count = Vote.query.filter_by(
            session_id=session_id,
            user_id=member.id
        ).count()
        
        latest_vote = None
        if has_voted:
            latest_vote = Vote.query.filter_by(
                session_id=session_id,
                user_id=member.id
            ).order_by(Vote.created_at.desc()).first()
        
        members_status.append({
            'user_id': member.id,
            'username': member.username,
            'avatar_url': member.avatar_url or member.steam_avatar_url,
            'has_voted': has_voted,
            'vote_count': vote_count,
            'last_vote_time': latest_vote.created_at.isoformat() if latest_vote else None,
            'status': 'voted' if has_voted else 'waiting'
        })
    
    # Get vote results using the Vote model
    from api.models import Vote as VoteModel
    vote_results = VoteModel.get_session_results(session_id)
    
    # Calculate summary
    total_members = len(group_members)
    voted_count = len(voted_user_ids)
    
    return {
        'type': 'state_update',
        'session': session.serialize(),
        'members': members_status,
        'vote_results': vote_results,
        'summary': {
            'total_members': total_members,
            'voted_count': voted_count,
            'waiting_count': total_members - voted_count,
            'progress_percentage': (voted_count / total_members * 100) if total_members > 0 else 0,
            'all_voted': voted_count >= total_members,
            'voting_active': session.status == 'voting'
        },
        'active_connections': len(active_connections[session_id]),
        'timestamp': utc_now().isoformat()
    }

# Event broadcasting helpers
def broadcast_vote_cast(session_id, user_id, votes):
    """Broadcast when a user casts votes"""
    user = User.query.get(user_id)
    if not user:
        return
    
    event = {
        'type': 'vote_cast',
        'session_id': session_id,
        'user_id': user_id,
        'username': user.username,
        'vote_count': len(votes),
        'timestamp': utc_now().isoformat(),
        'data': {
            'votes': [{'game_id': v['game_id'], 'priority': v['priority']} for v in votes]
        }
    }
    
    event_store[session_id].append(event)
    print(f"📡 Vote cast event stored for session {session_id}")

def broadcast_session_complete(session_id):
    """Broadcast when voting session completes"""
    event = {
        'type': 'session_completed',
        'session_id': session_id,
        'timestamp': utc_now().isoformat(),
        'data': {}
    }
    
    event_store[session_id].append(event)
    print(f"📡 Session complete event stored for session {session_id}")

def broadcast_member_joined(session_id, user_id):
    """Broadcast when a member joins the session"""
    user = User.query.get(user_id)
    if not user:
        return
    
    event = {
        'type': 'member_joined',
        'session_id': session_id,
        'user_id': user_id,
        'username': user.username,
        'timestamp': utc_now().isoformat(),
        'data': {}
    }
    
    event_store[session_id].append(event)
    print(f"📡 Member joined event stored for session {session_id}")

# Cleanup old events periodically
def cleanup_old_events():
    """Clean up old events (run this periodically)"""
    current_time = utc_now()
    for session_id in list(event_store.keys()):
        # Remove events older than 1 hour
        event_store[session_id] = [
            event for event in event_store[session_id]
            if (current_time - datetime.fromisoformat(event['timestamp'])).seconds < 3600
        ]
        
        # Remove empty session stores
        if not event_store[session_id]:
            del event_store[session_id]
        
        # Clean up inactive connections
        for key in list(active_connections.keys()):
            if not active_connections[key]:
                del active_connections[key]