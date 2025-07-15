# src/api/steam_auth.py
"""
Steam OpenID authentication for MVP
"""
from flask import Blueprint, request, redirect, url_for, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from urllib.parse import urlencode
import requests
import re
import os
from api.models import db, User
from api.steam_service import steam_service
from api.utils import APIException

steam_auth = Blueprint('steam_auth', __name__)

STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

@steam_auth.route('/steam/login', methods=['GET'])
@jwt_required()
def steam_login():
    """Redirect user to Steam for authentication"""
    # Get the frontend URL from the request or use default
    frontend_url = request.args.get('return_to', '')
    if not frontend_url:
        # Use the VITE_BACKEND_URL to construct frontend URL
        backend_url = request.url_root.rstrip('/')
        # Replace port 3001 with 3000 for frontend
        frontend_url = backend_url.replace('-3001.', '-3000.') + '/steam/callback'
    
    current_user_id = get_jwt_identity()
    
    # Store user ID in session for callback
    params = {
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': url_for('steam_auth.steam_callback', 
                                   _external=True, 
                                   user_id=current_user_id,
                                   return_to=frontend_url),
        'openid.realm': request.url_root,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    }
    
    return redirect(f"{STEAM_OPENID_URL}?{urlencode(params)}")

@steam_auth.route('/steam/callback', methods=['GET'])
def steam_callback():
    """Handle Steam OpenID callback - no JWT required here"""
    user_id = request.args.get('user_id')
    frontend_return = request.args.get('return_to', 'http://localhost:3000/steam/callback')
    
    if not user_id:
        return redirect(f"{frontend_return}?steam_error=no_user")
    
    try:
        # Validate the response
        params = {
            'openid.assoc_handle': request.args.get('openid.assoc_handle'),
            'openid.signed': request.args.get('openid.signed'),
            'openid.sig': request.args.get('openid.sig'),
            'openid.ns': request.args.get('openid.ns'),
            'openid.mode': 'check_authentication',
        }
        
        # Add signed fields
        signed_fields = request.args.get('openid.signed', '').split(',')
        for field in signed_fields:
            key = f'openid.{field}'
            if key in request.args:
                params[key] = request.args.get(key)
        
        # Verify with Steam
        response = requests.post(STEAM_OPENID_URL, data=params)
        
        if 'is_valid:true' in response.text:
            # Extract Steam ID from claimed_id
            claimed_id = request.args.get('openid.claimed_id', '')
            match = re.search(r'steamcommunity.com/openid/id/(\d+)', claimed_id)
            
            if match:
                steam_id = match.group(1)
                
                try:
                    # Get Steam profile data
                    profile = steam_service.get_user_profile(steam_id)
                    
                    # Create a payload for the frontend
                    payload = {
                        'steamid': steam_id,
                        'profile': profile
                    }
                    
                    # Encode payload for URL safety
                    import base64
                    import json
                    payload_str = json.dumps(payload)
                    encoded_payload = base64.b64encode(payload_str.encode()).decode()
                    # Make URL safe
                    encoded_payload = encoded_payload.replace('+', '-').replace('/', '_').rstrip('=')
                    
                    return redirect(f"{frontend_return}?d={encoded_payload}")
                        
                except Exception as e:
                    current_app.logger.error(f"Steam connection error: {str(e)}")
                    return redirect(f"{frontend_return}?steam_error=server_error")
            else:
                return redirect(f"{frontend_return}?steam_error=invalid_id")
        else:
            return redirect(f"{frontend_return}?steam_error=auth_failed")
            
    except Exception as e:
        current_app.logger.error(f"Steam callback error: {str(e)}")
        return redirect(f"{frontend_return}?steam_error=server_error")

@steam_auth.route('/steam/disconnect', methods=['POST'])
@jwt_required()
def disconnect_steam():
    """Disconnect Steam account"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            raise APIException("User not found", status_code=404)
        
        if not user.is_steam_connected:
            raise APIException("Steam account not connected", status_code=400)
        
        # Clear Steam data
        user.steam_id = None
        user.steam_username = None
        user.steam_avatar_url = None
        user.steam_profile_url = None
        user.is_steam_connected = False
        user.steam_library_synced_at = None
        
        # Clear user's games
        user.owned_games = []
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Steam account disconnected successfully"
        }), 200
        
    except APIException as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Steam disconnect error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
