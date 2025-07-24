// src/front/services/steamServiceProxy.js - Steam Service with Backend Proxy
import authService from '../store/authService.js';

class SteamServiceProxy {
    constructor() {
        this.baseUrl = import.meta.env.VITE_BACKEND_URL || '';
        console.log('🎮 SteamServiceProxy initialized with backend:', this.baseUrl);
    }

    /**
     * Get Steam connection status via backend proxy
     */
    async getConnectionStatus() {
        try {
            const response = await authService.authenticatedFetch(`${this.baseUrl}/api/steam/status`);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    ...data
                };
            } else {
                throw new Error('Failed to get Steam status');
            }
        } catch (error) {
            console.error('❌ Steam status error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Connect Steam via OpenID (backend proxy)
     */
    async connectViaOpenID(returnTo = '/dashboard') {
        try {
            const response = await authService.authenticatedFetch(`${this.baseUrl}/api/auth/steam/login?return_to=${encodeURIComponent(returnTo)}`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.steam_auth_url) {
                    // Redirect to Steam
                    window.location.href = data.steam_auth_url;
                    return { success: true, redirected: true };
                } else {
                    throw new Error('No Steam auth URL received');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to initiate Steam connection');
            }
        } catch (error) {
            console.error('❌ Steam connect error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Connect Steam manually with Steam ID
     */
    async connectManually(steamId) {
        try {
            const response = await authService.authenticatedFetch(`${this.baseUrl}/api/auth/steam/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ steam_id: steamId })
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: data.success,
                    user: data.user,
                    message: data.message,
                    newGames: data.new_games || 0,
                    updatedGames: data.updated_games || 0
                };
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to connect Steam account');
            }
        } catch (error) {
            console.error('❌ Manual Steam connect error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Disconnect Steam account
     */
    async disconnect() {
        try {
            const response = await authService.authenticatedFetch(`${this.baseUrl}/api/auth/steam/disconnect`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: data.success,
                    message: data.message
                };
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to disconnect Steam account');
            }
        } catch (error) {
            console.error('❌ Steam disconnect error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Sync Steam library
     */
    async syncLibrary() {
        try {
            const response = await authService.authenticatedFetch(`${this.baseUrl}/api/steam/sync-games`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: data.success,
                    newGames: data.new_games || 0,
                    updatedGames: data.updated_games || 0,
                    totalGames: data.total_games || 0,
                    syncTime: data.sync_time,
                    message: data.message
                };
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to sync Steam library');
            }
        } catch (error) {
            console.error('❌ Steam sync error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get user's owned games
     */
    async getOwnedGames(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.genre) queryParams.append('genre', filters.genre);
            if (filters.multiplayer) queryParams.append('multiplayer', 'true');
            if (filters.sort) queryParams.append('sort', filters.sort);
            
            const endpoint = `${this.baseUrl}/api/steam/owned-games${queryParams.toString() ? `?${queryParams}` : ''}`;
            const response = await authService.authenticatedFetch(endpoint);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: data.success,
                    games: data.games || [],
                    total: data.total || 0,
                    steamConnected: data.steam_connected,
                    steamUsername: data.steam_username,
                    lastSynced: data.last_synced
                };
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load Steam games');
            }
        } catch (error) {
            console.error('❌ Get games error:', error);
            return {
                success: false,
                error: error.message,
                games: [],
                total: 0
            };
        }
    }

    /**
     * Get common games for a group
     */
    async getCommonGames(groupId) {
        try {
            const response = await authService.authenticatedFetch(`${this.baseUrl}/api/gaming/groups/${groupId}/common-games`);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    games: data.games || [],
                    steamConnectedCount: data.steam_connected_count || 0,
                    totalMembers: data.total_members || 0
                };
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get common games');
            }
        } catch (error) {
            console.error('❌ Common games error:', error);
            return {
                success: false,
                error: error.message,
                games: []
            };
        }
    }

    /**
     * Get sync status
     */
    async getSyncStatus() {
        try {
            const response = await authService.authenticatedFetch(`${this.baseUrl}/api/steam/sync-status`);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: data.success,
                    status: data.status
                };
            } else {
                throw new Error('Failed to get sync status');
            }
        } catch (error) {
            console.error('❌ Sync status error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check if user can sync
     */
    async canSync() {
        try {
            const response = await authService.authenticatedFetch(`${this.baseUrl}/api/steam/can-sync`);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: data.success,
                    canSync: data.can_sync,
                    message: data.message,
                    cooldownRemaining: data.cooldown_remaining
                };
            } else {
                throw new Error('Failed to check sync permission');
            }
        } catch (error) {
            console.error('❌ Can sync error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check Steam connection health
     */
    checkSteamConnection(user) {
        return {
            isConnected: user?.steam_connected || user?.is_steam_connected || false,
            hasUsername: !!(user?.steam_username),
            hasAvatar: !!(user?.steam_avatar_url),
            hasGames: (user?.total_games || 0) > 0,
            lastSynced: user?.steam_library_synced_at,
            steamId: user?.steam_id,
            getRecommendation: function() {
                if (!this.isConnected) return 'Connect your Steam account to sync your game library';
                if (!this.hasGames) return 'Sync your Steam library to see your games';
                if (!this.hasUsername) return 'Steam connection incomplete. Try reconnecting';
                return 'Steam connection is healthy';
            }
        };
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        if (!error) return 'An unknown error occurred';
        
        const message = error.message || error.toString() || '';
        
        // Handle specific error patterns
        if (message.includes('authentication')) return 'Please log in again';
        if (message.includes('rate_limit')) return 'Too many requests. Please wait before trying again.';
        if (message.includes('not_connected')) return 'Steam account not connected. Please connect your Steam account first.';
        if (message.includes('cooldown')) return 'Please wait before syncing again. Steam API has rate limits.';
        if (message.includes('network') || message.includes('fetch')) return 'Network error. Please check your connection.';
        if (message.includes('timeout')) return 'Request timed out. Please try again.';
        
        return message || 'An unexpected error occurred. Please try again.';
    }
}

// Export singleton instance
const steamServiceProxy = new SteamServiceProxy();
export default steamServiceProxy;
