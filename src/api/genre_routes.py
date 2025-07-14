# backend/genre_routes.py
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, SteamLink, Game

genre_bp = Blueprint("genre", __name__)

@genre_bp.post("/api/genres")
@jwt_required()
def save_genres():
    user = User.query.get(get_jwt_identity())
    user.genres = ",".join(request.json.get("genres", []))
    db.session.commit()
    return "", 204

@genre_bp.get("/api/match")
@jwt_required()
def match_game():
    user = User.query.get(get_jwt_identity())
    my_genres = set(user.genres.split(",")) if user.genres else set()

    # naive match: first other user sharing any genre & any common game
    for friend in User.query.filter(User.id != user.id):
        if not friend.genres:
            continue
        if my_genres & set(friend.genres.split(",")):
            my_games   = {g.appid for g in user.steam.games}
            their_games= {g.appid for g in friend.steam.games}
            common     = my_games & their_games
            if common:
                game = next(g.name for g in user.steam.games if g.appid in common)
                return {"friend": friend.email, "game": game}
    return {"friend": None, "game": None}
