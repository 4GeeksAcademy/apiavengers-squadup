// src/front/components/CommonGamesList.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import authService from '../store/authService';
import GameImage from './GameImage';

const CommonGamesList = ({ groupId }) => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // CRITICAL FIX: Validate groupId before making API call
        if (!groupId || groupId === 'undefined') {
            console.error('❌ CommonGamesList: Invalid groupId received:', groupId);
            setError('Invalid group ID');
            setLoading(false);
            return;
        }

        console.log('🎮 CommonGamesList: Fetching games for group:', groupId);
        fetchCommonGames();
    }, [groupId]);

    const fetchCommonGames = async () => {
        // Double-check groupId
        if (!groupId || groupId === 'undefined') {
            setError('Invalid group ID');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            console.log('📡 Fetching common games from:', `${backendUrl}/api/gaming/groups/${groupId}/common-games`);
            
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${groupId}/common-games`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Common games response:', data);
                
                // Validate the response data
                if (data && Array.isArray(data.games)) {
                    setGames(data.games);
                } else {
                    console.error('❌ Invalid games data structure:', data);
                    setGames([]);
                }
            } else if (response.status === 404) {
                console.error('❌ Group not found:', groupId);
                setError('Group not found');
            } else if (response.status === 403) {
                console.error('❌ Access denied to group:', groupId);
                setError('Access denied to this group');
            } else {
                const errorData = await response.json();
                console.error('❌ API error:', response.status, errorData);
                setError(errorData.error || `Server error (${response.status})`);
            }
        } catch (error) {
            console.error("❌ Error fetching common games:", error);
            
            if (error.message.includes('Authentication')) {
                setError('Authentication required. Please log in again.');
            } else if (error.message.includes('Network')) {
                setError('Network error. Please check your connection.');
            } else {
                setError('Failed to load common games');
            }
        } finally {
            setLoading(false);
        }
    };

    // Show loading state
    if (loading) {
        return (
            <div className="space-y-3">
                <h3 className="text-xl font-semibold text-white">Games Your Squad Owns</h3>
                <div className="flex items-center p-3 bg-white/5 rounded-lg">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                    <p className="text-white/70">Finding common games...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="space-y-3">
                <h3 className="text-xl font-semibold text-white">Games Your Squad Owns</h3>
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="text-red-400">⚠️</span>
                        <span className="text-red-300 font-medium">Error Loading Games</span>
                    </div>
                    <p className="text-red-200 text-sm">{error}</p>
                    <button
                        onClick={fetchCommonGames}
                        className="mt-3 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-red-200 rounded-lg text-sm transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Main content
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Games Your Squad Owns</h3>
                <button
                    onClick={fetchCommonGames}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg text-sm transition-colors"
                    title="Refresh games list"
                >
                    🔄
                </button>
            </div>
            
            {games.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {games.map(game => {
                        // Validate each game object
                        if (!game || !game.id) {
                            console.error('❌ Invalid game object:', game);
                            return null;
                        }

                        return (
                            <div key={game.id} className="flex items-center p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                <GameImage 
                                    src={game.header_image} 
                                    alt={game.name || 'Unknown Game'}
                                    fallbackText={game.name || 'Game'}
                                    className="w-24 h-12 object-cover rounded-md mr-4 flex-shrink-0"
                                />
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-white truncate">{game.name || 'Unknown Game'}</p>
                                    <div className="flex items-center space-x-2 text-sm">
                                        <span className="text-green-300">
                                            {game.ownership_stats?.coverage_percentage?.toFixed(0) || 0}% ownership
                                        </span>
                                        {game.multiplayer && (
                                            <>
                                                <span className="text-white/40">•</span>
                                                <span className="text-blue-300">Multiplayer</span>
                                            </>
                                        )}
                                    </div>
                                    
                                    {/* Show genres if available */}
                                    {game.genres && game.genres.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {game.genres.slice(0, 3).map(genre => (
                                                <span key={genre} className="px-2 py-0.5 bg-white/20 rounded text-xs text-white/80">
                                                    {genre}
                                                </span>
                                            ))}
                                            {game.genres.length > 3 && (
                                                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/60">
                                                    +{game.genres.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Additional stats */}
                                <div className="text-right text-sm text-white/60 flex-shrink-0">
                                    <div>{game.ownership_stats?.owners || 0} players</div>
                                    {game.ownership_stats?.coverage_percentage && (
                                        <div className="text-xs">
                                            {game.ownership_stats.coverage_percentage === 100 ? '🎯 Perfect' : 
                                             game.ownership_stats.coverage_percentage >= 75 ? '🔥 Great' :
                                             game.ownership_stats.coverage_percentage >= 50 ? '👍 Good' : '📈 Partial'} match
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎮</div>
                    <h4 className="text-lg font-bold text-white mb-2">No Common Games Found</h4>
                    <p className="text-white/70 mb-4">
                        Your squad doesn't have any multiplayer games in common yet.
                    </p>
                    <div className="text-white/60 text-sm space-y-1">
                        <p>💡 Make sure all members have:</p>
                        <p>• Connected their Steam accounts</p>
                        <p>• Some multiplayer games in their library</p>
                        <p>• Public Steam profiles (or friends with each other)</p>
                    </div>
                    <button
                        onClick={fetchCommonGames}
                        className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200"
                    >
                        🔄 Refresh Games
                    </button>
                </div>
            )}
            
            {/* Summary info */}
            {games.length > 0 && (
                <div className="mt-4 p-3 bg-white/5 rounded-lg text-center">
                    <div className="text-white/70 text-sm">
                        Found <span className="text-white font-medium">{games.length}</span> common games
                        {games.filter(g => g.ownership_stats?.coverage_percentage === 100).length > 0 && (
                            <span> • <span className="text-green-300 font-medium">
                                {games.filter(g => g.ownership_stats?.coverage_percentage === 100).length}
                            </span> with 100% ownership</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommonGamesList;