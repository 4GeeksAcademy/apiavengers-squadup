"""
Gaming group management routes - PROPER LEAVE/DELETE LOGIC
Creator can DELETE group, members can LEAVE, auto-cleanup empty groups
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
# 🔧 FIXED: Removed 'Vote' from imports since it doesn't exist
from api.models import db, User, GamingGroup, GameSession
from api.utils import APIException
import secrets
import string

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
# SUMMARY OF THE LOGIC:
# ============================================================================
# """
# 👑 CREATOR POWERS:
#    - DELETE group (removes everyone, deletes all sessions)
#    - KICK any member
#    - LEAVE group (transfers ownership or auto-deletes if empty)

# 👤 MEMBER POWERS:
#    - LEAVE group (just removes them)

# 🤖 AUTO-CLEANUP:
#    - Empty groups are automatically deleted
#    - Ownership is transferred if creator leaves but others remain

# 🚫 PREVENTS:
#    - Orphaned empty groups
#    - Members deleting groups (only creators can)
#    - Kicking yourself (use leave/delete instead)
# """