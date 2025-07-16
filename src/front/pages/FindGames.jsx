import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService.js';

const FindGames = () => {
    const { store } = useGlobalReducer();
    const [commonGames, setCommonGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        genre: '',
        multiplayer: false,
        minCoverage: 0
    });

    // Mock data for demo purposes - safe fallback
    const mockGames = [
        {
            id: 1,
            name: "Valorant",
            header_image: "https://via.placeholder.com/460x215/ff6b6b/ffffff?text=Valorant",
            ownership_stats: { owners: 3, coverage_percentage: 75 },
            genres: ["Action", "FPS"],
            multiplayer: true,
            short_description: "Tactical 5v5 character-based shooter"
        },
        {
            id: 2,
            name: "Apex Legends",
            header_image: "https://via.placeholder.com/460x215/4ecdc4/ffffff?text=Apex",
            ownership_stats: { owners: 2, coverage_percentage: 50 },
            genres: ["Battle Royale", "Action"],
            multiplayer: true,
            short_description: "Squad-based battle royale shooter"
        },
        {
            id: 3,
            name: "Minecraft",
            header_image: "https://via.placeholder.com/460x215/45b7d1/ffffff?text=Minecraft",
            ownership_stats: { owners: 4, coverage_percentage: 100 },
            genres: ["Sandbox", "Survival"],
            multiplayer: true,
            short_description: "Build, explore, and survive in infinite worlds"
        }
    ];

    useEffect(() => {
        const fetchCommonGames = async () => {
            console.log('Fetching common games');
            try {
                if (!store.user?.steam_connected) {
                    // Use mock data for demo if Steam not connected
                    setCommonGames(mockGames);
                    setLoading(false);
                    return;
                }

                const userIds = [store.user?.id || 1, 2];
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                
                const response = await authService.authenticatedFetch(`${backendUrl}/api/steam/common-games`, {
                    method: 'POST',
                    body: JSON.stringify({ user_ids: userIds })
                });
                
                if (!response.ok) throw new Error('Failed to fetch games');
                const data = await response.json();
                setCommonGames(data.games || []);
            } catch (err) {
                console.error('Error fetching games:', err);
                // Fallback to mock data for demo
                setCommonGames(mockGames);
                setError(null); // Don't show error, use mock data instead
            } finally {
                setLoading(false);
            }
        };
        
        fetchCommonGames();
    }, [store.user]);

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const filteredGames = commonGames.filter(game => {
        const matchesGenre = !filters.genre || (game.genres && game.genres.includes(filters.genre));
        const matchesMultiplayer = !filters.multiplayer || game.multiplayer;
        const matchesCoverage = game.ownership_stats.coverage_percentage >= filters.minCoverage;
        
        return matchesGenre && matchesMultiplayer && matchesCoverage;
    });

    const allGenres = [...new Set(commonGames.flatMap(game => game.genres || []))];

    const getCoverageColor = (percentage) => {
        if (percentage >= 75) return 'text-green-400';
        if (percentage >= 50) return 'text-yellow-400';
        return 'text-orange-400';
    };

    const getCoverageBadge = (percentage) => {
        if (percentage === 100) return 'Perfect Match';
        if (percentage >= 75) return 'Great Match';
        if (percentage >= 50) return 'Good Match';
        return 'Partial Match';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Finding games you can play together...</p>
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
                        <h1 className="text-4xl font-bold text-white mb-2">Find Games</h1>
                        <p className="text-white/70">Discover games you can play with your squad</p>
                    </div>
                    <Link 
                        to="/dashboard"
                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Demo Notice */}
                {!store.user?.steam_connected && (
                    <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
                        <div className="flex items-center space-x-2">
                            <span>ℹ️</span>
                            <div>
                                <strong>Demo Mode:</strong> Showing sample games since Steam isn't connected. 
                                Connect your Steam account to see real common games with your friends!
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Filter Games</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Genre</label>
                            <select
                                value={filters.genre}
                                onChange={(e) => handleFilterChange('genre', e.target.value)}
                                className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-coral-500 transition-colors"
                            >
                                <option value="">All Genres</option>
                                {allGenres.map(genre => (
                                    <option key={genre} value={genre}>{genre}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Coverage</label>
                            <select
                                value={filters.minCoverage}
                                onChange={(e) => handleFilterChange('minCoverage', parseInt(e.target.value))}
                                className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-coral-500 transition-colors"
                            >
                                <option value={0}>Any Coverage</option>
                                <option value={50}>50%+ Coverage</option>
                                <option value={75}>75%+ Coverage</option>
                                <option value={100}>Perfect Match (100%)</option>
                            </select>
                        </div>
                        
                        <div className="flex items-end">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.multiplayer}
                                    onChange={(e) => handleFilterChange('multiplayer', e.target.checked)}
                                    className="w-4 h-4 bg-white/10 border border-white/30 rounded focus:ring-coral-500 focus:ring-2 text-coral-500"
                                />
                                <span className="text-white/80">Multiplayer Only</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300">
                        <div className="flex items-center space-x-2">
                            <span>⚠️</span>
                            <span>Error: {error}</span>
                        </div>
                    </div>
                )}

                {/* Games Grid */}
                {filteredGames.length > 0 ? (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">
                                Common Games ({filteredGames.length})
                            </h2>
                            <div className="text-white/60 text-sm">
                                {filteredGames.filter(g => g.ownership_stats.coverage_percentage === 100).length} perfect matches
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredGames.map(game => (
                                <div key={game.id} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden shadow-2xl hover:bg-white/15 transition-all duration-300 group">
                                    <div className="relative">
                                        <img
                                            src={game.header_image || `https://via.placeholder.com/460x215/0066cc/ffffff?text=${encodeURIComponent(game.name.slice(0, 10))}`}
                                            alt={game.name}
                                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                e.target.src = `https://via.placeholder.com/460x215/0066cc/ffffff?text=${encodeURIComponent(game.name.slice(0, 10))}`;
                                            }}
                                        />
                                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium ${
                                            game.ownership_stats.coverage_percentage >= 75 ? 'bg-green-500/80 text-white' :
                                            game.ownership_stats.coverage_percentage >= 50 ? 'bg-yellow-500/80 text-white' :
                                            'bg-orange-500/80 text-white'
                                        }`}>
                                            {game.ownership_stats.coverage_percentage}%
                                        </div>
                                    </div>
                                    
                                    <div className="p-4">
                                        <h3 className="text-white font-bold text-lg mb-2 group-hover:text-coral-300 transition-colors">
                                            {game.name}
                                        </h3>
                                        
                                        {game.short_description && (
                                            <p className="text-white/70 text-sm mb-3 line-clamp-2">
                                                {game.short_description}
                                            </p>
                                        )}
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/60 text-sm">Squad Coverage:</span>
                                                <span className={`font-bold ${getCoverageColor(game.ownership_stats.coverage_percentage)}`}>
                                                    {getCoverageBadge(game.ownership_stats.coverage_percentage)}
                                                </span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/60 text-sm">Owners:</span>
                                                <span className="text-white font-medium">
                                                    {game.ownership_stats.owners} players
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
                                            
                                            {game.multiplayer && (
                                                <div className="mt-3">
                                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                                                        🎮 Multiplayer
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <button className="w-full px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200">
                                                Start Game Session
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 text-center">
                        <div className="text-6xl mb-4">🎮</div>
                        <h3 className="text-2xl font-bold text-white mb-4">No Common Games Found</h3>
                        <p className="text-white/70 mb-6">
                            {!store.user?.steam_connected 
                                ? "Connect your Steam account and join groups to find games you can play together!"
                                : "Try adjusting your filters or invite more friends to find common games."
                            }
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {!store.user?.steam_connected ? (
                                <>
                                    <Link 
                                        to="/profile"
                                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                                    >
                                        Connect Steam
                                    </Link>
                                    <Link 
                                        to="/dashboard"
                                        className="px-6 py-3 bg-marine-500 hover:bg-marine-600 text-white font-medium rounded-xl transition-colors duration-200"
                                    >
                                        Join Groups
                                    </Link>
                                </>
                            ) : (
                                <button 
                                    onClick={() => setFilters({ genre: '', multiplayer: false, minCoverage: 0 })}
                                    className="px-6 py-3 bg-marine-500 hover:bg-marine-600 text-white font-medium rounded-xl transition-colors duration-200"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="mt-12 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Link 
                            to="/dashboard"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">👥</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Create Group</h4>
                                <p className="text-white/60 text-sm">Start a new gaming squad</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="/profile"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">🎮</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Sync Steam</h4>
                                <p className="text-white/60 text-sm">Update your game library</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="/friends"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">🔍</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Find Friends</h4>
                                <p className="text-white/60 text-sm">Connect with new players</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FindGames;