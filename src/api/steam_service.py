# src/api/steam_service.py - FIXED VERSION

import requests
import json
import os
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from api.models import db, User, SteamGame, user_games
from api.utils import APIException
from dotenv import load_dotenv
from sqlalchemy import text

class SteamService:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv('STEAM_API_KEY')
        self.base_url = 'https://api.steampowered.com'
        
        if not self.api_key:
            print("⚠️  STEAM_API_KEY not found in environment variables")
            print("   Steam integration will be disabled until API key is provided")
            print("   Get your Steam API key from: https://steamcommunity.com/dev/apikey")
        else:
            print(f"✅ Steam API key loaded successfully (ends with ...{self.api_key[-4:]})")
    
    def _check_api_key(self):
        if not self.api_key:
            raise APIException(
                "Steam integration is not configured. Please contact administrator.", 
                status_code=503
            )
    
    def get_user_profile(self, steam_id: str) -> Dict:
        self._check_api_key()
        
        url = f"{self.base_url}/ISteamUser/GetPlayerSummaries/v0002/"
        params = {
            'key': self.api_key,
            'steamids': steam_id
        }
        
        try:
            print(f"🔍 Getting Steam profile for ID: {steam_id}")
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if 'response' in data and 'players' in data['response'] and data['response']['players']:
                profile = data['response']['players'][0]
                print(f"✅ Steam profile found: {profile.get('personaname', 'Unknown')}")
                return profile
            else:
                raise APIException("Steam profile not found", status_code=404)
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Steam API error for profile: {str(e)}")
            raise APIException(f"Steam API error: {str(e)}", status_code=500)
    
    def get_user_games(self, steam_id: str) -> List[Dict]:
        self._check_api_key()
        
        url = f"{self.base_url}/IPlayerService/GetOwnedGames/v0001/"
        params = {
            'key': self.api_key,
            'steamid': steam_id,
            'format': 'json',
            'include_appinfo': True,
            'include_played_free_games': True
        }
        
        try:
            print(f"🎮 Getting Steam games for ID: {steam_id}")
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if 'response' in data and 'games' in data['response']:
                games = data['response']['games']
                print(f"✅ Found {len(games)} games in Steam library")
                return games
            else:
                print("⚠️ No games found in Steam response")
                return []
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Steam API error for games: {str(e)}")
            raise APIException(f"Steam API error: {str(e)}", status_code=500)
    
    def get_game_details(self, app_id: int) -> Dict:
        url = f"https://store.steampowered.com/api/appdetails"
        params = {
            'appids': app_id,
            'format': 'json'
        }
        
        try:
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            if str(app_id) in data and data[str(app_id)]['success']:
                return data[str(app_id)]['data']
            else:
                return {}
                
        except requests.exceptions.RequestException as e:
            print(f"Error fetching game details for {app_id}: {e}")
            return {}
    
    def connect_user_steam(self, user_id: int, steam_id: str) -> bool:
        try:
            print(f"🔗 Connecting Steam ID {steam_id} to user {user_id}")
            profile = self.get_user_profile(steam_id)
            
            user = User.query.get(user_id)
            if not user:
                raise APIException("User not found", status_code=404)
            
            # Update user with Steam info
            user.steam_id = steam_id
            user.steam_username = profile.get('personaname')
            user.steam_avatar_url = profile.get('avatarfull')
            user.steam_profile_url = profile.get('profileurl')
            user.is_steam_connected = True
            
            db.session.commit()
            print(f"✅ Steam account connected for user {user_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Failed to connect Steam account: {str(e)}")
            raise APIException(f"Failed to connect Steam account: {str(e)}", status_code=500)
    
    def sync_user_library(self, user_id: int) -> Tuple[int, int]:
        """FIXED: Sync user's Steam library with proper error handling"""
        user = User.query.get(user_id)
        if not user or not user.steam_id:
            raise APIException("User not found or Steam not connected", status_code=404)
        
        try:
            print(f"🔄 Starting library sync for user {user_id} (Steam ID: {user.steam_id})")
            
            # Get games from Steam API
            steam_games = self.get_user_games(user.steam_id)
            
            if not steam_games:
                print("⚠️ No games returned from Steam API")
                user.steam_library_synced_at = datetime.utcnow()
                db.session.commit()
                return 0, 0
            
            new_games = 0
            updated_games = 0
            
            # Clear existing associations
            print("🧹 Clearing existing game associations...")
            db.session.execute(
                text("DELETE FROM user_games WHERE user_id = :user_id"),
                {'user_id': user_id}
            )
            
            for game_data in steam_games:
                app_id = game_data['appid']
                game_name = game_data.get('name', f'Game {app_id}')
                
                print(f"  Processing: {game_name} (ID: {app_id})")
                
                # Find or create game
                game = SteamGame.query.filter_by(steam_appid=app_id).first()
                
                if not game:
                    # Create new game
                    game = SteamGame(
                        steam_appid=app_id,
                        name=game_name,
                        header_image=f"https://steamcdn-a.akamaihd.net/steam/apps/{app_id}/header.jpg"
                    )
                    db.session.add(game)
                    db.session.flush()  # Get the ID
                    new_games += 1
                    print(f"    ✅ Created new game: {game_name}")
                    
                    # Try to enrich with more details (non-blocking)
                    try:
                        self._enrich_game_data(game, app_id)
                        print(f"    📝 Enriched game data for: {game_name}")
                    except Exception as enrich_error:
                        print(f"    ⚠️ Could not enrich {game_name}: {enrich_error}")
                else:
                    print(f"    ♻️ Using existing game: {game_name}")
                
                # Add to user's library using raw SQL for reliability
                playtime = game_data.get('playtime_forever', 0)
                last_played = None
                if game_data.get('rtime_last_played'):
                    last_played = datetime.fromtimestamp(game_data['rtime_last_played'])
                
                try:
                    db.session.execute(
                        text("""
                            INSERT INTO user_games (user_id, game_id, hours_played, last_played, added_at)
                            VALUES (:user_id, :game_id, :hours_played, :last_played, :added_at)
                        """),
                        {
                            'user_id': user_id,
                            'game_id': game.id,
                            'hours_played': playtime,
                            'last_played': last_played,
                            'added_at': datetime.utcnow()
                        }
                    )
                    print(f"    💾 Added to user library: {game_name}")
                    updated_games += 1
                except Exception as db_error:
                    print(f"    ❌ Failed to add to library {game_name}: {db_error}")
                    # Continue with other games even if one fails
            
            # Update sync timestamp
            user.steam_library_synced_at = datetime.utcnow()
            db.session.commit()
            
            print(f"✅ Library sync completed: {new_games} new games, {updated_games} total games")
            return new_games, updated_games
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Library sync failed: {str(e)}")
            raise APIException(f"Failed to sync library: {str(e)}", status_code=500)
    
    def _enrich_game_data(self, game: SteamGame, app_id: int):
        """Enrich game with additional details from Steam Store API"""
        try:
            details = self.get_game_details(app_id)
            
            if details:
                game.short_description = details.get('short_description', '')[:500]
                game.website = details.get('website')
                
                if 'genres' in details:
                    genres = [genre['description'] for genre in details['genres']]
                    game.genres = json.dumps(genres)
                
                if 'categories' in details:
                    categories = [cat['description'] for cat in details['categories']]
                    game.categories = json.dumps(categories)
                    
                    # Check for multiplayer categories
                    cat_descriptions = [cat.lower() for cat in categories]
                    game.multiplayer = any('multi-player' in cat or 'multiplayer' in cat for cat in cat_descriptions)
                    game.co_op = any('co-op' in cat or 'cooperative' in cat for cat in cat_descriptions)
                
                if 'release_date' in details and details['release_date'].get('date'):
                    try:
                        release_str = details['release_date']['date']
                        game.release_date = datetime.strptime(release_str, '%b %d, %Y')
                    except ValueError:
                        pass
                
                if 'price_overview' in details:
                    game.price = details['price_overview'].get('final_formatted')
                
        except Exception as e:
            print(f"Warning: Could not enrich game {app_id}: {e}")
    
    def find_common_games(self, user_ids: List[int]) -> List[Dict]:
        if len(user_ids) < 2:
            raise APIException("At least 2 users required", status_code=400)
        
        users = User.query.filter(User.id.in_(user_ids)).all()
        
        if len(users) != len(user_ids):
            raise APIException("One or more users not found", status_code=404)
        
        # Get game IDs for each user
        user_game_sets = []
        for user in users:
            if user.steam_id:
                # Get user's games via raw SQL for reliability
                result = db.session.execute(
                    text("SELECT game_id FROM user_games WHERE user_id = :user_id"),
                    {'user_id': user.id}
                )
                game_ids = {row[0] for row in result}
                user_game_sets.append(game_ids)
            else:
                user_game_sets.append(set())
        
        # Find intersections and coverage
        common_game_ids = set.intersection(*user_game_sets) if user_game_sets else set()
        all_game_ids = set.union(*user_game_sets) if user_game_sets else set()
        
        game_coverage = {}
        for game_id in all_game_ids:
            owners = sum(1 for user_set in user_game_sets if game_id in user_set)
            coverage_percentage = (owners / len(users)) * 100
            game_coverage[game_id] = {
                'owners': owners,
                'total_users': len(users),
                'coverage_percentage': coverage_percentage
            }
        
        # Get game details
        all_games = SteamGame.query.filter(SteamGame.id.in_(all_game_ids)).all()
        
        result = []
        for game in all_games:
            coverage = game_coverage[game.id]
            game_data = game.serialize()
            game_data.update({
                'ownership_stats': coverage,
                'is_common': game.id in common_game_ids,
                'coverage_level': self._get_coverage_level(coverage['coverage_percentage'])
            })
            result.append(game_data)
        
        result.sort(key=lambda x: x['ownership_stats']['coverage_percentage'], reverse=True)
        
        return result
    
    def _get_coverage_level(self, percentage: float) -> str:
        if percentage == 100:
            return 'all'
        elif percentage >= 75:
            return 'most'
        elif percentage >= 50:
            return 'some'
        else:
            return 'few'
    
    def filter_games(self, games: List[Dict], filters: Dict) -> List[Dict]:
        filtered = games
        
        if 'coverage' in filters:
            coverage_filter = filters['coverage']
            if coverage_filter == 'all':
                filtered = [g for g in filtered if g['coverage_level'] == 'all']
            elif coverage_filter == 'most':
                filtered = [g for g in filtered if g['coverage_level'] in ['all', 'most']]
            elif coverage_filter == 'few':
                filtered = [g for g in filtered if g['coverage_level'] == 'few']
        
        if filters.get('multiplayer_only'):
            filtered = [g for g in filtered if g.get('multiplayer') or g.get('co_op')]
        
        if 'genres' in filters and filters['genres']:
            target_genres = set(filters['genres'])
            filtered = [
                g for g in filtered 
                if target_genres.intersection(set(g.get('genres', [])))
            ]
        
        if 'min_players' in filters:
            min_players = int(filters['min_players'])
            filtered = [
                g for g in filtered 
                if g.get('max_players', 1) >= min_players
            ]
        
        return filtered

try:
    steam_service = SteamService()
except Exception as e:
    print(f"Warning: Steam service initialization failed: {e}")
    steam_service = None