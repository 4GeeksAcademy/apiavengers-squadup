import os, re, json, base64, requests
from urllib.parse import urlencode
from flask import Blueprint, current_app, jsonify, redirect, request, url_for

# ---------------------------------------------------------------------- config
FRONTEND_URL   = os.getenv("FRONTEND_URL", "https://animated-eureka-5grpx4q7wvpgf66g-5173.app.github.dev")
STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"
STEAM_API_KEY    = os.getenv("STEAM_API_KEY")

if not STEAM_API_KEY:
    raise RuntimeError("STEAM_API_KEY env var not set")

steam_bp = Blueprint("steam", __name__)

# ------------------------------------------------------------- helper builders
def _build_steam_login_url() -> str:
    # 1️⃣ Use the exact Codespaces host
    host = "animated-eureka-5grpx4q7wvpgf66g-3001.app.github.dev"
    base = f"https://{host}"
    return_to = f"{base}/api/steam/authorize"

    params = {
        "openid.ns":        "http://specs.openid.net/auth/2.0",
        "openid.mode":      "checkid_setup",
        "openid.return_to": return_to,
        "openid.realm":     base,
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
    except Exception as err:
        current_app.logger.exception(err)
        return jsonify({"msg": "Failed to fetch Steam data"}), 500

    payload = {"steamid": steamid, "profile": summary, "games": games}
    b64     = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    return redirect(f"{FRONTEND_URL}/steam/callback?d={b64}")
