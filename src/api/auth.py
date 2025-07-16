# src/api/auth.py

from flask import Blueprint, request, jsonify, current_app
from api.models import db, User  # User model now handles password logic
from api.utils import APIException
from flask_cors import CORS
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
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

        if not data:
            raise APIException("No data provided", status_code=400)

        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirmPassword', '')

        # Validate required fields
        if not email or not username or not password:
            raise APIException(
                "Email, username, and password are required", status_code=400)

        # Validate email format
        if not validate_email(email):
            raise APIException("Invalid email format", status_code=400)

        # Validate username
        is_valid_username, username_message = validate_username(username)
        if not is_valid_username:
            raise APIException(username_message, status_code=400)

        # Validate password
        is_valid_password, password_message = validate_password(password)
        if not is_valid_password:
            raise APIException(password_message, status_code=400)

        # Check password confirmation
        if password != confirm_password:
            raise APIException("Passwords do not match", status_code=400)

        # Check if user already exists
        existing_user_email = User.query.filter_by(email=email).first()
        if existing_user_email:
            raise APIException("Email already registered", status_code=409)

        existing_user_username = User.query.filter_by(
            username=username).first()
        if existing_user_username:
            raise APIException("Username already taken", status_code=409)

        # Create new user
        new_user = User()
        new_user.email = email
        new_user.username = username
        new_user.password_hash = generate_password_hash(password)
        new_user.is_active = True

        try:
            db.session.add(new_user)
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.exception(e)   # prints full DB message
        # Detect duplicate-key vs. NOT-NULL if you like:
            return jsonify({"error": "Duplicate email or username"}), 409
        except ProgrammingError as e:
            db.session.rollback()
            current_app.logger.exception(e)
            return jsonify({"error": "Schema mismatch—run migrations"}), 500

        # Create SECURE tokens (1 hour access + 30 day refresh)
        access_token = create_access_token(
            identity=new_user.id,
            expires_delta=timedelta(hours=1)
        )

        refresh_token = create_refresh_token(
            identity=new_user.id,
            expires_delta=timedelta(days=30)
        )

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
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500



@auth.route('/login', methods=['POST'])
def login():
    try:
        # --- (Request parsing is unchanged) ---
        data = request.get_json()

        if not data:
            raise APIException("No data provided", status_code=400)

        login_field = data.get('login', '').strip()
        password = data.get('password', '')

        if not login_field or not password:
            raise APIException(
                "Login and password are required", status_code=400)

        # Find user by email or username
        user = None
        if validate_email(login_field):
            user = User.query.filter_by(email=login_field.lower()).first()
        else:
            user = User.query.filter_by(username=login_field).first()

        if not user or not check_password_hash(user.password_hash, password):
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
        # Get the JWT ID (jti) to blacklist the token
        token = get_jwt()
        jti = token['jti']

        # Import blacklist from app.py
        from app import blacklisted_tokens
        blacklisted_tokens.add(jti)

        return jsonify({
            "message": "Successfully logged out",
            "code": "LOGOUT_SUCCESS"
        }), 200

    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({"success": False, "error": "Logout failed"}), 500


@auth.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.is_active:
            raise APIException("User not found or inactive", status_code=401)

        # Create new access token (1 hour)
        new_access_token = create_access_token(
            identity=current_user_id,
            expires_delta=timedelta(hours=1)
        )

        return jsonify({
            "tokens": {
                "access_token": new_access_token
            },
            "user": user.serialize(),
            "expires_in": 3600,  # 1 hour in seconds
            "code": "TOKEN_REFRESHED"
        }), 200

    except Exception as e:
        current_app.logger.error(f"Token refresh error: {str(e)}")
        return jsonify({"success": False, "error": "Token refresh failed"}), 401



@auth.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        #if not user or not user.is_active:
        #    raise APIException("Invalid or inactive user", status_code=401)

        # Get token expiration info
        token = get_jwt()

        return jsonify({
            "valid": True,
            "user": user.serialize(),
            "token_info": {
                "expires_at": token['exp'],
                "issued_at": token['iat'],
                "token_type": token['type']
            },
            "code": "TOKEN_VALID"
        }), 200

    except APIException as e:
        return jsonify({
            "valid": False,
            "error": e.message,
            "code": "TOKEN_INVALID"
        }), e.status_code
    except Exception as e:
        current_app.logger.error(f"Token verification error: {str(e)}")
        return jsonify({"valid": False, "success": False, "error": "Invalid token"}), 401


@auth.route('/profile', methods=['GET', 'PUT'])
@jwt_required()
def profile():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            raise APIException("User not found", status_code=404)

        if request.method == 'GET':
            return jsonify({
                "user": user.serialize()
            }), 200

        elif request.method == 'PUT':
            data = request.get_json() or {}

            # Update allowed fields
            if 'bio' in data:
                user.bio = data['bio'][:500]  # Limit bio length

            if 'avatar_url' in data:
                user.avatar_url = data['avatar_url']
        
        user.gaming_style = data.get('gaming_style', user.gaming_style)

        # favourite genres is an array coming from React
        if 'favorite_genres' in data:
            user.favorite_genres = json.dumps(data['favorite_genres'])
                
        db.session.commit()

        return jsonify({
            "message": "Profile updated successfully",
            "user": user.serialize()
        }), 200

    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Profile error: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

@auth.route('/debug', methods=['GET'])
def debug_auth():
    return jsonify({"auth_system": "operational", "note": "Debug info here..."}), 200
