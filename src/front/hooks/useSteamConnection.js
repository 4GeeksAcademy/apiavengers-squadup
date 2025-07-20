// src/front/hooks/useSteamConnection.js - The missing hook file
import { useState, useEffect, useCallback } from 'react';
import steamService from '../services/steamService';
import { formatLastPlayed } from '../utils/steamUtils';

const useSteamConnection = (initialUser = null) => {
    const [state, setState] = useState({
        isConnected: initialUser?.steam_connected || initialUser?.is_steam_connected || false,
        loading: false,
        error: null,
        connectionMethod: 'openid', // 'openid' or 'manual'
        steamId: '',
        showInstructions: false,
        cooldownSeconds: 0,
        canSync: true,
        steamUsername: initialUser?.steam_username || '',
        steamAvatar: initialUser?.steam_avatar_url || '',
        totalGames: initialUser?.total_games || 0,
        lastSynced: initialUser?.steam_library_synced_at || null,
        performanceMetrics: null
    });

    // Update state helper
    const updateState = useCallback((updates) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // Load Steam status on mount
    useEffect(() => {
        if (initialUser) {
            updateState({
                isConnected: initialUser.steam_connected || initialUser.is_steam_connected || false,
                steamUsername: initialUser.steam_username || '',
                steamAvatar: initialUser.steam_avatar_url || '',
                totalGames: initialUser.total_games || 0,
                lastSynced: initialUser.steam_library_synced_at || null
            });
        }
        
        // Load current status from API
        loadSteamStatus();
    }, [initialUser]);

    // Cooldown timer effect
    useEffect(() => {
        let interval;
        if (state.cooldownSeconds > 0) {
            interval = setInterval(() => {
                setState(prev => {
                    const newCooldown = prev.cooldownSeconds - 1;
                    return {
                        ...prev,
                        cooldownSeconds: Math.max(0, newCooldown),
                        canSync: newCooldown <= 0
                    };
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [state.cooldownSeconds]);

    // Load Steam connection status
    const loadSteamStatus = useCallback(async () => {
        try {
            updateState({ loading: true, error: null });
            
            const result = await steamService.getConnectionStatus();
            
            if (result.success) {
                const { userConnection, syncStatus, performanceMetrics } = result;
                
                updateState({
                    isConnected: userConnection.connected || false,
                    steamUsername: userConnection.steam_username || '',
                    steamAvatar: userConnection.steam_avatar_url || '',
                    totalGames: userConnection.total_games || 0,
                    lastSynced: userConnection.last_synced,
                    canSync: syncStatus.can_sync || false,
                    cooldownSeconds: syncStatus.cooldown_remaining || 0,
                    performanceMetrics: performanceMetrics,
                    loading: false
                });
            } else {
                updateState({
                    error: result.error,
                    loading: false
                });
            }
        } catch (error) {
            updateState({
                error: error.message || 'Failed to load Steam status',
                loading: false
            });
        }
    }, []);

    // Connect via OpenID
    const connectViaOpenID = useCallback(async (returnTo = '/dashboard') => {
        try {
            updateState({ loading: true, error: null });
            
            const result = await steamService.connectViaOpenID(returnTo);
            
            if (result.success && !result.redirected) {
                // Connection completed without redirect
                await loadSteamStatus();
                updateState({ loading: false });
            } else if (!result.success) {
                updateState({
                    error: result.error || 'Failed to connect Steam account',
                    loading: false
                });
            }
            // If redirected, loading state will be cleared when page reloads
        } catch (error) {
            updateState({
                error: error.message || 'Failed to connect Steam account',
                loading: false
            });
        }
    }, [loadSteamStatus]);

    // Connect manually with Steam ID
    const connectManually = useCallback(async () => {
        if (!state.steamId.trim()) {
            updateState({ error: 'Please enter your Steam ID' });
            return;
        }

        try {
            updateState({ loading: true, error: null });
            
            const result = await steamService.connectManually(state.steamId.trim());
            
            if (result.success) {
                updateState({
                    isConnected: true,
                    steamUsername: result.user?.steam_username || '',
                    steamAvatar: result.user?.steam_avatar_url || '',
                    totalGames: result.user?.total_games || 0,
                    lastSynced: result.user?.steam_library_synced_at || null,
                    steamId: '',
                    loading: false
                });
                
                // Refresh status to get latest data
                await loadSteamStatus();
            } else {
                updateState({
                    error: result.error || 'Failed to connect Steam account',
                    loading: false
                });
            }
        } catch (error) {
            updateState({
                error: error.message || 'Failed to connect Steam account',
                loading: false
            });
        }
    }, [state.steamId, loadSteamStatus]);

    // Disconnect Steam account
    const disconnect = useCallback(async () => {
        if (!window.confirm('Are you sure you want to disconnect your Steam account?\n\nThis will remove access to your Steam games and profile data.')) {
            return;
        }

        try {
            updateState({ loading: true, error: null });
            
            const result = await steamService.disconnect();
            
            if (result.success) {
                updateState({
                    isConnected: false,
                    steamUsername: '',
                    steamAvatar: '',
                    totalGames: 0,
                    lastSynced: null,
                    canSync: false,
                    cooldownSeconds: 0,
                    loading: false
                });
            } else {
                updateState({
                    error: result.error || 'Failed to disconnect Steam account',
                    loading: false
                });
            }
        } catch (error) {
            updateState({
                error: error.message || 'Failed to disconnect Steam account',
                loading: false
            });
        }
    }, []);

    // Sync Steam library
    const syncLibrary = useCallback(async () => {
        if (!state.canSync) {
            updateState({ error: `Please wait ${formatCooldown()} before syncing again` });
            return;
        }

        try {
            updateState({ loading: true, error: null });
            
            const result = await steamService.syncLibrary();
            
            if (result.success) {
                updateState({
                    totalGames: result.totalGames || state.totalGames,
                    lastSynced: result.syncTime || new Date().toISOString(),
                    canSync: false,
                    cooldownSeconds: 300, // 5 minute cooldown
                    loading: false
                });
            } else {
                updateState({
                    error: result.error || 'Failed to sync Steam library',
                    loading: false
                });
            }
        } catch (error) {
            updateState({
                error: error.message || 'Failed to sync Steam library',
                loading: false
            });
        }
    }, [state.canSync, state.totalGames]);

    // Format cooldown time
    const formatCooldown = useCallback(() => {
        if (state.cooldownSeconds <= 0) return '';
        
        const minutes = Math.floor(state.cooldownSeconds / 60);
        const seconds = state.cooldownSeconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }, [state.cooldownSeconds]);

    // Get Steam ID instructions
    const getInstructions = useCallback(() => {
        return {
            title: 'How to find your Steam ID:',
            steps: [
                'Go to steamid.io or steamidfinder.com',
                'Enter your Steam profile URL or username',
                'Copy the 17-digit "steamID64" number',
                'Paste it in the field above'
            ],
            note: 'Your Steam profile must be public to connect.',
            example: '76561198123456789'
        };
    }, []);

    // Get performance metrics
    const getPerformanceMetrics = useCallback(() => {
        return steamService.getPerformanceMetrics();
    }, []);

    return {
        // State
        ...state,
        
        // Actions
        connectViaOpenID,
        connectManually,
        disconnect,
        syncLibrary,
        updateState,
        loadSteamStatus,
        
        // Utilities
        formatCooldown,
        getInstructions,
        getPerformanceMetrics,
        
        // Computed values
        needsSync: state.lastSynced ? 
            (Date.now() - new Date(state.lastSynced).getTime()) > (24 * 60 * 60 * 1000) : 
            true,
        isFullyLoaded: !state.loading && state.isConnected,
        connectionHealth: steamService.checkSteamConnection({
            steam_connected: state.isConnected,
            steam_username: state.steamUsername,
            steam_avatar_url: state.steamAvatar,
            total_games: state.totalGames,
            steam_library_synced_at: state.lastSynced
        })
    };
};

export default useSteamConnection;