// src/front/components/Steam/EnhancedSteamFeatures.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import GameImage from '../GameImage';
import authService from '../../store/authService';
import toast from 'react-hot-toast';

// 🎮 Common Games Finder - Find games all group members own
export const CommonGamesFinder = ({ groupMembers, groupId }) => {
    const [commonGames, setCommonGames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [steamStats, setSteamStats] = useState({
        connectedMembers: 0,
        totalMembers: 0,
        coverage: 0
    });

    const findCommonGames = useCallback(async () => {
        const steamMembers = groupMembers.filter(m => m.steam_connected);
        
        if (steamMembers.length < 2) {
            toast.error('Need at least 2 Steam-connected members to find common games');
            return;
        }

        setLoading(true);
        try {
            const response = await authService.authenticatedFetch(
                `/api/gaming/groups/${groupId}/common-games`
            );
            
            if (response.ok) {
                const data = await response.json();
                setCommonGames(data.games || []);
                setSteamStats({
                    connectedMembers: data.steam_connected_count || 0,
                    totalMembers: data.total_members || 0,
                    coverage: data.steam_connected_count ? 
                        (data.steam_connected_count / data.total_members * 100) : 0
                });
                
                toast.success(`Found ${data.games?.length || 0} common games!`);
            } else {
                throw new Error('Failed to fetch common games');
            }
        } catch (error) {
            console.error('Error finding common games:', error);
            toast.error('Failed to find common games');
        } finally {
            setLoading(false);
        }
    }, [groupMembers, groupId]);

    // Auto-load when component mounts
    useEffect(() => {
        if (groupMembers.length > 0) {
            findCommonGames();
        }
    }, [findCommonGames, groupMembers.length]);

    const getRecommendationLevel = (game) => {
        const ownership = game.ownership_stats?.coverage_percentage || 0;
        if (ownership === 100) return { level: 'perfect', text: '🎯 Perfect Match', color: 'text-green-400' };
        if (ownership >= 75) return { level: 'great', text: '🔥 Great Match', color: 'text-orange-400' };
        if (ownership >= 50) return { level: 'good', text: '👍 Good Match', color: 'text-blue-400' };
        return { level: 'partial', text: '📈 Partial Match', color: 'text-gray-400' };
    };

    return (
        <div className="space-y-6">
            {/* Steam Coverage Stats */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                    <span className="mr-2">🎮</span>
                    Steam Coverage
                </h3>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-green-400">
                            {steamStats.connectedMembers}
                        </div>
                        <div className="text-white/70 text-sm">Connected</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-blue-400">
                            {steamStats.totalMembers}
                        </div>
                        <div className="text-white/70 text-sm">Total</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-purple-400">
                            {Math.round(steamStats.coverage)}%
                        </div>
                        <div className="text-white/70 text-sm">Coverage</div>
                    </div>
                </div>
                
                {steamStats.coverage < 75 && (
                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-300 text-sm">
                            💡 Tip: More Steam connections = better game recommendations!
                        </p>
                    </div>
                )}
            </div>

            {/* Common Games List */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center">
                        <span className="mr-2">🎯</span>
                        Common Games ({commonGames.length})
                    </h3>
                    
                    <button
                        onClick={findCommonGames}
                        disabled={loading}
                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin mr-2">🔄</span>
                                Searching...
                            </>
                        ) : (
                            '🔍 Refresh Games'
                        )}
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse bg-white/5 h-20 rounded-lg"></div>
                        ))}
                    </div>
                ) : commonGames.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {commonGames.map(game => {
                            const recommendation = getRecommendationLevel(game);
                            
                            return (
                                <motion.div
                                    key={game.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <GameImage 
                                        src={game.header_image}
                                        alt={game.name}
                                        className="w-20 h-12 rounded mr-4 flex-shrink-0"
                                    />
                                    
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-white truncate">{game.name}</h4>
                                        
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className={`text-sm font-medium ${recommendation.color}`}>
                                                {recommendation.text}
                                            </span>
                                            <span className="text-white/60 text-sm">
                                                {game.ownership_stats?.owners || 0}/{steamStats.connectedMembers} own it
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2 mt-1">
                                            {game.multiplayer && (
                                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                                    Multiplayer
                                                </span>
                                            )}
                                            {game.co_op && (
                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                                    Co-op
                                                </span>
                                            )}
                                            {game.max_players && game.max_players > 4 && (
                                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                                                    Large Group ({game.max_players}+ players)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <div className="text-white font-bold">
                                            {Math.round(game.ownership_stats?.coverage_percentage || 0)}%
                                        </div>
                                        <div className="text-white/60 text-xs">Coverage</div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-4">🎮</div>
                        <h4 className="text-lg font-bold text-white mb-2">No Common Games Yet</h4>
                        <p className="text-white/70 mb-4">
                            Your squad doesn't have any shared multiplayer games yet.
                        </p>
                        <div className="space-y-2 text-white/60 text-sm">
                            <p>💡 Tips to improve game matching:</p>
                            <p>• Ensure all members connect their Steam accounts</p>
                            <p>• Set Steam profiles to public or friend each other</p>
                            <p>• Sync Steam libraries regularly</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 🎯 Steam Group Dashboard - Overview of group's Steam health
export const SteamGroupDashboard = ({ groupMembers }) => {
    const steamStats = React.useMemo(() => {
        const connected = groupMembers.filter(m => m.steam_connected).length;
        const total = groupMembers.length;
        const synced = groupMembers.filter(m => 
            m.steam_connected && m.steam_library_synced_at
        ).length;
        
        const totalGames = groupMembers.reduce((sum, m) => sum + (m.total_games || 0), 0);
        const avgGames = total > 0 ? Math.round(totalGames / total) : 0;
        
        // Calculate "group gaming potential"
        let potential = 'Low';
        const coverage = total > 0 ? (connected / total) * 100 : 0;
        if (coverage >= 75 && avgGames >= 50) potential = 'Excellent';
        else if (coverage >= 50 && avgGames >= 25) potential = 'Good';
        else if (coverage >= 25) potential = 'Fair';
        
        return {
            connected,
            total,
            synced,
            coverage,
            avgGames,
            totalGames,
            potential
        };
    }, [groupMembers]);

    const getPotentialColor = (potential) => {
        switch (potential) {
            case 'Excellent': return 'text-green-400';
            case 'Good': return 'text-blue-400';
            case 'Fair': return 'text-yellow-400';
            default: return 'text-red-400';
        }
    };

    return (
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">📊</span>
                Group Steam Dashboard
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                        {steamStats.connected}/{steamStats.total}
                    </div>
                    <div className="text-white/70 text-sm">Steam Connected</div>
                </div>
                
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                        {Math.round(steamStats.coverage)}%
                    </div>
                    <div className="text-white/70 text-sm">Coverage</div>
                </div>
                
                <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                        {steamStats.avgGames}
                    </div>
                    <div className="text-white/70 text-sm">Avg Games</div>
                </div>
                
                <div className="text-center">
                    <div className={`text-2xl font-bold ${getPotentialColor(steamStats.potential)}`}>
                        {steamStats.potential}
                    </div>
                    <div className="text-white/70 text-sm">Gaming Potential</div>
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-sm text-white/70 mb-2">
                    <span>Steam Integration Progress</span>
                    <span>{steamStats.connected}/{steamStats.total} members</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                    <motion.div
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${steamStats.coverage}%` }}
                        transition={{ duration: 1 }}
                    />
                </div>
            </div>
            
            {/* Recommendations */}
            <div className="space-y-2">
                {steamStats.coverage < 50 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-300 text-sm">
                            🎯 <strong>Boost your squad:</strong> Get more members to connect Steam for better game matching!
                        </p>
                    </div>
                )}
                
                {steamStats.connected > 0 && steamStats.synced < steamStats.connected && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-blue-300 text-sm">
                            🔄 <strong>Sync needed:</strong> {steamStats.connected - steamStats.synced} members should sync their libraries.
                        </p>
                    </div>
                )}
                
                {steamStats.potential === 'Excellent' && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-green-300 text-sm">
                            🎉 <strong>Excellent squad!</strong> Your group has great gaming potential. Start a voting session!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Main enhanced Steam features component
const EnhancedSteamFeatures = ({ groupMembers, groupId, variant = 'full' }) => {
    if (variant === 'dashboard-only') {
        return <SteamGroupDashboard groupMembers={groupMembers} />;
    }
    
    if (variant === 'games-only') {
        return <CommonGamesFinder groupMembers={groupMembers} groupId={groupId} />;
    }
    
    return (
        <div className="space-y-6">
            <SteamGroupDashboard groupMembers={groupMembers} />
            <CommonGamesFinder groupMembers={groupMembers} groupId={groupId} />
        </div>
    );
};

export default EnhancedSteamFeatures;
