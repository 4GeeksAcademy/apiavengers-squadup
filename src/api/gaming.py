# src/api/gaming.py - SIMPLIFIED VERSION that integrates with live_voting_system.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, GamingGroup, GameSession, SteamGame, Vote
from api.utils import APIException, utc_now
import secrets
import string
import json

gaming = Blueprint('gaming', __name__)

# ============================================================================
# GROUP MANAGEMENT ENDPOINTS 
# ============================================================================

@gaming.route('/groups', methods=['GET'])
@jwt_required()
def get_user_groups():
    """Get all gaming groups for the current user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Get user's groups using the correct relationship name
        user_groups = []
        for group in user.member_of_groups:  # Use correct relationship name
            group_data = {
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'creator': {
                    'id': group.creator.id if group.creator else None,
                    'username': group.creator.username if group.creator else 'Unknown'
                },
                'current_members': len(group.members),
                'max_members': group.max_members,
                'invite_code': group.invite_code,
                'is_public': group.is_public,
                'created_at': group.created_at.isoformat(),
                'is_creator': group.creator_id == current_user_id,
                'has_active_session': any(s.status in ['planning', 'voting'] for s in group.sessions)
            }
            user_groups.append(group_data)
        
        return jsonify({
            'success': True,
            'groups': user_groups,
            'count': len(user_groups)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting user groups: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@gaming.route('/groups', methods=['POST'])
@jwt_required()
def create_group():
    """Create a new gaming group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        name = data.get('name', '').strip()
        if not name:
            return jsonify({'success': False, 'error': 'Group name is required'}), 400
        
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
        
        return jsonify({
            'success': True,
            'group': {
                'id': new_group.id,
                'name': new_group.name,
                'description': new_group.description,
                'invite_code': new_group.invite_code,
                'creator': {'id': user.id, 'username': user.username},
                'current_members': 1,
                'max_members': new_group.max_members
            },
            'message': 'Group created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating group: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@gaming.route('/groups/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group_details(group_id):
    """Get detailed information about a specific group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        
        if user not in group.members:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Get recent sessions
        recent_sessions = []
        for session in group.sessions[-5:]:  # Last 5 sessions
            session_data = {
                'id': session.id,
                'session_name': getattr(session, 'session_name', 'Voting Session'),
                'status': session.status,
                'created_at': session.created_at.isoformat(),
                'vote_count': len(session.votes) if session.votes else 0
            }
            recent_sessions.append(session_data)
        
        group_data = {
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'creator': {
                'id': group.creator.id if group.creator else None,
                'username': group.creator.username if group.creator else 'Unknown'
            },
            'current_members': len(group.members),
            'max_members': group.max_members,
            'invite_code': group.invite_code,
            'is_public': group.is_public,
            'created_at': group.created_at.isoformat(),
            'is_creator': group.creator_id == current_user_id,
            'members': [
                {
                    'id': member.id,
                    'username': member.username,
                    'avatar_url': member.avatar_url or member.steam_avatar_url,
                    'steam_connected': member.is_steam_connected,
                    'total_games': member.total_games or 0
                } for member in group.members
            ],
            'recent_sessions': recent_sessions,
            'has_active_session': any(s.status in ['planning', 'voting'] for s in group.sessions)
        }
        
        return jsonify({'success': True, 'group': group_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting group details: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@gaming.route('/groups/join/<invite_code>', methods=['POST'])
@jwt_required()
def join_group_by_invite(invite_code):
    """Join a group using invite code"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        group = GamingGroup.query.filter_by(invite_code=invite_code).first()
        if not group:
            return jsonify({'success': False, 'error': 'Invalid invite code'}), 404
        
        if user in group.members:
            return jsonify({'success': False, 'error': 'Already a member'}), 400
        
        if len(group.members) >= group.max_members:
            return jsonify({'success': False, 'error': 'Group is full'}), 400
        
        group.members.append(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully joined {group.name}',
            'group': {
                'id': group.id,
                'name': group.name,
                'current_members': len(group.members)
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error joining group: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@gaming.route('/groups/<int:group_id>/leave', methods=['POST'])
@jwt_required()
def leave_group(group_id):
    """Leave a group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        
        if user not in group.members:
            return jsonify({'success': False, 'error': 'Not a member'}), 400
        
        # Don't allow creator to leave if there are other members
        if group.creator_id == current_user_id and len(group.members) > 1:
            return jsonify({
                'success': False, 
                'error': 'Transfer ownership before leaving'
            }), 400
        
        group.members.remove(user)
        
        # If creator is leaving and they're the only member, delete the group
        if group.creator_id == current_user_id and len(group.members) == 0:
            db.session.delete(group)
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Left group successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error leaving group: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# ============================================================================
# MISSING ENDPOINTS THAT ACTIONS.JS EXPECTS
# ============================================================================

@gaming.route('/groups/<int:group_id>/transfer-ownership/<int:new_owner_id>', methods=['POST'])
@jwt_required()
def transfer_group_ownership(group_id, new_owner_id):
    """Transfer group ownership to another member"""
    try:
        current_user_id = get_jwt_identity()
        
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        
        if group.creator_id != current_user_id:
            return jsonify({'success': False, 'error': 'Only group creator can transfer ownership'}), 403
        
        new_owner = User.query.get(new_owner_id)
        if not new_owner:
            return jsonify({'success': False, 'error': 'New owner not found'}), 404
        
        if new_owner not in group.members:
            return jsonify({'success': False, 'error': 'New owner must be a group member'}), 400
        
        old_creator_name = group.creator.username if group.creator else 'Unknown'
        group.creator_id = new_owner_id
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Ownership transferred to {new_owner.username}',
            'old_creator': old_creator_name,
            'new_creator': new_owner.username
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error transferring ownership: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@gaming.route('/groups/<int:group_id>/kick/<int:user_id>', methods=['POST'])
@jwt_required()
def kick_group_member(group_id, user_id):
    """Kick a member from the group"""
    try:
        current_user_id = get_jwt_identity()
        
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        
        if group.creator_id != current_user_id:
            return jsonify({'success': False, 'error': 'Only group creator can kick members'}), 403
        
        if user_id == current_user_id:
            return jsonify({'success': False, 'error': 'Cannot kick yourself'}), 400
        
        user_to_kick = User.query.get(user_id)
        if not user_to_kick:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        if user_to_kick not in group.members:
            return jsonify({'success': False, 'error': 'User is not a member'}), 400
        
        group.members.remove(user_to_kick)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{user_to_kick.username} has been removed from the group',
            'kicked_user': user_to_kick.username,
            'remaining_members': len(group.members)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error kicking member: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@gaming.route('/groups/<int:group_id>/members', methods=['GET'])
@jwt_required()
def get_group_members(group_id):
    """Get detailed member information for a group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        
        if user not in group.members:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        members_data = []
        for member in group.members:
            member_info = {
                'id': member.id,
                'username': member.username,
                'avatar_url': member.avatar_url or member.steam_avatar_url,
                'steam_connected': member.is_steam_connected,
                'steam_id': member.steam_id,
                'total_games': member.total_games or 0,
                'is_creator': member.id == group.creator_id,
                'joined_at': member.created_at.isoformat() if member.created_at else None
            }
            members_data.append(member_info)
        
        # Sort by creator first, then by username
        members_data.sort(key=lambda x: (not x['is_creator'], x['username']))
        
        return jsonify({
            'success': True,
            'members': members_data,
            'total_members': len(members_data),
            'steam_connected_count': len([m for m in members_data if m['steam_connected']]),
            'current_user_is_creator': group.creator_id == current_user_id
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting group members: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# ============================================================================
# LIVE VOTING SESSION MANAGEMENT (Simplified)
# ============================================================================

@gaming.route('/groups/<int:group_id>/start-vote', methods=['POST'])
@jwt_required()
def start_group_vote(group_id):
    """Start a voting session for a group - simplified version"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        
        if user not in group.members:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Check if there's already an active session
        active_session = GameSession.query.filter_by(
            group_id=group_id, 
            status__in=['planning', 'voting']
        ).first()
        
        if active_session:
            return jsonify({
                'success': True,
                'session': {
                    'id': active_session.id,
                    'status': active_session.status,
                    'session_name': getattr(active_session, 'session_name', 'Voting Session')
                },
                'message': 'Rejoined existing session'
            }), 200
        
        # Get request data
        data = request.get_json() or {}
        session_name = data.get('session_name', f'Vote - {utc_now().strftime("%Y-%m-%d %H:%M")}')
        
        # Create new session in lobby state
        new_session = GameSession(
            group_id=group_id,
            creator_id=current_user_id,
            session_name=session_name,
            description=data.get('description', 'Group voting session'),
            status='planning',  # Start in planning/lobby state
            max_choices=data.get('max_choices', 3),
            auto_complete_threshold=data.get('auto_complete_threshold', 0.8),
            created_at=utc_now()
        )
        
        db.session.add(new_session)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'session': {
                'id': new_session.id,
                'session_name': new_session.session_name,
                'status': new_session.status,
                'created_at': new_session.created_at.isoformat(),
                'max_choices': new_session.max_choices,
                'auto_complete_threshold': new_session.auto_complete_threshold
            },
            'message': 'Voting session created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error starting vote: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@gaming.route('/groups/<int:group_id>/active-session', methods=['GET'])
@jwt_required()
def get_active_session(group_id):
    """Get active voting session for a group"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        
        if user not in group.members:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        active_session = GameSession.query.filter_by(
            group_id=group_id
        ).filter(
            GameSession.status.in_(['planning', 'voting'])
        ).first()
        
        if not active_session:
            return jsonify({
                'success': True,
                'session': None,
                'message': 'No active session'
            }), 200
        
        return jsonify({
            'success': True,
            'session': {
                'id': active_session.id,
                'session_name': getattr(active_session, 'session_name', 'Voting Session'),
                'status': active_session.status,
                'created_at': active_session.created_at.isoformat(),
                'max_choices': getattr(active_session, 'max_choices', 3),
                'auto_complete_threshold': getattr(active_session, 'auto_complete_threshold', 0.8),
                'is_creator': active_session.creator_id == current_user_id
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting active session: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@gaming.route('/groups/<int:group_id>/common-games', methods=['GET'])
@jwt_required()
def get_group_common_games(group_id):
    """Get common games for a group from synced Steam libraries"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        group = GamingGroup.query.get(group_id)
        if not group:
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        
        if user not in group.members:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Get Steam-connected members
        steam_members = [m for m in group.members if m.is_steam_connected and m.steam_id]
        
        if len(steam_members) < 2:
            return jsonify({
                'success': True,
                'games': [],
                'message': 'Need at least 2 Steam-connected members',
                'steam_connected_count': len(steam_members),
                'total_members': len(group.members)
            }), 200
        
        # Get common games using database query
        from sqlalchemy import func
        from api.models import user_games
        
        user_ids = [m.id for m in steam_members]
        
        # Find games owned by ALL steam members and are multiplayer
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
        ).limit(50)
        
        games = []
        for game in common_games_query:
            game_data = game.serialize()
            game_data['owned_by_all'] = True
            game_data['owner_count'] = len(user_ids)
            games.append(game_data)
        
        return jsonify({
            'success': True,
            'games': games,
            'total_games': len(games),
            'steam_connected_count': len(steam_members),
            'total_members': len(group.members)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting common games: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# ============================================================================
# SESSION RESULTS AND VOTING (Legacy endpoints for compatibility)
# ============================================================================

@gaming.route('/sessions/<int:session_id>/results', methods=['GET'])
@jwt_required()
def get_session_results(session_id):
    """Get voting results for a session"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        session = GameSession.query.get(session_id)
        if not session:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        if user not in session.group.members:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Get results using Vote model
        results = Vote.get_session_results(session_id)
        total_voters = Vote.get_voter_count(session_id)
        total_members = len(session.group.members)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'results': results,
            'winner': results[0] if results else None,
            'total_voters': total_voters,
            'total_members': total_members,
            'voting_complete': session.status == 'completed',
            'session_status': session.status
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting session results: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@gaming.route('/sessions/<int:session_id>/my-votes', methods=['GET'])
@jwt_required()
def get_my_session_votes(session_id):
    """Get current user's votes for a session"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        session = GameSession.query.get(session_id)
        if not session:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        if user not in session.group.members:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Get user's votes
        votes = Vote.get_user_votes(session_id, current_user_id)
        has_voted = len(votes) > 0
        
        formatted_votes = []
        for vote in votes:
            game = SteamGame.query.get(vote.game_id)
            vote_data = {
                'game_id': vote.game_id,
                'priority': vote.priority,
                'points': vote.priority,
                'created_at': vote.created_at.isoformat()
            }
            
            if game:
                vote_data['game'] = {
                    'id': game.id,
                    'name': game.name,
                    'header_image': game.header_image
                }
            
            formatted_votes.append(vote_data)
        
        return jsonify({
            'success': True,
            'has_voted': has_voted,
            'votes': formatted_votes,
            'vote_count': len(formatted_votes),
            'can_vote': not has_voted and session.status == 'voting'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting user votes: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500