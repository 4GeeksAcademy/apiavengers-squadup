# src/api/member_status.py - Live Member Status Tracking
from flask import Blueprint, request, jsonify, Response, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, GameSession, Vote, GamingGroup
from api.utils import APIException
import json
import time
from datetime import datetime
from functools import wraps

member_status = Blueprint('member_status', __name__)

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
                    current_app.logger.info("Member status SSE client disconnected")
                except Exception as e:
                    current_app.logger.error(f"Member Status SSE Generator error: {e}")
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

@member_status.route('/sessions/<int:session_id>/member-status')
@jwt_required()
@with_app_context
def stream_member_status(session_id):
    """🚀 NEW: Stream live member voting status like Kahoot"""
    
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
    
    last_update = None
    heartbeat_counter = 0
    
    try:
        while True:
            # Refresh database session to get latest data
            db.session.expire_all()
            
            # Get current member status
            members_status = get_session_member_status(session_id)
            current_update = datetime.utcnow().isoformat()
            
            # Only send if data changed or for heartbeat
            heartbeat_counter += 1
            
            if current_update != last_update or heartbeat_counter >= 30:  # Heartbeat every 30 seconds
                if heartbeat_counter >= 30:
                    # Send heartbeat
                    yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': time.time()})}\n\n"
                    heartbeat_counter = 0
                
                if members_status and current_update != last_update:
                    status_data = {
                        'type': 'member_status_update',
                        'session_id': session_id,
                        'members': members_status['members'],
                        'summary': members_status['summary'],
                        'timestamp': current_update,
                        'voting_complete': members_status['summary']['all_voted']
                    }
                    
                    yield f"data: {json.dumps(status_data)}\n\n"
                    last_update = current_update
                
                    # Stop if voting complete
                    if members_status['summary']['all_voted']:
                        yield f"data: {json.dumps({'type': 'voting_completed', 'session_id': session_id})}\n\n"
                        break
            
            # Check if session is still active
            session = GameSession.query.get(session_id)
            if session and session.status == 'completed':
                yield f"data: {json.dumps({'type': 'session_completed', 'session_id': session_id})}\n\n"
                break
                
            time.sleep(1)  # Update every second
            
    except GeneratorExit:
        current_app.logger.info(f"Member status stream disconnected for session {session_id}")
    except Exception as e:
        current_app.logger.error(f"Member status stream error: {e}")
        yield f"data: {json.dumps({'error': f'Status stream error: {str(e)}'})}\n\n"

@member_status.route('/sessions/<int:session_id>/member-status-snapshot', methods=['GET'])
@jwt_required()
def get_member_status_snapshot(session_id):
    """Get current snapshot of member voting status"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify access
        session = GameSession.query.get(session_id)
        if not session:
            raise APIException("Session not found", status_code=404)
            
        user = User.query.get(current_user_id)
        if user not in session.group.members:
            raise APIException("Access denied", status_code=403)
        
        status_data = get_session_member_status(session_id)
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            **status_data
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Member status snapshot error: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

def get_session_member_status(session_id):
    """Helper function to get member voting status"""
    try:
        session = GameSession.query.get(session_id)
        if not session:
            return None
        
        # Get all group members
        group_members = session.group.members
        
        # Get users who have voted
        voted_user_ids = db.session.query(Vote.user_id).filter_by(
            session_id=session_id
        ).distinct().all()
        voted_user_ids = [user_id[0] for user_id in voted_user_ids]
        
        # Build member status list
        members_status = []
        for member in group_members:
            has_voted = member.id in voted_user_ids
            vote_time = None
            vote_count = 0
            
            if has_voted:
                # Get vote details for this user
                user_votes = Vote.query.filter_by(
                    session_id=session_id,
                    user_id=member.id
                ).all()
                
                vote_count = len(user_votes)
                
                if user_votes:
                    # Get most recent vote time
                    latest_vote = max(user_votes, key=lambda v: v.created_at)
                    vote_time = latest_vote.created_at.isoformat()
            
            members_status.append({
                'user_id': member.id,
                'username': member.username,
                'avatar_url': member.avatar_url or member.steam_avatar_url,
                'has_voted': has_voted,
                'vote_count': vote_count,
                'vote_time': vote_time,
                'status': 'voted' if has_voted else 'waiting'
            })
        
        # Calculate summary
        total_members = len(group_members)
        voted_count = len(voted_user_ids)
        
        summary = {
            'total_members': total_members,
            'voted_count': voted_count,
            'waiting_count': total_members - voted_count,
            'progress_percentage': (voted_count / total_members * 100) if total_members > 0 else 0,
            'all_voted': voted_count >= total_members,
            'voting_active': session.status == 'voting'
        }
        
        return {
            'members': members_status,
            'summary': summary
        }
        
    except Exception as e:
        current_app.logger.error(f"Error getting member status for session {session_id}: {e}")
        return None

# Helper function to broadcast member status updates
def broadcast_member_status_update(session_id, user_id, action='vote_cast'):
    """Broadcast member status changes to all connected clients"""
    try:
        # This could integrate with your live_events system
        from api.live_events import event_store
        
        user = User.query.get(user_id)
        if not user:
            return
        
        event = {
            'type': 'member_status_changed',
            'session_id': session_id,
            'user_id': user_id,
            'username': user.username,
            'action': action,
            'timestamp': datetime.utcnow().isoformat(),
            'data': get_session_member_status(session_id)
        }
        
        event_store[session_id].append(event)
        current_app.logger.info(f"📡 Member status update broadcasted for session {session_id}")
        
    except Exception as e:
        current_app.logger.error(f"Error broadcasting member status update: {e}")