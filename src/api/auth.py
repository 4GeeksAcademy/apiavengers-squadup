# src/api/auth.py

from flask import Blueprint, request, jsonify, current_app
from api.models import db, User  # User model now handles password logic
from api.utils import APIException
from flask_cors import CORS
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt
)
# No longer need to import password hashing functions here
import re
import json
from datetime import datetime, timedelta
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, ProgrammingError
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

auth = Blueprint('auth', __name__)
CORS(auth)

# --- (Validation functions are unchanged, they are excellent) ---
def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password):
    if len(password) < 8: return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password): return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password): return False, "Password must contain at least one lowercase letter"
    if not re.search(r'[0-9]', password): return False, "Password must contain at least one number"
    return True, "Password is valid"


def validate_username(username):
    if len(username) < 3 or len(username) > 20: return False, "Username must be between 3 and 20 characters"
    if not re.match(r'^[a-zA-Z0-9_]+$', username): return False, "Username can only contain letters, numbers, and underscores"
    return True, "Username is valid"


@auth.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([{
        "id": user.id,
        "email": user.email,
        "username": user.username,
    } for user in users]), 200


@auth.route('/register', methods=['POST'])
def register():
    try:
        # --- (Request parsing and validation are unchanged) ---
        data = request.get_json()
        if not data: raise APIException("No data provided", status_code=400)
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        if not email or not username or not password: raise APIException("Email, username, and password are required", status_code=400)
        if not validate_email(email): raise APIException("Invalid email format", status_code=400)
        is_valid_username, username_message = validate_username(username)
        if not is_valid_username: raise APIException(username_message, status_code=400)
        is_valid_password, password_message = validate_password(password)
        if not is_valid_password: raise APIException(password_message, status_code=400)
        if password != data.get('confirmPassword', ''): raise APIException("Passwords do not match", status_code=400)
        
        # Check if user already exists
        if User.query.filter(or_(User.email == email, User.username == username)).first():
            raise APIException("Email or username already exists", status_code=409)

        # Create new user
        new_user = User(email=email, username=username, is_active=True)
        # REFINED: Use the new method on the User model to set the password
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        # --- (Token creation and response are unchanged) ---
        access_token = create_access_token(identity=new_user.id, expires_delta=timedelta(hours=1))
        refresh_token = create_refresh_token(identity=new_user.id, expires_delta=timedelta(days=30))
        
        return jsonify({
            "success": True, "message": "User registered successfully",
            "user": new_user.serialize(),
            "tokens": {"access_token": access_token, "refresh_token": refresh_token},
            "expires_in": 3600
        }), 201

    except APIException as e:
        db.session.rollback()
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        current_app.logger.info(f"Generated access_token: {access_token[:20]}...")
        return jsonify({"success": False, "error": "Internal server error"}), 500



@auth.route('/login', methods=['POST'])
def login():
    try:
        # --- (Request parsing is unchanged) ---
        data = request.get_json()
        if not data: raise APIException("No data provided", status_code=400)
        login_field = (data.get('login') or data.get('email') or data.get('username', '')).strip()
        password = data.get('password', '')
        if not login_field or not password: raise APIException("Email/username and password are required", status_code=400)

        # Find user by email OR username
        user = User.query.filter(or_(User.email == login_field.lower(), User.username == login_field)).first()

        # REFINED: Use the new method on the User model to check the password
        if not user or not user.check_password(password):
            current_app.logger.warning(f"Failed login attempt for: {login_field}")
            raise APIException("Invalid credentials", status_code=401)

        if not user.is_active:
            current_app.logger.warning(f"Login attempt for inactive account: {user.username}")
            raise APIException("Account is deactivated", status_code=401)
        
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # --- (Token creation and response are unchanged) ---
        access_token = create_access_token(identity=user.id, expires_delta=timedelta(hours=1))
        refresh_token = create_refresh_token(identity=user.id, expires_delta=timedelta(days=30))
        
        current_app.logger.info(f"Login successful for user: {user.username}")
        
        return jsonify({
            "success": True, "message": "Login successful",
            "user": user.serialize(),
            "tokens": {"access_token": access_token, "refresh_token": refresh_token},
            "expires_in": 3600
        }), 200

    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Login unexpected error: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

# --- (The rest of your auth routes: /logout, /refresh, /verify, /profile, /debug are well-defined and do not need changes) ---
@auth.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        jti = get_jwt()['jti']
        if not hasattr(current_app, 'blacklisted_tokens'): current_app.blacklisted_tokens = set()
        current_app.blacklisted_tokens.add(jti)
        return jsonify({"success": True, "message": "Successfully logged out"}), 200
    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({"success": False, "error": "Logout failed"}), 500


@auth.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or not user.is_active: raise APIException("User not found or inactive", status_code=401)
        new_access_token = create_access_token(identity=current_user_id, expires_delta=timedelta(hours=1))
        return jsonify({"success": True, "tokens": {"access_token": new_access_token}, "user": user.serialize(), "expires_in": 3600}), 200
    except Exception as e:
        current_app.logger.error(f"Token refresh error: {str(e)}")
        return jsonify({"success": False, "error": "Token refresh failed"}), 401



@auth.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or not user.is_active: raise APIException("Invalid or inactive user", status_code=401)
        return jsonify({"valid": True, "success": True, "user": user.serialize()}), 200
    except Exception as e:
        current_app.logger.error(f"Token verification error: {str(e)}")
        return jsonify({"valid": False, "success": False, "error": "Invalid token"}), 401


@auth.route('/profile', methods=['GET', 'PUT'])
@jwt_required()
def profile():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user: raise APIException("User not found", status_code=404)
        if request.method == 'GET':
            return jsonify({"success": True, "user": user.serialize()}), 200
        elif request.method == 'PUT':
            data = request.get_json()
            if 'bio' in data: user.bio = data['bio'][:500]
            if 'avatar_url' in data: user.avatar_url = data['avatar_url']
            if 'gaming_style' in data: user.gaming_style = data['gaming_style']
            if 'favorite_genres' in data: user.favorite_genres = json.dumps(data['favorite_genres'])
            db.session.commit()
            return jsonify({"success": True, "message": "Profile updated successfully", "user": user.serialize()}), 200
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Profile error: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

@auth.route('/debug', methods=['GET'])
def debug_auth():
    return jsonify({"auth_system": "operational", "note": "Debug info here..."}), 200
