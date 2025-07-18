// src/front/pages/GameLibrary.jsx - UPDATED with Unified Steam Integration

import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import steamService from '../services/steamService.js';
import SteamConnectionManager from '../components/SteamConnectionManager';
import { 
    formatPlaytime, 
    formatLastPlayed, 
    createGameImageFallback, 
    calculateLibraryStats,
    filterGames,
    sortGames,
    extractGenres 
} from '../utils/steamUtils.js';

// Enhanced GameImage component with robust error handling
const GameImage = ({ src, alt, className = "", fallbackText = "Game", appId }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    const handleImageError = () => {
        console.log(`🖼️ Image failed to load: ${src}`);
        setImageError(true);
        setImageLoading(false);
    };

    const handleImageLoad = () => {
        setImageLoading(false);
        setImageError(false);
    };

    if (imageError) {
        return (
            <img
                src={createGameImageFallback(fallbackText, appId)}
                alt={alt}
                className={className}
                style={{ objectFit: 'cover' }}
            />
        );
    }

    return (
        <>
            {imageLoading && (
                <div className={`${className} bg-slate-700 flex items-center justify-center animate-pulse`}>
                    <span className="text-slate-400 text-xl">⏳</span>
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`${className} ${imageLoading ? 'hidden' : 'block'}`}
                onError={handleImageError}
                onLoad={handleImageLoad}
                style={{ objectFit: 'cover' }}
            />
        </>
    );
};

export const GameLibrary = () => {
    const { store, dispatch } = useGlobalReducer();
    const user = store.user;
    const navigate = useNavigate();
    
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [filterGenre, setFilterGenre] = useState('');
    const [filterMultiplayer, setFilterMultiplayer] = useState(false);
    const [stats, setStats] = useState(null);

    const isConnected = user?.steam_connected || user?.is_steam_connected;

    useEffect(() => {
        if (isConnected) {
            fetchGames();
        }
    }, [isConnected]);

    // Update stats when games change
    useEffect(() => {
        if (games.length > 0) {
            setStats(calculateLibraryStats(games));
        }
    }, [games]);

    /**
     * Fetch games using unified Steam service
     */
    const fetchGames = async () => {
        setLoading(true);
        setError('');
        
        try {
            console.log('📚 Fetching games with unified Steam service...');
            const result = await steamService.getOwnedGames();
            
            console.log('✅ Games fetched successfully:', result);
            setGames(result.games || []);
        } catch (err) {
            console.error('❌ Error fetching games:', err);
            const errorMessage = steamService.getErrorMessage(err);
            setError(errorMessage);
            toast.error(`Failed to load library: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle user updates from Steam operations
     */
    const handleUserUpdate = (updatedUser) => {
        if (updatedUser) {
            dispatch({ type: 'set_user', payload: updatedUser });
            // Refresh games after user update
            if (updatedUser.steam_connected || updatedUser.is_steam_connected) {
                fetchGames();
            } else {
                // User disconnected, clear games
                setGames([]);
                setStats(null);
            }
        } else {
            // Refresh user profile
            refreshUserProfile();
        }
    };

    /**
     * Refresh user profile
     */
    const refreshUserProfile = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/profile`);
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: 'set_user', payload: data.user });
            }
        } catch (error) {
            console.error('Error refreshing profile:', error);
        }
    };

    // Filter and sort games
    const processedGames = React.useMemo(() => {
        let filtered = filterGames(games, {
            search: searchTerm,
            genre: filterGenre,
            multiplayerOnly: filterMultiplayer
        });

        return sortGames(filtered, sortBy);
    }, [games, searchTerm, sortBy, filterGenre, filterMultiplayer]);

    // Get available genres for filter
    const availableGenres = React.useMemo(() => {
        return extractGenres(games);
    }, [games]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
                <div className="max-w-6xl mx-auto flex items-center justify-center">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white text-lg">Loading your game library...</p>
                        <p className="text-white/60 text-sm mt-2">This may take a moment for large libraries</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Game Library</h1>
                        <p className="text-white/70">
                            {isConnected ? `${games.length} games in your Steam library` : 'Connect your Steam account to view your games'}
                        </p>
                    </div>
                    <button 
                        onClick={() => navigate('/profile')}
                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                    >
                        ← Back to Profile
                    </button>
                </div>

                {isConnected ? (
                    <>
                        {/* Steam Connection Status & Controls */}
                        <SteamConnectionManager 
                            user={user}
                            onUserUpdate={handleUserUpdate}
                            showLibraryButton={false} // We're already in the library
                            showSyncButton={true}
                            className="mb-8"
                        />

                        {/* Search and Filters */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">Search Games</label>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search your library..."
                                        className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 transition-colors"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">Sort By</label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-coral-500 transition-colors"
                                    >
                                        <option value="name">Name (A-Z)</option>
                                        <option value="playtime">Most Played</option>
                                        <option value="recent">Recently Played</option>
                                        <option value="release_date">Release Date</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">Filter by Genre</label>
                                    <select
                                        value={filterGenre}
                                        onChange={(e) => setFilterGenre(e.target.value)}
                                        className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-coral-500 transition-colors"
                                    >
                                        <option value="">All Genres</option>
                                        {availableGenres.map(genre => (
                                            <option key={genre} value={genre}>{genre}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">Options</label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filterMultiplayer}
                                            onChange={(e) => setFilterMultiplayer(e.target.checked)}
                                            className="rounded border-white/20 bg-white/5 text-coral-500 focus:ring-coral-500"
                                        />
                                        <span className="text-white text-sm">Multiplayer Only</span>
                                    </label>
                                </div>
                            </div>

                            {/* Results Summary */}
                            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                <p className="text-white/70 text-sm">
                                    Showing {processedGames.length} of {games.length} games
                                    {searchTerm && ` matching "${searchTerm}"`}
                                    {filterGenre && ` in ${filterGenre}`}
                                    {filterMultiplayer && ` (multiplayer only)`}
                                </p>
                                {(searchTerm || filterGenre || filterMultiplayer) && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterGenre('');
                                            setFilterMultiplayer(false);
                                        }}
                                        className="text-coral-400 hover:text-coral-300 text-sm underline"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300">
                                <div className="flex items-center space-x-2">
                                    <span>⚠️</span>
                                    <span>{error}</span>
                                </div>
                                <button 
                                    onClick={fetchGames}
                                    className="mt-2 text-sm underline hover:no-underline"
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {/* Games Grid */}
                        {processedGames.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {processedGames.map((game) => (
                                    <div key={game.id || game.steam_appid} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden shadow-2xl hover:bg-white/15 transition-all duration-300 group">
                                        <div className="relative">
                                            <GameImage
                                                src={game.header_image || `https://steamcdn-a.akamaihd.net/steam/apps/${game.steam_appid}/header.jpg`}
                                                alt={`${game.name} cover`}
                                                fallbackText={game.name}
                                                appId={game.steam_appid}
                                                className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            {(game.multiplayer || game.co_op) && (
                                                <div className="absolute top-2 right-2 bg-green-500/80 text-white px-2 py-1 rounded-lg text-xs font-medium">
                                                    {game.co_op ? 'Co-op' : 'Multiplayer'}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="p-4">
                                            <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 group-hover:text-coral-300 transition-colors leading-tight">
                                                {game.name}
                                            </h3>
                                            
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-white/60">Playtime:</span>
                                                    <span className="text-white font-medium">
                                                        {formatPlaytime(game.playtime_forever || game.hours_played)}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex justify-between items-center">
                                                    <span className="text-white/60">Last played:</span>
                                                    <span className="text-white font-medium">
                                                        {formatLastPlayed(game.last_played)}
                                                    </span>
                                                </div>
                                                
                                                {game.genres && game.genres.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-3">
                                                        {game.genres.slice(0, 2).map(genre => (
                                                            <span key={genre} className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80">
                                                                {genre}
                                                            </span>
                                                        ))}
                                                        {game.genres.length > 2 && (
                                                            <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/60">
                                                                +{game.genres.length - 2}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 text-center">
                                <div className="text-6xl mb-4">
                                    {searchTerm || filterGenre || filterMultiplayer ? '🔍' : '🎮'}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">
                                    {searchTerm || filterGenre || filterMultiplayer ? 'No games found' : 'No games in library'}
                                </h3>
                                <p className="text-white/70 mb-6">
                                    {searchTerm || filterGenre || filterMultiplayer 
                                        ? 'Try adjusting your search or filter settings'
                                        : 'Your Steam library appears to be empty or sync is needed'
                                    }
                                </p>
                                {!searchTerm && !filterGenre && !filterMultiplayer && (
                                    <SteamConnectionManager 
                                        user={user}
                                        onUserUpdate={handleUserUpdate}
                                        showLibraryButton={false}
                                        showSyncButton={true}
                                        compact={false}
                                        className="max-w-md mx-auto"
                                    />
                                )}
                            </div>
                        )}

                        {/* Library Statistics */}
                        {stats && games.length > 0 && (
                            <div className="mt-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                                <h3 className="text-xl font-bold text-white mb-4">Library Statistics</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-coral-400">{stats.totalGames}</div>
                                        <div className="text-white/70 text-sm">Total Games</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-marine-400">{stats.multiplayerCount}</div>
                                        <div className="text-white/70 text-sm">Multiplayer</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-green-400">{stats.totalPlaytime}h</div>
                                        <div className="text-white/70 text-sm">Total Playtime</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-purple-400">{stats.unplayedCount}</div>
                                        <div className="text-white/70 text-sm">Unplayed</div>
                                    </div>
                                </div>
                                
                                {stats.mostPlayedGame && (
                                    <div className="mt-6 pt-6 border-t border-white/10">
                                        <p className="text-white/70 text-sm mb-2">Most Played Game:</p>
                                        <div className="flex items-center space-x-3">
                                            <GameImage
                                                src={`https://steamcdn-a.akamaihd.net/steam/apps/${stats.mostPlayedGame.steam_appid}/capsule_184x69.jpg`}
                                                alt={stats.mostPlayedGame.name}
                                                fallbackText={stats.mostPlayedGame.name}
                                                appId={stats.mostPlayedGame.steam_appid}
                                                className="w-16 h-8 rounded object-cover"
                                            />
                                            <div>
                                                <p className="text-white font-medium">{stats.mostPlayedGame.name}</p>
                                                <p className="text-white/60 text-sm">
                                                    {formatPlaytime(stats.mostPlayedGame.playtime_forever || stats.mostPlayedGame.hours_played)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    /* Not Connected State */
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 text-center">
                        <div className="text-8xl mb-6">🎮</div>
                        <h2 className="text-3xl font-bold text-white mb-4">Connect Your Steam Account</h2>
                        <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
                            Link your Steam account to automatically sync your game library and find friends to play with.
                        </p>
                        
                        <SteamConnectionManager 
                            user={user}
                            onUserUpdate={handleUserUpdate}
                            showLibraryButton={false}
                            showSyncButton={false}
                            compact={false}
                            className="max-w-lg mx-auto"
                        />

                        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm max-w-lg mx-auto">
                            <div className="flex items-start space-x-2">
                                <span className="text-blue-400 mt-0.5">ℹ️</span>
                                <div>
                                    <strong>Steam Integration Benefits:</strong>
                                    <ul className="text-left mt-2 space-y-1">
                                        <li>• Automatic game library sync</li>
                                        <li>• Find common games with friends</li>
                                        <li>• Multiplayer game matching</li>
                                        <li>• Group gaming sessions</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};