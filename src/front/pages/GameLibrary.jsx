import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService.js';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const GameLibrary = () => {
    const { store, dispatch } = useGlobalReducer();
    const user = store.user;
    const navigate = useNavigate();
    
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, hours, recent
    const [filterGenre, setFilterGenre] = useState('');

    useEffect(() => {
        if (user?.steam_connected) {
            fetchGames();
        }
    }, [user]);

    const fetchGames = async () => {
        setLoading(true);
        setError('');
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/steam/owned-games`);
            
            if (!response.ok) {
                throw new Error('Failed to load library');
            }
            
            const data = await response.json();
            console.log('Fetched games:', data);
            setGames(data.games || []);
        } catch (err) {
            console.error('Error fetching games:', err);
            setError(err.message);
            toast.error('Failed to load game library');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setError('');
        
        const loadingToast = toast.loading('Syncing Steam library...');
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/steam/sync-games`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Sync failed');
            }
            
            const data = await response.json();
            toast.dismiss(loadingToast);
            toast.success(data.message || 'Library synced successfully');
            
            // Refresh games after sync
            await fetchGames();
            
            // Update user data to reflect sync
            if (user) {
                dispatch({ 
                    type: 'set_user', 
                    payload: { 
                        ...user, 
                        steam_library_synced_at: new Date().toISOString() 
                    } 
                });
            }
        } catch (err) {
            console.error('Error syncing:', err);
            toast.dismiss(loadingToast);
            setError(err.message);
            toast.error('Failed to sync library');
        } finally {
            setSyncing(false);
        }
    };

    const handleOpenIDConnect = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const returnTo = encodeURIComponent('/game-library');
            
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/steam/login?return_to=${returnTo}`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Failed to start Steam connect');
            }
            
            const data = await response.json();
            window.location.href = data.steam_auth_url;
        } catch (err) {
            console.error('Error starting Steam connect:', err);
            toast.error('Failed to start Steam connection');
        }
    };

    const handleManualConnect = async () => {
        const steamId = prompt('Enter your Steam ID (17-digit number):');
        if (!steamId || steamId.trim() === '') {
            return;
        }

        if (!/^\d{17}$/.test(steamId.trim())) {
            toast.error('Please enter a valid 17-digit Steam ID');
            return;
        }

        const loadingToast = toast.loading('Connecting Steam account...');
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/steam/connect`, {
                method: 'POST',
                body: JSON.stringify({ steam_id: steamId.trim() })
            });

            if (!response.ok) {
                throw new Error('Connection failed');
            }
            
            const data = await response.json();
            
            // Update user in store
            dispatch({ type: 'set_user', payload: data.user });
            
            toast.dismiss(loadingToast);
            toast.success(`Steam connected! Synced ${data.new_games} new games and updated ${data.updated_games} games.`);
            
            // Fetch games after connection
            await fetchGames();
        } catch (err) {
            toast.dismiss(loadingToast);
            console.error('Error connecting Steam manually:', err);
            toast.error('Failed to connect Steam account');
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Disconnect Steam? This will clear your game library.')) {
            return;
        }
        
        const loadingToast = toast.loading('Disconnecting Steam...');
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/steam/disconnect`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Disconnect failed');
            }
            
            // Refresh user data
            const profileResponse = await authService.authenticatedFetch(`${backendUrl}/api/auth/profile`);
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                dispatch({ type: 'set_user', payload: profileData.user });
            }
            
            setGames([]);
            setError('');
            
            toast.dismiss(loadingToast);
            toast.success('Steam account disconnected successfully');
        } catch (err) {
            toast.dismiss(loadingToast);
            console.error('Error disconnecting Steam:', err);
            toast.error('Failed to disconnect Steam');
        }
    };

    // Filter and sort games
    const filteredAndSortedGames = games
        .filter(game => {
            const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesGenre = !filterGenre || (game.genres && game.genres.includes(filterGenre));
            return matchesSearch && matchesGenre;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'hours':
                    return (b.hours_played || 0) - (a.hours_played || 0);
                case 'recent':
                    if (!a.last_played && !b.last_played) return 0;
                    if (!a.last_played) return 1;
                    if (!b.last_played) return -1;
                    return new Date(b.last_played) - new Date(a.last_played);
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });

    // Get unique genres for filter
    const availableGenres = [...new Set(
        games.flatMap(game => game.genres || [])
    )].sort();

    const formatPlaytime = (minutes) => {
        if (!minutes || minutes === 0) return 'Never played';
        const hours = Math.floor(minutes / 60);
        if (hours < 1) return `${minutes}m`;
        return `${hours}h ${minutes % 60}m`;
    };

    const formatLastPlayed = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
                <div className="max-w-6xl mx-auto flex items-center justify-center">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white text-lg">Loading your game library...</p>
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
                            {user?.steam_connected ? `${games.length} games in your Steam library` : 'Connect your Steam account to view your games'}
                        </p>
                    </div>
                    <button 
                        onClick={() => navigate('/profile')}
                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                    >
                        ← Back to Profile
                    </button>
                </div>

                {user?.steam_connected ? (
                    <>
                        {/* Controls */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 mb-8">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                        <span className="text-white font-medium">Steam Connected</span>
                                    </div>
                                    {user.steam_library_synced_at && (
                                        <span className="text-white/60 text-sm">
                                            Last synced: {formatLastPlayed(user.steam_library_synced_at)}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex space-x-3">
                                    <button 
                                        onClick={handleSync} 
                                        disabled={syncing}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl text-sm transition-colors duration-200 disabled:opacity-50"
                                    >
                                        {syncing ? 'Syncing...' : '🔄 Sync Library'}
                                    </button>
                                    <button 
                                        onClick={handleDisconnect}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                                    >
                                        Disconnect Steam
                                    </button>
                                </div>
                            </div>

                            {/* Search and Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                        <option value="hours">Most Played</option>
                                        <option value="recent">Recently Played</option>
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
                            </div>
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300">
                                {error}
                            </div>
                        )}

                        {/* Games Grid */}
                        {filteredAndSortedGames.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredAndSortedGames.map((game) => (
                                    <div key={game.id || game.steam_appid} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden shadow-2xl hover:bg-white/15 transition-all duration-300 group">
                                        <div className="relative">
                                            <img
                                                src={game.header_image || `https://steamcdn-a.akamaihd.net/steam/apps/${game.steam_appid}/header.jpg`}
                                                alt={`${game.name} cover`}
                                                className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => {
                                                    e.target.src = `https://via.placeholder.com/460x215/0066cc/ffffff?text=${encodeURIComponent(game.name.slice(0, 10))}`;
                                                }}
                                            />
                                            {game.multiplayer && (
                                                <div className="absolute top-2 right-2 bg-green-500/80 text-white px-2 py-1 rounded-lg text-xs font-medium">
                                                    Multiplayer
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="p-4">
                                            <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 group-hover:text-coral-300 transition-colors">
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
                                <div className="text-6xl mb-4">🎮</div>
                                <h3 className="text-2xl font-bold text-white mb-4">
                                    {searchTerm || filterGenre ? 'No games found' : 'No games in library'}
                                </h3>
                                <p className="text-white/70 mb-6">
                                    {searchTerm || filterGenre 
                                        ? 'Try adjusting your search or filter settings'
                                        : 'Sync your Steam library to see your games here'
                                    }
                                </p>
                                {!searchTerm && !filterGenre && (
                                    <button 
                                        onClick={handleSync}
                                        disabled={syncing}
                                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50"
                                    >
                                        {syncing ? 'Syncing...' : 'Sync Steam Library'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Stats Footer */}
                        {games.length > 0 && (
                            <div className="mt-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-coral-400">{games.length}</div>
                                        <div className="text-white/70 text-sm">Total Games</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-marine-400">
                                            {games.filter(g => g.multiplayer).length}
                                        </div>
                                        <div className="text-white/70 text-sm">Multiplayer</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-green-400">
                                            {Math.round(games.reduce((sum, g) => sum + (g.playtime_forever || g.hours_played || 0), 0) / 60)}h
                                        </div>
                                        <div className="text-white/70 text-sm">Total Playtime</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-purple-400">
                                            {availableGenres.length}
                                        </div>
                                        <div className="text-white/70 text-sm">Genres</div>
                                    </div>
                                </div>
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
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button 
                                onClick={handleOpenIDConnect}
                                className="px-8 py-4 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
                            >
                                🎮 Connect via Steam
                            </button>
                            
                            <button 
                                onClick={handleManualConnect}
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold rounded-xl transition-all duration-300"
                            >
                                📝 Manual Steam ID
                            </button>
                        </div>

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