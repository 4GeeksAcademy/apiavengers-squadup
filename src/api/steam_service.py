"""
Steam Web API Integration Service
Handles all Steam API interactions and data processing
"""
import requests
import json
import os
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from api.models import db, User, SteamGame, user_games
from api.utils import APIException

class SteamService:
    def __init__(self):
        self.api_key = os.getenv('STEAM_API_KEY')
        self.base_url = 'https://api.steampowered.com'
        
        # Don't raise error if Steam API key is missing - just log it
        if not self.api_key:
            print("⚠️  STEAM_API_KEY not found in environment variables")
            print("   Steam integration will be disabled until API key is provided")
            print("   Get your Steam API key from: https://steamcommunity.com/dev/apikey")
    
    def _check_api_key(self):
        """Check if Steam API key is available"""
        if not self.api_key:
            raise APIException(
                "Steam integration is not configured. Please contact administrator.", 
                status_code=503
            )
    
    def get_user_profile(self, steam_id: str) -> Dict:
        """Get Steam user profile information"""
        self._check_api_key()
        
        url = f"{self.base_url}/ISteamUser/GetPlayerSummaries/v0002/"
        params = {
            'key': self.api_key,
            'steamids': steam_id
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if 'response' in data and 'players' in data['response'] and data['response']['players']:
                return data['response']['players'][0]
            else:
                raise APIException("Steam profile not found", status_code=404)
                
        except requests.exceptions.RequestException as e:
            raise APIException(f"Steam API error: {str(e)}", status_code=500)
    
    def get_user_games(self, steam_id: str) -> List[Dict]:
        """Get user's owned games from Steam"""
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
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if 'response' in data and 'games' in data['response']:
                return data['response']['games']
            else:
                return []
                
        except requests.exceptions.RequestException as e:
            raise APIException(f"Steam API error: {str(e)}", status_code=500)
    
    def get_game_details(self, app_id: int) -> Dict:
        """Get detailed game information from Steam Store API"""
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
        """Connect a user's account to their Steam profile"""
        try:
            # Get Steam profile info
            profile = self.get_user_profile(steam_id)
            
            # Update user record
            user = User.query.get(user_id)
            if not user:
                raise APIException("User not found", status_code=404)
            
            user.steam_id = steam_id
            user.steam_username = profile.get('personaname')
            user.steam_avatar_url = profile.get('avatarfull')
            user.steam_profile_url = profile.get('profileurl')
            user.is_steam_connected = True
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            raise APIException(f"Failed to connect Steam account: {str(e)}", status_code=500)
    
    def sync_user_library(self, user_id: int) -> Tuple[int, int]:
        """Sync user's Steam library to database"""
        user = User.query.get(user_id)
        if not user or not user.steam_id:
            raise APIException("User not found or Steam not connected", status_code=404)
        
        try:
            # Get user's games from Steam
            steam_games = self.get_user_games(user.steam_id)
            
            new_games = 0
            updated_games = 0
            
            for game_data in steam_games:
                app_id = game_data['appid']
                
                # Check if game exists in database
                game = SteamGame.query.filter_by(steam_appid=app_id).first()
                
                if not game:
                    # Create new game record
                    game = SteamGame(
                        steam_appid=app_id,
                        name=game_data.get('name', f'Game {app_id}'),
                        header_image=f"https://steamcdn-a.akamaihd.net/steam/apps/{app_id}/header.jpg"
                    )
                    db.session.add(game)
                    new_games += 1
                    
                    # Get detailed game info in background (optional)
                    self._enrich_game_data(game, app_id)
                
                # Associate game with user if not already associated
                if game not in user.owned_games:
                    user.owned_games.append(game)
                    updated_games += 1
            
            # Update sync timestamp
            user.steam_library_synced_at = datetime.utcnow()
            db.session.commit()
            
            return new_games, updated_games
            
        except Exception as e:
            db.session.rollback()
            raise APIException(f"Failed to sync library: {str(e)}", status_code=500)
    
    def _enrich_game_data(self, game: SteamGame, app_id: int):
        """Enrich game data with detailed information from Steam Store API"""
        try:
            details = self.get_game_details(app_id)
            
            if details:
                game.short_description = details.get('short_description', '')[:500]
                game.website = details.get('website')
                
                # Process genres
                if 'genres' in details:
                    genres = [genre['description'] for genre in details['genres']]
                    game.genres = json.dumps(genres)
                
                # Process categories
                if 'categories' in details:
                    categories = [cat['description'] for cat in details['categories']]
                    game.categories = json.dumps(categories)
                    
                    # Check for multiplayer support
                    game.multiplayer = any('Multi-player' in cat for cat in categories)
                    game.co_op = any('Co-op' in cat for cat in categories)
                
                # Process release date
                if 'release_date' in details and details['release_date'].get('date'):
                    try:
                        release_str = details['release_date']['date']
                        game.release_date = datetime.strptime(release_str, '%b %d, %Y')
                    except:
                        pass
                
                # Process pricing
                if 'price_overview' in details:
                    game.price = details['price_overview'].get('final_formatted')
                
        except Exception as e:
            print(f"Error enriching game {app_id}: {e}")
    
    def find_common_games(self, user_ids: List[int]) -> List[Dict]:
        """Find games that are common among specified users"""
        if len(user_ids) < 2:
            raise APIException("At least 2 users required", status_code=400)
        
        # Get all users and their games
        users = User.query.filter(User.id.in_(user_ids)).all()
        
        if len(users) != len(user_ids):
            raise APIException("One or more users not found", status_code=404)
        
        # Find intersection of all user libraries
        user_game_sets = []
        for user in users:
            user_games = set(game.id for game in user.owned_games)
            user_game_sets.append(user_games)
        
        # Calculate intersection and coverage
        common_game_ids = set.intersection(*user_game_sets) if user_game_sets else set()
        
        # Get coverage stats for all games
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
        
        # Get game details with coverage info
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
        
        # Sort by coverage percentage (highest first)
        result.sort(key=lambda x: x['ownership_stats']['coverage_percentage'], reverse=True)
        
        return result
    
    def _get_coverage_level(self, percentage: float) -> str:
        """Determine coverage level for UI highlighting"""
        if percentage == 100:
            return 'all'  # Green highlight
        elif percentage >= 75:
            return 'most'  # Yellow highlight
        elif percentage >= 50:
            return 'some'  # Orange highlight
        else:
            return 'few'   # Red highlight
    
    def filter_games(self, games: List[Dict], filters: Dict) -> List[Dict]:
        """Apply filters to game list"""
        filtered = games
        
        # Filter by coverage level
        if 'coverage' in filters:
            coverage_filter = filters['coverage']
            if coverage_filter == 'all':
                filtered = [g for g in filtered if g['coverage_level'] == 'all']
            elif coverage_filter == 'most':
                filtered = [g for g in filtered if g['coverage_level'] in ['all', 'most']]
            elif coverage_filter == 'few':
                filtered = [g for g in filtered if g['coverage_level'] == 'few']
        
        # Filter by multiplayer support
        if filters.get('multiplayer_only'):
            filtered = [g for g in filtered if g.get('multiplayer') or g.get('co_op')]
        
        # Filter by genres
        if 'genres' in filters and filters['genres']:
            target_genres = set(filters['genres'])
            filtered = [
                g for g in filtered 
                if target_genres.intersection(set(g.get('genres', [])))
            ]
        
        # Filter by player count
        if 'min_players' in filters:
            min_players = int(filters['min_players'])
            filtered = [
                g for g in filtered 
                if g.get('max_players', 1) >= min_players
            ]
        
        return filtered

# Initialize service
try:
    steam_service = SteamService()
except Exception as e:
    print(f"Warning: Steam service initialization failed: {e}")
    steam_service = None