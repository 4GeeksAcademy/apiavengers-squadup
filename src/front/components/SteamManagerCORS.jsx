// src/front/components/SteamManagerCORS.jsx - CORS-aware Steam Manager
import React, { useState, useEffect } from 'react';
import steamService from '../services/steamService';
import toast from 'react-hot-toast';

const SteamManagerCORS = ({ user, onUserUpdate, variant = 'full', className = '' }) => {
    const [steamStatus, setSteamStatus] = useState({
        isConnected: user?.steam_connected || user?.is_steam_connected || false,
        loading: false,
        error: null,
        steamUsername: user?.steam_username || '',
        steamAvatar: user?.steam_avatar_url || '',
        totalGames: user?.total_games || 0,
        lastSynced: user?.steam_library_synced_at || null,
        canSync: false,
        cooldownSeconds: 0
    });

    // Load Steam status on mount
    useEffect(() => {
        loadSteamStatus();
    }, []);

    // Update from user prop changes
    useEffect(() => {
        if (user) {
            setSteamStatus(prev => ({
                ...prev,
                isConnected: user.steam_connected || user.is_steam_connected || false,
                steamUsername: user.steam_username || '',
                steamAvatar: user.steam_avatar_url || '',
                totalGames: user.total_games || 0,
                lastSynced: user.steam_library_synced_at || null
            }));
        }
    }, [user]);

    const loadSteamStatus = async () => {
        try {
            setSteamStatus(prev => ({ ...prev, loading: true, error: null }));
            
            const result = await steamService.getConnectionStatus();
            
            if (result.success) {
                setSteamStatus(prev => ({
                    ...prev,
                    isConnected: result.user_connection?.connected || false,
                    steamUsername: result.user_connection?.steam_username || '',
                    steamAvatar: result.user_connection?.steam_avatar_url || '',
                    totalGames: result.user_connection?.total_games || 0,
                    lastSynced: result.user_connection?.last_synced || null,
                    canSync: result.sync_status?.can_sync || false,
                    cooldownSeconds: result.sync_status?.cooldown_remaining || 0,
                    loading: false
                }));
            } else {
                setSteamStatus(prev => ({
                    ...prev,
                    error: result.error || 'Failed to load Steam status',
                    loading: false
                }));
            }
        } catch (error) {
            console.error('Steam status error:', error);
            setSteamStatus(prev => ({
                ...prev,
                error: 'Network error: Could not connect to Steam service',
                loading: false
            }));
        }
    };

    const connectViaOpenID = async () => {
        try {
            setSteamStatus(prev => ({ ...prev, loading: true, error: null }));
            
            const result = await steamService.connectViaOpenID('/profile');
            
            if (!result.success) {
                setSteamStatus(prev => ({
                    ...prev,
                    error: result.error || 'Failed to connect Steam account',
                    loading: false
                }));
                toast.error(result.error || 'Failed to connect Steam account');
            }
            // If successful, page will redirect
        } catch (error) {
            setSteamStatus(prev => ({
                ...prev,
                error: 'Network error: Could not connect to Steam',
                loading: false
            }));
            toast.error('Network error: Could not connect to Steam');
        }
    };

    const disconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect your Steam account?')) {
            return;
        }

        try {
            setSteamStatus(prev => ({ ...prev, loading: true, error: null }));
            
            const result = await steamService.disconnect();
            
            if (result.success) {
                setSteamStatus(prev => ({
                    ...prev,
                    isConnected: false,
                    steamUsername: '',
                    steamAvatar: '',
                    totalGames: 0,
                    lastSynced: null,
                    loading: false
                }));
                
                toast.success('Steam account disconnected');
                
                if (onUserUpdate) {
                    onUserUpdate({
                        ...user,
                        steam_connected: false,
                        is_steam_connected: false,
                        steam_username: null,
                        steam_avatar_url: null,
                        total_games: 0,
                        steam_library_synced_at: null
                    });
                }
            } else {
                setSteamStatus(prev => ({
                    ...prev,
                    error: result.error || 'Failed to disconnect Steam account',
                    loading: false
                }));
                toast.error(result.error || 'Failed to disconnect Steam account');
            }
        } catch (error) {
            setSteamStatus(prev => ({
                ...prev,
                error: 'Network error: Could not disconnect Steam',
                loading: false
            }));
            toast.error('Network error: Could not disconnect Steam');
        }
    };

    const syncLibrary = async () => {
        if (!steamStatus.canSync) {
            toast.error(`Please wait ${steamStatus.cooldownSeconds} seconds before syncing again`);
            return;
        }

        try {
            setSteamStatus(prev => ({ ...prev, loading: true, error: null }));
            
            const result = await steamService.syncLibrary();
            
            if (result.success) {
                setSteamStatus(prev => ({
                    ...prev,
                    totalGames: result.totalGames || prev.totalGames,
                    lastSynced: result.syncTime || new Date().toISOString(),
                    canSync: false,
                    cooldownSeconds: 300, // 5 minutes
                    loading: false
                }));
                
                toast.success(`Library synced! ${result.newGames} new games, ${result.updatedGames} updated.`);
                
                if (onUserUpdate) {
                    onUserUpdate({
                        ...user,
                        total_games: result.totalGames || steamStatus.totalGames,
                        steam_library_synced_at: result.syncTime || new Date().toISOString()
                    });
                }
            } else {
                setSteamStatus(prev => ({
                    ...prev,
                    error: result.error || 'Failed to sync Steam library',
                    loading: false
                }));
                toast.error(result.error || 'Failed to sync Steam library');
            }
        } catch (error) {
            setSteamStatus(prev => ({
                ...prev,
                error: 'Network error: Could not sync Steam library',
                loading: false
            }));
            toast.error('Network error: Could not sync Steam library');
        }
    };

    if (variant === 'status-only') {
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
                {steamStatus.loading ? (
                    <span className="text-yellow-400">⏳ Loading...</span>
                ) : steamStatus.isConnected ? (
                    <span className="text-green-400">✅ Steam Connected</span>
                ) : (
                    <span className="text-red-400">❌ Not Connected</span>
                )}
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <span className="text-xl mr-2">🎮</span>
                    Steam Connection
                </h3>

                {/* Error Display */}
                {steamStatus.error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <span className="text-red-400">⚠️</span>
                            <div className="text-red-300 text-sm">
                                <strong>Connection Error:</strong> {steamStatus.error}
                            </div>
                        </div>
                        <button 
                            onClick={() => setSteamStatus(prev => ({ ...prev, error: null }))}
                            className="mt-2 text-xs text-red-300 underline hover:no-underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {steamStatus.isConnected ? (
                    <div className="space-y-4">
                        {/* Connected Status */}
                        <div className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            {steamStatus.steamAvatar && (
                                <img 
                                    src={steamStatus.steamAvatar} 
                                    alt="Steam Avatar"
                                    className="w-10 h-10 rounded-full"
                                />
                            )}
                            <div>
                                <h4 className="text-white font-medium">
                                    {steamStatus.steamUsername || 'Steam User'}
                                </h4>
                                <p className="text-green-300 text-sm">
                                    {steamStatus.totalGames} games in library
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3">
                            <button
                                onClick={syncLibrary}
                                disabled={steamStatus.loading || !steamStatus.canSync}
                                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                            >
                                {steamStatus.loading ? (
                                    'Syncing...'
                                ) : steamStatus.canSync ? (
                                    '🔄 Sync Games'
                                ) : (
                                    `Cooldown (${steamStatus.cooldownSeconds}s)`
                                )}
                            </button>
                            
                            <button
                                onClick={disconnect}
                                disabled={steamStatus.loading}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>

                        {/* Last Sync Info */}
                        {steamStatus.lastSynced && (
                            <p className="text-white/60 text-sm text-center">
                                Last synced: {new Date(steamStatus.lastSynced).toLocaleString()}
                            </p>
                        )}
                    </div>
                ) : (
                    /* Not Connected */
                    <div className="space-y-4">
                        <div className="text-center py-6">
                            <div className="text-4xl mb-4">🎮</div>
                            <h4 className="text-lg font-bold text-white mb-2">Connect Your Steam Account</h4>
                            <p className="text-white/70 mb-6">
                                Link your Steam account to sync your games and find friends to play with.
                            </p>
                        </div>

                        <button
                            onClick={connectViaOpenID}
                            disabled={steamStatus.loading}
                            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                        >
                            {steamStatus.loading ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    <span>Connecting...</span>
                                </>
                            ) : (
                                <>
                                    <span>🎮</span>
                                    <span>Connect Steam</span>
                                </>
                            )}
                        </button>

                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300 text-sm">
                            <div className="flex items-start space-x-2">
                                <span className="text-blue-400 mt-0.5">ℹ️</span>
                                <div>
                                    <strong>Benefits:</strong>
                                    <ul className="mt-1 space-y-1">
                                        <li>• Automatic game library sync</li>
                                        <li>• Find common games with friends</li>
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

export default SteamManagerCORS;
