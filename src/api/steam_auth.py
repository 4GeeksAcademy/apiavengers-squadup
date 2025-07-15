"""
Steam OpenID authentication for MVP - FIXED VERSION
"""
from flask import Blueprint, request, redirect, url_for, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from urllib.parse import urlencode
import requests
import re
import os
import base64
from api.models import db, User
from api.steam_service import steam_service
from api.utils import APIException

steam_auth = Blueprint('steam_auth', __name__)

STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

@steam_auth.route('/login', methods=['GET'])
@jwt_required()
def steam_login():
    """Initiate Steam authentication and return auth URL"""
    return_to = request.args.get('return_to', '/dashboard')
    frontend_base = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    frontend_url = f"{frontend_base}{return_to}"
    
    current_user_id = get_jwt_identity()
    
    # Encode state with user_id and return_to
    state_data = f"{current_user_id}:{frontend_url}"
    state = base64.urlsafe_b64encode(state_data.encode()).decode()
    
    app_base = os.getenv('APP_BASE_URL', request.url_root.rstrip('/'))
    
    params = {
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': f"{app_base}/api/auth/steam/callback?state={state}",
        'openid.realm': app_base,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    }
    
    auth_url = f"{STEAM_OPENID_URL}?{urlencode(params)}"
    return jsonify({"steam_auth_url": auth_url})

@steam_auth.route('/callback', methods=['GET'])
def steam_callback():
    """Handle Steam OpenID callback - no JWT required here"""
    state = request.args.get('state')
    
    if not state:
        frontend_base = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_base}/dashboard?steam_error=no_state")
    
    try:
        # Decode state (add padding if needed)
        decoded_state = base64.urlsafe_b64decode(state + '===').decode('utf-8')
        user_id, frontend_return = decoded_state.split(':', 1)
        user_id = int(user_id)
    except Exception as e:
        current_app.logger.error(f"Invalid state: {str(e)}")
        frontend_base = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_base}/dashboard?steam_error=invalid_state")
    
    try:
        # Validate the response
        params = {
            'openid.assoc_handle': request.args.get('openid.assoc_handle'),
            'openid.signed': request.args.get('openid.signed'),
            'openid.sig': request.args.get('openid.sig'),
            'openid.ns': request.args.get('openid.ns'),
            'openid.mode': 'check_authentication',
        }
        
        signed_fields = request.args.get('openid.signed', '').split(',')
        for field in signed_fields:
            key = f'openid.{field}'
            if key in request.args:
                params[key] = request.args.get(key)
        
        # Verify with Steam
        response = requests.post(STEAM_OPENID_URL, data=params, timeout=30)
        
        if 'is_valid:true' in response.text:
            # Extract Steam ID from claimed_id
            claimed_id = request.args.get('openid.claimed_id', '')
            match = re.search(r'steamcommunity.com/openid/id/(\d+)', claimed_id)
            
            if match:
                steam_id = match.group(1)
                
                try:
                    # Connect Steam account using existing service
                    success = steam_service.connect_user_steam(user_id, steam_id)
                    
                    if success:
                        # CRITICAL FIX: Auto-sync library after connection
                        try:
                            new_games, updated_games = steam_service.sync_user_library(user_id)
                            current_app.logger.info(f"Steam connected for user {user_id}: {new_games} new games, {updated_games} updated")
                            
                            # Success redirect with sync info
                            return redirect(f"{frontend_return}?steam_connected=true&new_games={new_games}&updated_games={updated_games}")
                        except Exception as sync_error:
                            current_app.logger.error(f"Library sync error after connection: {str(sync_error)}")
                            # Still redirect as success since connection worked, just mention sync issue
                            return redirect(f"{frontend_return}?steam_connected=true&sync_warning=true")
                        
                    else:
                        return redirect(f"{frontend_return}?steam_error=connection_failed")
                        
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

@steam_auth.route('/disconnect', methods=['POST'])
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

@steam_auth.route('/connect', methods=['POST'])
@jwt_required()
def connect_steam_manual():
    """Manual Steam ID connection endpoint with automatic library sync"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        steam_id = data.get('steam_id')
        
        if not steam_id:
            raise APIException("Steam ID required", status_code=400)
        
        # Validate Steam ID format (17 digits)
        if not re.match(r'^\d{17}$', steam_id):
            raise APIException("Invalid Steam ID format. Must be 17 digits.", status_code=400)
        
        # Connect using steam_service
        success = steam_service.connect_user_steam(current_user_id, steam_id)
        
        if success:
            # CRITICAL FIX: Auto-sync library after manual connection
            try:
                new_games, updated_games = steam_service.sync_user_library(current_user_id)
                current_app.logger.info(f"Manual Steam connect for user {current_user_id}: {new_games} new/{updated_games} updated games")
                
                # Get updated user data
                user = User.query.get(current_user_id)
                
                return jsonify({
                    "success": True,
                    "message": "Steam account connected and library synced",
                    "user": user.serialize(),
                    "new_games": new_games,
                    "updated_games": updated_games
                }), 200
            except Exception as sync_error:
                current_app.logger.error(f"Library sync failed after manual connect: {str(sync_error)}")
                
                # Get user data even if sync failed
                user = User.query.get(current_user_id)
                
                return jsonify({
                    "success": True,
                    "message": "Steam account connected, but library sync failed. Try syncing manually.",
                    "user": user.serialize(),
                    "new_games": 0,
                    "updated_games": 0,
                    "sync_error": str(sync_error)
                }), 200
        else:
            raise APIException("Failed to connect Steam account", status_code=500)
            
    except APIException as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Manual Steam connect error: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error"}), 500