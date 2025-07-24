// src/front/hooks/useSteamConnection.js - CORS-Free Steam Hook

import { useState, useEffect, useCallback } from 'react';
import steamService from '../services/steamService.js';

/**
 * Enhanced Steam connection hook that eliminates CORS issues
 * by routing all requests through the backend
 */
const useSteamConnection = (initialUser = null) => {
    const [state, setState] = useState({
        // Connection state
        isConnected: initialUser?.steam_connected || initialUser?.is_steam_connected || false,
        loading: false,
        error: null,
        
        // User data
        steamUsername: initialUser?.steam_username || '',
        steamAvatar: initialUser?.steam_avatar_url || '',
        steamId: initialUser?.steam_id || '',
        totalGames: initialUser?.total_games || 0,
        lastSynced: initialUser?.steam_library_synced_at || null,
        
        // Sync state
        canSync: false,
        cooldownSeconds: 0,
        syncInProgress: false,
        
        // Connection health
        connectionHealth: 'unknown',
        recommendations: [],
        
        // Service status
        serviceAvailable: true,
        apiConfigured: false
    });

    // Update state helper
    const updateState = useCallback((updates) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // Load comprehensive Steam status on mount
    useEffect(() => {
        loadSteamStatus();
    }, []);

    // Update from initial user changes
    useEffect(() => {
        if (initialUser) {
            updateState({
                isConnected: initialUser.steam_connected || initialUser.is_steam_connected || false,
                steamUsername: initialUser.steam_username || '',
                steamAvatar: initialUser.steam_avatar_url || '',
                steamId: initialUser.steam_id || '',
                totalGames: initialUser.total_games || 0,
                lastSynced: initialUser.steam_library_synced_at || null
            });
        }
    }, [initialUser, updateState]);

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
                        canSync: newCooldown <= 0 && prev.isConnected
                    };
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [state.cooldownSeconds]);

    // ============================================================================
    // CORE FUNCTIONS
    // ============================================================================

    /**
     * Load comprehensive Steam status from backend
     */
    const loadSteamStatus = useCallback(async () => {
        try {
            updateState({ loading: true, error: null });
            
            const result = await steamService.getConnectionStatus();
            
            if (result.success) {
                const { steamService: service, userConnection, syncStatus } = result;
                
                updateState({
                    // Service status
                    serviceAvailable: service.available,
                    apiConfigured: service.api_configured,
                    
                    // User connection
                    isConnected: userConnection.connected || false,
                    steamUsername: userConnection.steam_username || '',
                    steamAvatar: userConnection.steam_avatar_url || '',
                    steamId: userConnection.steam_id || '',
                    totalGames: userConnection.total_games || 0,
                    lastSynced: userConnection.last_synced,
                    
                    // Sync status
                    canSync: syncStatus.can_sync || false,
                    cooldownSeconds: syncStatus.cooldown_remaining || 0,
                    
                    loading: false
                });
                
                // Validate connection health
                await validateConnectionHealth();
            } else {
                updateState({
                    error: result.error || 'Failed to load Steam status',
                    loading: false
                });
            }
        } catch (error) {
            console.error('Error loading Steam status:', error);
            updateState({
                error: steamService.getErrorMessage(error),
                loading: false
            });
        }
    }, [updateState]);

    /**
     * Validate connection health and get recommendations
     */
    const validateConnectionHealth = useCallback(async () => {
        try {
            const result = await steamService.validateConnection();
            
            if (result.success) {
                updateState({
                    connectionHealth: result.status,
                    recommendations: result.recommendations || []
                });
            }
        } catch (error) {
            console.warn('Connection validation failed:', error);
        }
    }, [updateState]);

    // ============================================================================
    // CONNECTION ACTIONS
    // ============================================================================

    /**
     * Connect Steam via OpenID
     */
    const connectViaOpenID = useCallback(async (returnTo = '/profile') => {
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
                error: steamService.getErrorMessage(error),
                loading: false
            });
        }
    }, [loadSteamStatus, updateState]);

    /**
     * Connect Steam manually with Steam ID
     */
    const connectManually = useCallback(async (steamId) => {
        if (!steamId?.trim()) {
            updateState({ error: 'Please enter your Steam ID' });
            return { success: false, error: 'Steam ID is required' };
        }

        // Validate Steam ID format
        const validation = steamService.validateSteamId(steamId.trim());
        if (!validation.valid) {
            updateState({ error: validation.error });
            return { success: false, error: validation.error };
        }

        try {
            updateState({ loading: true, error: null });
            
            const result = await steamService.connectManually(validation.steamId);
            
            if (result.success) {
                updateState({
                    isConnected: true,
                    steamUsername: result.user?.steam_username || '',
                    steamAvatar: result.user?.steam_avatar_url || '',
                    totalGames: result.user?.total_games || 0,
                    lastSynced: result.user?.steam_library_synced_at || null,
                    loading: false
                });
                
                // Refresh full status
                await loadSteamStatus();
                
                return { 
                    success: true, 
                    user: result.user,
                    message: result.message 
                };
            } else {
                updateState({
                    error: result.error || 'Failed to connect Steam account',
                    loading: false
                });
                return { success: false, error: result.error };
            }
        } catch (error) {
            const errorMessage = steamService.getErrorMessage(error);
            updateState({
                error: errorMessage,
                loading: false
            });
            return { success: false, error: errorMessage };
        }
    }, [loadSteamStatus, updateState]);

    /**
     * Disconnect Steam account
     */
    const disconnect = useCallback(async () => {
        if (!window.confirm('Are you sure you want to disconnect your Steam account?\n\nThis will remove access to your Steam games and profile data.')) {
            return { success: false, cancelled: true };
        }

        try {
            updateState({ loading: true, error: null });
            
            const result = await steamService.disconnect();
            
            if (result.success) {
                updateState({
                    isConnected: false,
                    steamUsername: '',
                    steamAvatar: '',
                    steamId: '',
                    totalGames: 0,
                    lastSynced: null,
                    canSync: false,
                    cooldownSeconds: 0,
                    connectionHealth: 'disconnected',
                    recommendations: ['Connect your Steam account to access gaming features'],
                    loading: false
                });
                
                return { success: true, message: result.message };
            } else {
                updateState({
                    error: result.error || 'Failed to disconnect Steam account',
                    loading: false
                });
                return { success: false, error: result.error };
            }
        } catch (error) {
            const errorMessage = steamService.getErrorMessage(error);
            updateState({
                error: errorMessage,
                loading: false
            });
            return { success: false, error: errorMessage };
        }
    }, [updateState]);

    // ============================================================================
    // LIBRARY ACTIONS
    // ============================================================================

    /**
     * Sync Steam library
     */
    const syncLibrary = useCallback(async () => {
        if (!state.canSync) {
            const message = `Please wait ${formatCooldown()} before syncing again`;
            updateState({ error: message });
            return { success: false, error: message };
        }

        try {
            updateState({ syncInProgress: true, loading: true, error: null });
            
            const result = await steamService.syncLibrary();
            
            if (result.success) {
                updateState({
                    totalGames: result.totalGames || state.totalGames,
                    lastSynced: result.syncTime || new Date().toISOString(),
                    canSync: false,
                    cooldownSeconds: 300, // 5 minute cooldown
                    syncInProgress: false,
                    loading: false
                });
                
                return { 
                    success: true, 
                    newGames: result.newGames,
                    updatedGames: result.updatedGames,
                    message: result.message 
                };
            } else {
                updateState({
                    error: result.error || 'Failed to sync Steam library',
                    syncInProgress: false,
                    loading: false
                });
                return { success: false, error: result.error };
            }
        } catch (error) {
            const errorMessage = steamService.getErrorMessage(error);
            updateState({
                error: errorMessage,
                syncInProgress: false,
                loading: false
            });
            return { success: false, error: errorMessage };
        }
    }, [state.canSync, state.totalGames, updateState]);

    /**
     * Get owned games
     */
    const getOwnedGames = useCallback(async (filters = {}) => {
        try {
            const result = await steamService.getOwnedGames(filters);
            
            if (result.success) {
                return {
                    success: true,
                    games: result.games,
                    total: result.total,
                    stats: steamService.calculateLibraryStats(result.games)
                };
            } else {
                return {
                    success: false,
                    error: result.error,
                    games: [],
                    total: 0
                };
            }
        } catch (error) {
            return {
                success: false,
                error: steamService.getErrorMessage(error),
                games: [],
                total: 0
            };
        }
    }, []);

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    /**
     * Format cooldown time
     */
    const formatCooldown = useCallback(() => {
        if (state.cooldownSeconds <= 0) return '';
        
        const minutes = Math.floor(state.cooldownSeconds / 60);
        const seconds = state.cooldownSeconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }, [state.cooldownSeconds]);

    /**
     * Get Steam ID instructions
     */
    const getInstructions = useCallback(() => {
        return steamService.getSteamIdInstructions();
    }, []);

    /**
     * Check if connection needs attention
     */
    const needsAttention = useCallback(() => {
        if (!state.isConnected) return true;
        if (state.connectionHealth === 'disconnected') return true;
        if (state.connectionHealth === 'incomplete') return true;
        if (state.isConnected && state.totalGames === 0) return true;
        return false;
    }, [state.isConnected, state.connectionHealth, state.totalGames]);

    /**
     * Get status summary
     */
    const getStatusSummary = useCallback(() => {
        if (!state.serviceAvailable) {
            return { status: 'service_unavailable', message: 'Steam service is not available' };
        }
        
        if (!state.apiConfigured) {
            return { status: 'not_configured', message: 'Steam API is not configured' };
        }
        
        if (!state.isConnected) {
            return { status: 'disconnected', message: 'Steam account not connected' };
        }
        
        if (state.totalGames === 0) {
            return { status: 'no_games', message: 'No games synced - try syncing your library' };
        }
        
        if (state.connectionHealth === 'healthy') {
            return { status: 'healthy', message: 'Steam connection is working properly' };
        }
        
        return { status: 'partial', message: 'Steam connection may need attention' };
    }, [state.serviceAvailable, state.apiConfigured, state.isConnected, state.totalGames, state.connectionHealth]);

    // ============================================================================
    // RETURN OBJECT
    // ============================================================================

    return {
        // Core state
        ...state,
        
        // Connection actions
        connectViaOpenID,
        connectManually,
        disconnect,
        
        // Library actions
        syncLibrary,
        getOwnedGames,
        
        // Status and validation
        loadSteamStatus,
        validateConnectionHealth,
        
        // Utilities
        formatCooldown,
        getInstructions,
        needsAttention,
        getStatusSummary,
        
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
        }),
        
        // Service information
        steamService: steamService // For direct access if needed
    };
};

export default useSteamConnection;