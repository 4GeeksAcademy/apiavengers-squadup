# src/api/member_status.py - Live Member Status Tracking
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, GameSession, Vote, GamingGroup
from api.utils import APIException
import json
import time
from datetime import datetime

member_status = Blueprint('member_status', __name__)

@member_status.route('/sessions/<int:session_id>/member-status')
@jwt_required()
def stream_member_status(session_id):
    """🚀 NEW: Stream live member voting status like Kahoot"""
    
    def generate_member_status():
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
        
        while True:
            try:
                # Get current member status
                members_status = get_session_member_status(session_id)
                current_update = datetime.utcnow().isoformat()
                
                # Only send if data changed
                if current_update != last_update:
                    status_data = {
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
                    break
                    
                time.sleep(1)  # Update every second
                
            except Exception as e:
                yield f"data: {json.dumps({'error': f'Status stream error: {str(e)}'})}\n\n"
                break
    
    return Response(
        generate_member_status(),
        mimetype='text/plain',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        }
    )

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
        return jsonify({"success": False, "error": "Internal server error"}), 500

def get_session_member_status(session_id):
    """Helper function to get member voting status"""
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
        
        if has_voted:
            # Get most recent vote time for this user
            latest_vote = Vote.query.filter_by(
                session_id=session_id,
                user_id=member.id
            ).order_by(Vote.created_at.desc()).first()
            
            if latest_vote:
                vote_time = latest_vote.created_at.isoformat()
        
        members_status.append({
            'user_id': member.id,
            'username': member.username,
            'avatar_url': member.avatar_url or member.steam_avatar_url,
            'has_voted': has_voted,
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