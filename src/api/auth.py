# src/api/auth.py - FIXED VERSION with proper JWT error handling and refresh endpoint

from flask import Blueprint, request, jsonify, current_app
from api.models import db, User
from api.utils import APIException, utc_now
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt, verify_jwt_in_request, decode_token
)
import re
import json
from datetime import timedelta
from sqlalchemy import or_
import traceback

auth = Blueprint('auth', __name__)

# Import limiter from main app
def get_limiter():
    """Get the limiter instance from the main app"""
    from flask import current_app
    return getattr(current_app, 'limiter', None)

# ============================================================================
# JWT ERROR HANDLERS - FIXED
# ============================================================================

@auth.errorhandler(401)
def handle_auth_unauthorized(error):
    """Handle 401 errors in auth blueprint"""
    return jsonify({
        'success': False,
        'error': 'Authentication required',
        'code': 'TOKEN_REQUIRED'
    }), 401

@auth.errorhandler(422)
def handle_auth_jwt_error(error):
    """Handle JWT validation errors in auth blueprint"""
    return jsonify({
        'success': False,
        'error': 'Invalid or expired token',
        'code': 'TOKEN_INVALID'
    }), 422

# ============================================================================
# ENHANCED JWT ERROR HANDLING
# ============================================================================

def handle_jwt_exceptions(f):
    """Decorator to handle JWT exceptions gracefully"""
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            current_app.logger.error(f"JWT Error in {f.__name__}: {str(e)}")
            current_app.logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Handle specific JWT errors
            error_type = type(e).__name__
            
            if 'ExpiredSignature' in error_type:
                return jsonify({
                    "success": False,
                    "error": "Your session has expired. Please log in again.",
                    "error_code": "token_expired"
                }), 401
            
            elif 'InvalidSignature' in error_type:
                return jsonify({
                    "success": False,
                    "error": "Invalid authentication token.",
                    "error_code": "invalid_token"
                }), 401
            
            elif 'DecodeError' in error_type:
                return jsonify({
                    "success": False,
                    "error": "Malformed authentication token.",
                    "error_code": "malformed_token"
                }), 401
            
            elif 'InvalidToken' in error_type:
                return jsonify({
                    "success": False,
                    "error": "Invalid authentication token.",
                    "error_code": "invalid_token"
                }), 401
            
            elif 'NoAuthorizationError' in error_type:
                return jsonify({
                    "success": False,
                    "error": "Authorization token is required.",
                    "error_code": "authorization_required"
                }), 401
            
            else:
                # Generic error handling
                return jsonify({
                    "success": False,
                    "error": "Authentication error occurred.",
                    "error_code": "auth_error"
                }), 401
    
    wrapper.__name__ = f.__name__
    return wrapper

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

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

def validate_token_format(token):
    """Validate JWT token format without decoding"""
    if not token or not isinstance(token, str):
        return False, "Token must be a string"
    
    parts = token.split('.')
    if len(parts) != 3:
        return False, "Token must have 3 parts separated by dots"
    
    return True, "Token format is valid"

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@auth.route('/register', methods=['POST'])
def register():
    """Enhanced register endpoint with comprehensive validation and error handling"""
    limiter = get_limiter()
    if limiter:
        limiter.limit("5 per minute")(lambda: None)()
    
    try:
        # Enhanced request logging for security monitoring
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        current_app.logger.info(f"Registration attempt from IP: {client_ip}")
        
        # Request validation
        data = request.get_json()
        if not data: 
            raise APIException("No data provided", status_code=400)
        
        # Extract and validate fields
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirmPassword', '')
        
        # Field presence validation
        if not email or not username or not password:
            raise APIException("Email, username, and password are required", status_code=400)
        
        # Email validation
        if not validate_email(email):
            raise APIException("Invalid email format", status_code=400)
        
        # Username validation
        is_valid_username, username_message = validate_username(username)
        if not is_valid_username:
            raise APIException(username_message, status_code=400)
        
        # Password validation
        is_valid_password, password_message = validate_password(password)
        if not is_valid_password:
            raise APIException(password_message, status_code=400)
        
        # Password confirmation
        if password != confirm_password:
            raise APIException("Passwords do not match", status_code=400)
        
        # Check for existing users
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
        
        # Create tokens
        access_token = create_access_token(
            identity=new_user.id, 
            expires_delta=timedelta(hours=24)
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
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 201
        
    except APIException as e:
        db.session.rollback()
        current_app.logger.warning(f"Registration failed: {e.message}")
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Registration unexpected error: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

@auth.route('/login', methods=['POST'])
@handle_jwt_exceptions
def login():
    """Enhanced login endpoint with comprehensive JWT error handling"""
    limiter = get_limiter()
    if limiter:
        limiter.limit("10 per minute")(lambda: None)()
    
    try:
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        
        # Request validation
        data = request.get_json()
        if not data: 
            raise APIException("No data provided", status_code=400)
        
        login_field = (data.get('login') or data.get('email') or data.get('username', '')).strip()
        password = data.get('password', '')
        
        if not login_field or not password: 
            raise APIException("Email/username and password are required", status_code=400)

        # User lookup with enhanced logging
        user = User.query.filter(or_(User.email == login_field.lower(), User.username == login_field)).first()

        if not user:
            current_app.logger.warning(f"Login attempt with non-existent user: {login_field}")
            raise APIException("Invalid credentials", status_code=401)
        
        if not user.check_password(password):
            current_app.logger.warning(f"Failed login attempt for user: {user.username}")
            raise APIException("Invalid credentials", status_code=401)
        
        if not user.is_active:
            current_app.logger.warning(f"Login attempt for inactive account: {user.username}")
            raise APIException("Account is deactivated. Please contact support.", status_code=401)
        
        # Update last login timestamp
        user.last_login = utc_now()
        db.session.commit()
        
        # Create tokens
        access_token = create_access_token(
            identity=user.id, 
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(
            identity=user.id, 
            expires_delta=timedelta(days=30)
        )
        
        current_app.logger.info(f"✅ Login successful for user: {user.username}")
        
        return jsonify({
            "success": True, 
            "message": f"Welcome back, {user.username}!",
            "user": user.serialize(),
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 200
        
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Login unexpected error: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

@auth.route('/logout', methods=['POST'])
@jwt_required()
@handle_jwt_exceptions
def logout():
    """Enhanced logout with proper token blacklisting"""
    try:
        jti = get_jwt()['jti']
        user_id = get_jwt_identity()
        
        # Add token to blacklist
        if hasattr(current_app, 'add_token_to_blocklist'):
            current_app.add_token_to_blocklist(jti)
        
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
@jwt_required(refresh=True)  # FIXED: Specify refresh=True for refresh tokens
def refresh_token():
    """Refresh access token using refresh token - FIXED VERSION"""
    try:
        # Get current user from refresh token
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        if not user.is_active:
            return jsonify({
                'success': False,
                'error': 'Account is inactive'
            }), 401
        
        # Create new access token
        new_access_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(hours=24)
        )
        
        current_app.logger.info(f"✅ Token refreshed for user: {user.username}")
        
        return jsonify({
            'success': True,
            'access_token': new_access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'steam_connected': user.steam_connected or user.is_steam_connected
            },
            'message': 'Token refreshed successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Token refresh error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Token refresh failed'
        }), 401

@auth.route('/verify', methods=['GET'])
@jwt_required()
@handle_jwt_exceptions
def verify_token():
    """Enhanced token verification with comprehensive validation"""
    try:
        current_user_id = get_jwt_identity()
        jwt_data = get_jwt()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active: 
            raise APIException("Invalid or inactive user", status_code=401)
        
        # Additional token validation
        token_valid = True
        validation_errors = []
        
        # Check if token is not expired (should be handled by JWT library, but double-check)
        if 'exp' in jwt_data:
            import time
            if time.time() > jwt_data['exp']:
                token_valid = False
                validation_errors.append("Token is expired")
        
        if not token_valid:
            current_app.logger.warning(f"Token validation failed for user {user.username}: {validation_errors}")
            return jsonify({
                "valid": False,
                "success": False,
                "error": "Token validation failed",
                "details": validation_errors
            }), 401
        
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
            "error": "Token verification failed"
        }), 401

@auth.route('/profile', methods=['GET', 'PUT'])
@jwt_required()
@handle_jwt_exceptions
def profile():
    """Enhanced profile management with comprehensive validation"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user: 
            raise APIException("User not found", status_code=404)
        
        if request.method == 'GET':
            return jsonify({
                "success": True, 
                "user": user.serialize()
            }), 200
            
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

# ============================================================================
# DEBUGGING AND MONITORING ENDPOINTS
# ============================================================================

@auth.route('/debug', methods=['GET'])
def debug_auth():
    """Debug endpoint - only available in development"""
    if current_app.config.get('DEBUG'):
        return jsonify({
            "auth_system": "operational", 
            "environment": "development",
            "rate_limiting": "enabled" if get_limiter() else "disabled",
            "jwt_config": {
                "secret_key_set": bool(current_app.config.get('JWT_SECRET_KEY')),
                "access_token_expires": str(current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES')),
                "refresh_token_expires": str(current_app.config.get('JWT_REFRESH_TOKEN_EXPIRES')),
                "algorithm": current_app.config.get('JWT_ALGORITHM'),
                "token_locations": current_app.config.get('JWT_TOKEN_LOCATION')
            },
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

@auth.route('/status', methods=['GET'])
def auth_status():
    """Authentication system status endpoint"""
    try:
        # Check database connection
        user_count = User.query.count()
        
        # Check JWT configuration
        jwt_configured = bool(current_app.config.get('JWT_SECRET_KEY'))
        
        return jsonify({
            "success": True,
            "status": "operational",
            "jwt_configured": jwt_configured,
            "database_connected": True,
            "total_users": user_count,
            "limiter_enabled": bool(get_limiter()),
            "environment": current_app.config.get('ENV', 'unknown')
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Auth status check failed: {str(e)}")
        return jsonify({
            "success": False,
            "status": "error",
            "error": str(e)
        }), 500

# ============================================================================
# PASSWORD RESET FUNCTIONALITY
# ============================================================================

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