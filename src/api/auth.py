# src/api/auth.py - Enhanced with rate limiting

from flask import Blueprint, request, jsonify, current_app
from api.models import db, User  # User model now handles password logic
from api.utils import APIException
from flask_cors import CORS
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt
)
import re
import json
from datetime import datetime, timedelta
from sqlalchemy import or_

auth = Blueprint('auth', __name__)
CORS(auth)

# Import limiter from main app
def get_limiter():
    """Get the limiter instance from the main app"""
    from flask import current_app
    return getattr(current_app, 'limiter', None)

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


@auth.route('/register', methods=['POST'])
def register():
    """Enhanced register endpoint with rate limiting"""
    limiter = get_limiter()
    if limiter:
        # Apply rate limiting: 5 registration attempts per minute
        limiter.limit("5 per minute")(lambda: None)()
    
    try:
        # Enhanced request logging for security monitoring
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        current_app.logger.info(f"Registration attempt from IP: {client_ip}")
        
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
        
        # Enhanced duplicate checking
        existing_user = User.query.filter(or_(User.email == email, User.username == username)).first()
        if existing_user:
            if existing_user.email == email:
                raise APIException("An account with this email already exists", status_code=409)
            else:
                raise APIException("This username is already taken", status_code=409)

        # Create new user
        new_user = User(email=email, username=username, is_active=True)
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        # Enhanced token creation with user info logging
        access_token = create_access_token(
            identity=new_user.id, 
            expires_delta=timedelta(hours=1),
            additional_claims={'username': new_user.username, 'email': new_user.email}
        )
        refresh_token = create_refresh_token(
            identity=new_user.id, 
            expires_delta=timedelta(days=30)
        )
        
        current_app.logger.info(f"User registered successfully: {new_user.username} ({new_user.email})")
        
        return jsonify({
            "success": True, 
            "message": "Account created successfully! Welcome to SquadUp!",
            "user": new_user.serialize(),
            "tokens": {"access_token": access_token, "refresh_token": refresh_token},
            "expires_in": 3600
        }), 201
        
    except APIException as e:
        db.session.rollback()
        current_app.logger.warning(f"Registration failed: {e.message} (IP: {client_ip})")
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Registration unexpected error: {str(e)} (IP: {client_ip})")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@auth.route('/login', methods=['POST'])
def login():
    """Enhanced login endpoint with rate limiting and security monitoring"""
    limiter = get_limiter()
    if limiter:
        # Apply rate limiting: 10 login attempts per minute
        limiter.limit("10 per minute")(lambda: None)()
    
    try:
        # Enhanced request logging for security monitoring
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        
        # --- (Request parsing is unchanged) ---
        data = request.get_json()
        if not data: raise APIException("No data provided", status_code=400)
        login_field = (data.get('login') or data.get('email') or data.get('username', '')).strip()
        password = data.get('password', '')
        if not login_field or not password: raise APIException("Email/username and password are required", status_code=400)

        # Enhanced user lookup with logging
        user = User.query.filter(or_(User.email == login_field.lower(), User.username == login_field)).first()

        if not user:
            current_app.logger.warning(f"Login attempt with non-existent user: {login_field} (IP: {client_ip})")
            raise APIException("Invalid credentials", status_code=401)
        
        if not user.check_password(password):
            current_app.logger.warning(f"Failed login attempt for user: {user.username} (IP: {client_ip})")
            raise APIException("Invalid credentials", status_code=401)
        
        if not user.is_active:
            current_app.logger.warning(f"Login attempt for inactive account: {user.username} (IP: {client_ip})")
            raise APIException("Account is deactivated. Please contact support.", status_code=401)
        
        # Update last login timestamp
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Enhanced token creation with additional claims
        access_token = create_access_token(
            identity=user.id, 
            expires_delta=timedelta(hours=1),
            additional_claims={
                'username': user.username, 
                'email': user.email,
                'steam_connected': user.is_steam_connected
            }
        )
        refresh_token = create_refresh_token(identity=user.id, expires_delta=timedelta(days=30))
        
        current_app.logger.info(f"Login successful for user: {user.username} (IP: {client_ip})")
        
        return jsonify({
            "success": True, 
            "message": f"Welcome back, {user.username}!",
            "user": user.serialize(),
            "tokens": {"access_token": access_token, "refresh_token": refresh_token},
            "expires_in": 3600
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Login unexpected error: {str(e)} (IP: {client_ip})")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@auth.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Enhanced logout with token blacklisting"""
    try:
        jti = get_jwt()['jti']
        user_id = get_jwt_identity()
        
        # Initialize blacklist if it doesn't exist
        if not hasattr(current_app, 'blacklisted_tokens'): 
            current_app.blacklisted_tokens = set()
        
        current_app.blacklisted_tokens.add(jti)
        
        # Log successful logout
        user = User.query.get(user_id)
        if user:
            current_app.logger.info(f"User logged out: {user.username}")
        
        return jsonify({
            "success": True, 
            "message": "Successfully logged out. See you next time!"
        }), 200
    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({"success": False, "error": "Logout failed"}), 500


@auth.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Enhanced token refresh with validation"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active: 
            raise APIException("User not found or inactive", status_code=401)
        
        # Create new access token with updated claims
        new_access_token = create_access_token(
            identity=current_user_id, 
            expires_delta=timedelta(hours=1),
            additional_claims={
                'username': user.username,
                'email': user.email,
                'steam_connected': user.is_steam_connected
            }
        )
        
        current_app.logger.info(f"Token refreshed for user: {user.username}")
        
        return jsonify({
            "success": True, 
            "tokens": {"access_token": new_access_token}, 
            "user": user.serialize(), 
            "expires_in": 3600
        }), 200
    except Exception as e:
        current_app.logger.error(f"Token refresh error: {str(e)}")
        return jsonify({"success": False, "error": "Token refresh failed"}), 401


@auth.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Enhanced token verification with user validation"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active: 
            raise APIException("Invalid or inactive user", status_code=401)
        
        return jsonify({
            "valid": True, 
            "success": True, 
            "user": user.serialize(),
            "message": "Token is valid"
        }), 200
    except Exception as e:
        current_app.logger.error(f"Token verification error: {str(e)}")
        return jsonify({
            "valid": False, 
            "success": False, 
            "error": "Invalid token"
        }), 401


@auth.route('/profile', methods=['GET', 'PUT'])
@jwt_required()
def profile():
    """Enhanced profile management with validation"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user: raise APIException("User not found", status_code=404)
        
        if request.method == 'GET':
            return jsonify({"success": True, "user": user.serialize()}), 200
            
        elif request.method == 'PUT':
            data = request.get_json()
            
            # Enhanced profile update with validation
            if 'bio' in data: 
                bio = data['bio'][:500]  # Limit bio length
                user.bio = bio
            
            if 'avatar_url' in data: 
                avatar_url = data['avatar_url']
                # Basic URL validation
                if avatar_url and not avatar_url.startswith(('http://', 'https://')):
                    raise APIException("Invalid avatar URL format", status_code=400)
                user.avatar_url = avatar_url
            
            if 'gaming_style' in data: 
                gaming_style = data['gaming_style']
                valid_styles = ['Casual', 'Competitive', 'Hardcore', 'Social', 'Solo', 'Co-op']
                if gaming_style and gaming_style not in valid_styles:
                    raise APIException("Invalid gaming style", status_code=400)
                user.gaming_style = gaming_style
            
            if 'favorite_genres' in data: 
                genres = data['favorite_genres']
                if isinstance(genres, list) and len(genres) <= 10:  # Limit to 10 genres
                    user.favorite_genres = json.dumps(genres)
                else:
                    raise APIException("Invalid favorite genres format", status_code=400)
            
            db.session.commit()
            current_app.logger.info(f"Profile updated for user: {user.username}")
            
            return jsonify({
                "success": True, 
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
    """Debug endpoint - only available in development"""
    if current_app.config.get('DEBUG'):
        return jsonify({
            "auth_system": "operational", 
            "environment": "development",
            "rate_limiting": "enabled" if get_limiter() else "disabled",
            "endpoints": {
                "register": "/api/auth/register (POST)",
                "login": "/api/auth/login (POST)", 
                "verify": "/api/auth/verify (GET)",
                "profile": "/api/auth/profile (GET/PUT)",
                "logout": "/api/auth/logout (POST)",
                "refresh": "/api/auth/refresh (POST)"
            }
        }), 200
    else:
        return jsonify({"error": "Debug endpoint not available in production"}), 403


# Enhanced password reset endpoint (if you want to add this feature)
@auth.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Password reset request endpoint"""
    limiter = get_limiter()
    if limiter:
        # Very strict rate limiting for password reset
        limiter.limit("3 per minute")(lambda: None)()
    
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email or not validate_email(email):
            raise APIException("Valid email address is required", status_code=400)
        
        user = User.query.filter_by(email=email).first()
        
        # Always return success to prevent email enumeration
        # In a real implementation, you would send an email here
        current_app.logger.info(f"Password reset requested for email: {email}")
        
        return jsonify({
            "success": True,
            "message": "If an account with that email exists, we've sent password reset instructions."
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Password reset error: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500