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
        frontend_url = backend_url.replace('-3001.', '-3000.') + '/dashboard'
    
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
    frontend_return = request.args.get('return_to', 'http://localhost:3000/dashboard')
    
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
                    # Connect Steam account using existing service
                    # Note: steam_service needs STEAM_API_KEY in environment
                    success = steam_service.connect_user_steam(int(user_id), steam_id)
                    
                    if success:
                        # Auto-sync library after connection
                        try:
                            new_games, updated_games = steam_service.sync_user_library(int(user_id))
                            current_app.logger.info(f"Synced {new_games} new games and updated {updated_games} for user {user_id}")
                        except Exception as sync_error:
                            current_app.logger.error(f"Library sync error: {str(sync_error)}")
                            # Don't fail the whole connection if sync fails
                        
                        return redirect(f"{frontend_return}?steam_connected=true")
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
import os, re, json, base64, requests
from urllib.parse import urlencode
from flask import Blueprint, current_app, jsonify, redirect, request, url_for
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import User, db

# ---------------------------------------------------------------------- config
# Use VITE_BACKEND_URL for frontend URL (since that's what your frontend uses)
FRONTEND_URL = os.getenv("FRONTEND_URL")
STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"
STEAM_API_KEY = os.getenv("STEAM_API_KEY")

if not STEAM_API_KEY:
    raise RuntimeError("STEAM_API_KEY env var not set")

steam_bp = Blueprint("steam", __name__)

# ------------------------------------------------------------- helper builders
def _build_steam_login_url() -> str:
    # Use the current request's host for the return URL
    if request.headers.get('Host'):
        base = f"http://{request.headers.get('Host')}"
    else:
        # Fallback to environment variable
        base = os.getenv("VITE_BACKEND_URL", "http://localhost:3001")
    
    return_to = f"{base}/api/steam/authorize"

    params = {
        "openid.ns":        "http://specs.openid.net/auth/2.0",
        "openid.mode":      "checkid_setup",
        "openid.return_to": return_to,
        "openid.realm":     return_to,
        "openid.identity":  "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id":"http://specs.openid.net/auth/2.0/identifier_select",
    }
    return f"{STEAM_OPENID_URL}?{urlencode(params)}"


def _verify_steam_login(openid_response: dict) -> bool:
    data = dict(openid_response)
    data["openid.mode"] = "check_authentication"
    resp = requests.post(STEAM_OPENID_URL, data=data, timeout=5)
    return resp.ok and "is_valid:true" in resp.text

def _extract_steamid(claimed_id: str) -> str:
    match = re.search(r"\d{17}", claimed_id)
    if not match:
        raise ValueError("Could not parse SteamID from claimed_id")
    return match.group(0)

def _get_player_summary(steamid: str) -> dict:
    url = f"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key={STEAM_API_KEY}&steamids={steamid}"
    data = requests.get(url, timeout=5).json()
    return (data.get("response", {}).get("players") or [{}])[0]

def _get_owned_games(steamid: str) -> dict:
    url = (
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
        f"?key={STEAM_API_KEY}&steamid={steamid}&include_appinfo=true&include_played_free_games=true"
    )
    return requests.get(url, timeout=10).json().get("response", {})

# --------------------------------------------------------------------- routes
@steam_bp.route("/steam/test", methods=["GET"])
def steam_test():
    """Test endpoint to verify Steam auth is working"""
    return jsonify({
        "message": "Steam auth test endpoint working",
        "steam_api_key": "configured" if STEAM_API_KEY else "missing",
        "frontend_url": FRONTEND_URL
    }), 200

@steam_bp.route("/steam/login", methods=["GET"])
def steam_login():
    return redirect(_build_steam_login_url())

@steam_bp.route("/steam/authorize", methods=["GET"])
def authorize():
    if not _verify_steam_login(request.args):
        return jsonify({"msg": "Steam login verification failed"}), 400

    steamid = _extract_steamid(request.args.get("openid.claimed_id", ""))
    try:
        summary = _get_player_summary(steamid)
        games   = _get_owned_games(steamid)

        payload = {
            "steamid": steamid,
            "profile": summary,
            "games": games
        }

        json_payload = json.dumps(payload)
        b64_payload = base64.urlsafe_b64encode(json_payload.encode()).decode()

        # Use the correct frontend URL for redirect
        return redirect(f"{FRONTEND_URL}/steam/callback?d={b64_payload}")
    
    except Exception as err:
        current_app.logger.exception(err)
        return jsonify({"msg": "Failed to fetch Steam data"}), 500

@steam_bp.route("/steam/disconnect", methods=["POST"])
@jwt_required()
def disconnect_steam():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Clear all Steam-related fields
    user.steam_id = None
    user.steam_profile = None
    user.steam_avatar_url = None 
    user.steam_username = None 
    user.is_steam_connected = False 

    db.session.commit()

    return jsonify({"msg": "Steam account disconnected"}), 200
