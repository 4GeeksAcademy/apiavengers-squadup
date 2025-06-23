from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from api.models import db, User
from api.utils import APIException

# This blueprint is ONLY for authentication routes.
auth_blueprint = Blueprint('auth', __name__)

# --- DEVELOPER A: SIGN UP ROUTE ---
@auth_blueprint.route('/signup', methods=['POST'])  # Changed from /register to /signup
def signup_user():
    data = request.get_json()
    if not data:
        raise APIException("Request body must be JSON", status_code=400)

    email = data.get('email')
    username = data.get('username')
    password = data.get('password')

    if not all([email, username, password]):
        raise APIException("Email, username, and password are required", status_code=400)

    # Check if email already exists
    if User.query.filter_by(email=email).first():
        raise APIException("Email already registered", status_code=409)
    
    # Check if username already exists
    if User.query.filter_by(username=username).first():
        raise APIException("Username already taken", status_code=409)

    # Create new user
    new_user = User(email=email, username=username)
    new_user.set_password(password)

    try:
        db.session.add(new_user)
        db.session.commit()
        print(f"✅ User created successfully: {email}")  # Debug log
    except Exception as e:
        db.session.rollback()
        print(f"❌ Database error: {e}")  # Debug log
        raise APIException(f"Database error: {e}", status_code=500)

    # Create access token
    access_token = create_access_token(identity=new_user.id)
    
    return jsonify({
        "message": "User created successfully!",
        "token": access_token,
        "user": new_user.serialize()
    }), 201

# Keep the /register route as well for compatibility
@auth_blueprint.route('/register', methods=['POST'])
def register_user():
    return signup_user()  # Just redirect to the signup function

# --- DEVELOPER B: LOGIN ROUTE (Placeholder) ---
# Developer B will implement this route later.
# @auth_blueprint.route('/login', methods=['POST'])
# def login_user():
#     # Login logic to be implemented by Developer B
#     return jsonify({"message": "Login logic to be implemented"})