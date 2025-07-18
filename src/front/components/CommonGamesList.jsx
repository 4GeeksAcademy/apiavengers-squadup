// src/front/components/CommonGamesList.jsx - ENHANCED with validation helpers

import React, { useState, useEffect } from 'react';
import authService from '../store/authService';
import GameImage from './GameImage';
import { 
    validateGroupId, 
    safeGroupOperation, 
    handleGroupError 
} from '../utils/groupValidation';

const CommonGamesList = ({ groupId }) => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [lastFetch, setLastFetch] = useState(null);

    // 🔧 ENHANCED: Validate groupId immediately
    const groupIdValidation = React.useMemo(() => {
        return validateGroupId(groupId);
    }, [groupId]);

    useEffect(() => {
        if (!groupIdValidation.isValid) {
            console.error('❌ CommonGamesList: Invalid groupId:', groupIdValidation.error);
            setError(groupIdValidation.error);
            setLoading(false);
            return;
        }

        console.log('🎮 CommonGamesList: Fetching games for group:', groupIdValidation.normalizedId);
        fetchCommonGames();
    }, [groupIdValidation.isValid, groupIdValidation.normalizedId]);

    // 🔧 ENHANCED: Safe fetch with comprehensive error handling
    const fetchCommonGames = async () => {
        if (!groupIdValidation.isValid) {
            setError(groupIdValidation.error);
            setLoading(false);
            return;
        }

        const result = await safeGroupOperation(
            groupIdValidation.normalizedId,
            async (validatedGroupId) => {
                setLoading(true);
                setError(null);
                
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                const url = `${backendUrl}/api/gaming/groups/${validatedGroupId}/common-games`;
                
                console.log('📡 Fetching common games from:', url);
                
                // Add timeout and retry logic
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
                
                try {
                    const response = await authService.authenticatedFetch(url, {
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Common games response:', data);
                        
                        // 🔧 ENHANCED: Validate response data structure
                        if (!data || typeof data !== 'object') {
                            throw new Error('Invalid response format from server');
                        }
                        
                        if (!Array.isArray(data.games)) {
                            console.warn('⚠️ Games data is not an array:', data);
                            return {
                                games: [],
                                metadata: data
                            };
                        }
                        
                        // Validate each game object
                        const validGames = data.games.filter(game => {
                            if (!game || typeof game !== 'object' || !game.id) {
                                console.warn('⚠️ Invalid game object:', game);
                                return false;
                            }
                            return true;
                        });
                        
                        if (validGames.length !== data.games.length) {
                            console.warn(`⚠️ Filtered out ${data.games.length - validGames.length} invalid games`);
                        }
                        
                        return {
                            games: validGames,
                            metadata: {
                                steam_connected_count: data.steam_connected_count,
                                total_members: data.total_members,
                                total_games: data.total_games
                            }
                        };
                    } else {
                        // Handle specific HTTP errors
                        let errorMessage = `Server error (${response.status})`;
                        
                        try {
                            const errorData = await response.json();
                            errorMessage = errorData.error || errorMessage;
                        } catch (parseError) {
                            console.warn('Could not parse error response:', parseError);
                        }
                        
                        switch (response.status) {
                            case 404:
                                throw new Error('Group not found');
                            case 403:
                                throw new Error('Access denied to this group');
                            case 400:
                                throw new Error('Invalid group request');
                            default:
                                throw new Error(errorMessage);
                        }
                    }
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    
                    if (fetchError.name === 'AbortError') {
                        throw new Error('Request timed out. Please try again.');
                    }
                    
                    throw fetchError;
                }
            },
            'fetch common games'
        );

        setLoading(false);
        setLastFetch(new Date());

        if (result.success) {
            setGames(result.data.games || []);
            setRetryCount(0); // Reset retry count on success
        } else {
            setError(result.error);
            setGames([]);
        }
    };

    // 🔧 ENHANCED: Retry with exponential backoff
    const handleRetry = () => {
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);
        
        // Add delay for retries to prevent spam
        if (nextRetryCount > 1) {
            const delay = Math.min(1000 * Math.pow(2, nextRetryCount - 2), 5000); // Max 5 second delay
            setTimeout(fetchCommonGames, delay);
        } else {
            fetchCommonGames();
        }
    };

    // 🔧 ENHANCED: Better loading state
    if (loading) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-white">Games Your Squad Owns</h3>
                    {retryCount > 0 && (
                        <span className="text-white/60 text-sm">Retry {retryCount}</span>
                    )}
                </div>
                <div className="flex items-center p-4 bg-white/5 rounded-lg">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                    <div>
                        <p className="text-white/70">Finding common games...</p>
                        {retryCount > 0 && (
                            <p className="text-white/50 text-sm">Attempt {retryCount + 1}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 🔧 ENHANCED: Better error state with recovery options
    if (error) {
        return (
            <div className="space-y-3">
                <h3 className="text-xl font-semibold text-white">Games Your Squad Owns</h3>
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start space-x-2 mb-3">
                        <span className="text-red-400 text-xl">⚠️</span>
                        <div className="flex-1">
                            <span className="text-red-300 font-medium block">Error Loading Games</span>
                            <p className="text-red-200 text-sm mt-1">{error}</p>
                            
                            {lastFetch && (
                                <p className="text-red-200/70 text-xs mt-2">
                                    Last attempt: {lastFetch.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleRetry}
                            disabled={loading}
                            className="px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-red-200 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center space-x-1"
                        >
                            <span className={loading ? 'animate-spin' : ''}>🔄</span>
                            <span>{loading ? 'Retrying...' : 'Try Again'}</span>
                        </button>
                        
                        {retryCount > 2 && (
                            <button
                                onClick={() => {
                                    setError(null);
                                    setRetryCount(0);
                                    setGames([]);
                                }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-lg text-sm transition-colors"
                            >
                                Reset
                            </button>
                        )}
                        
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-500/30 hover:bg-blue-500/50 text-blue-200 rounded-lg text-sm transition-colors"
                        >
                            Refresh Page
                        </button>
                    </div>
                    
                    {/* 🔧 ENHANCED: Error-specific help text */}
                    {error.includes('timeout') && (
                        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-200 text-xs">
                            💡 Tip: Slow response may indicate server load. Try again in a moment.
                        </div>
                    )}
                    
                    {error.includes('Network') && (
                        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-200 text-xs">
                            💡 Tip: Check your internet connection and try again.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 🔧 ENHANCED: Main content with better game validation
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Games Your Squad Owns</h3>
                <div className="flex items-center space-x-2">
                    {lastFetch && (
                        <span className="text-white/50 text-xs">
                            Updated {lastFetch.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={() => {
                            setRetryCount(0);
                            fetchCommonGames();
                        }}
                        disabled={loading}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        title="Refresh games list"
                    >
                        <span className={loading ? 'animate-spin' : ''}>🔄</span>
                    </button>
                </div>
            </div>
            
            {games.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {games.map(game => {
                        // 🔧 ENHANCED: Validate each game object before rendering
                        if (!game || !game.id) {
                            console.error('❌ Invalid game object skipped:', game);
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
                                        {game.co_op && (
                                            <>
                                                <span className="text-white/40">•</span>
                                                <span className="text-purple-300">Co-op</span>
                                            </>
                                        )}
                                    </div>
                                    
                                    {/* 🔧 ENHANCED: Show genres if available */}
                                    {game.genres && Array.isArray(game.genres) && game.genres.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {game.genres.slice(0, 3).map((genre, index) => (
                                                <span key={index} className="px-2 py-0.5 bg-white/20 rounded text-xs text-white/80">
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
                                
                                {/* 🔧 ENHANCED: Additional stats with validation */}
                                <div className="text-right text-sm text-white/60 flex-shrink-0">
                                    <div>{game.ownership_stats?.owners || 0} players</div>
                                    {game.ownership_stats?.coverage_percentage !== undefined && (
                                        <div className="text-xs">
                                            {game.ownership_stats.coverage_percentage === 100 ? '🎯 Perfect' : 
                                             game.ownership_stats.coverage_percentage >= 75 ? '🔥 Great' :
                                             game.ownership_stats.coverage_percentage >= 50 ? '👍 Good' : '📈 Partial'} match
                                        </div>
                                    )}
                                    
                                    {/* Game quality indicators */}
                                    <div className="flex items-center justify-end space-x-1 mt-1">
                                        {game.multiplayer && <span title="Multiplayer">🎮</span>}
                                        {game.co_op && <span title="Co-op">🤝</span>}
                                        {game.max_players && game.max_players > 4 && <span title="Large multiplayer">👥</span>}
                                    </div>
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
                    <div className="text-white/60 text-sm space-y-1 mb-6">
                        <p>💡 Make sure all members have:</p>
                        <p>• Connected their Steam accounts</p>
                        <p>• Some multiplayer games in their library</p>
                        <p>• Public Steam profiles (or friends with each other)</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => {
                                setRetryCount(0);
                                fetchCommonGames();
                            }}
                            disabled={loading}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50"
                        >
                            🔄 Refresh Games
                        </button>
                        <button
                            onClick={() => window.open('/profile', '_blank')}
                            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-colors duration-200"
                        >
                            🎮 Connect Steam
                        </button>
                    </div>
                </div>
            )}
            
            {/* 🔧 ENHANCED: Summary info with metadata */}
            {games.length > 0 && (
                <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    <div className="text-center">
                        <div className="text-white/70 text-sm">
                            Found <span className="text-white font-medium">{games.length}</span> common games
                            {games.filter(g => g.ownership_stats?.coverage_percentage === 100).length > 0 && (
                                <span> • <span className="text-green-300 font-medium">
                                    {games.filter(g => g.ownership_stats?.coverage_percentage === 100).length}
                                </span> with 100% ownership</span>
                            )}
                        </div>
                        
                        {/* Quality indicators */}
                        <div className="flex justify-center space-x-4 mt-2 text-xs text-white/50">
                            <span>🎮 {games.filter(g => g.multiplayer).length} multiplayer</span>
                            <span>🤝 {games.filter(g => g.co_op).length} co-op</span>
                            <span>👥 {games.filter(g => g.max_players && g.max_players > 4).length} large group</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommonGamesList;