// src/front/services/steamService.js - CORS-Free Steam Service

import authService from '../store/authService.js';

/**
 * Steam Service that routes ALL requests through backend to avoid CORS
 * This completely eliminates CORS issues by never calling Steam APIs directly
 */
class SteamServiceFixed {
    constructor() {
        this.baseUrl = import.meta.env.VITE_BACKEND_URL || '';
        this.endpoints = {
            status: '/api/steam/status',
            health: '/api/steam/health',
            userProfile: '/api/steam/user-profile',
            validateConnection: '/api/steam/validate-connection',
            groupStatus: '/api/steam/group-steam-status',
            // Auth endpoints
            connectOpenID: '/api/auth/steam/login',
            connectManual: '/api/auth/steam/connect',
            disconnect: '/api/auth/steam/disconnect',
            // Library endpoints
            sync: '/api/steam/sync-games',
            ownedGames: '/api/steam/owned-games',
            canSync: '/api/steam/can-sync',
            syncStatus: '/api/steam/sync-status'
        };
        
        console.log('🎮 CORS-Free Steam Service initialized:', this.baseUrl);
    }

    /**
     * Make authenticated request to backend
     */
    async makeRequest(endpoint, options = {}) {
        try {
            const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
            
            const response = await authService.authenticatedFetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Steam API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // ============================================================================
    // CONNECTION STATUS AND HEALTH
    // ============================================================================

    /**
     * Get comprehensive Steam status (replaces direct Steam API calls)
     */
    async getConnectionStatus() {
        try {
            const data = await this.makeRequest(this.endpoints.status);
            
            return {
                success: true,
                steamService: data.steam_service,
                userConnection: data.user_connection,
                syncStatus: data.sync_status,
                canConnect: !data.user_connection?.connected,
                canSync: data.sync_status?.can_sync || false,
                cooldownRemaining: data.sync_status?.cooldown_remaining || 0
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Check Steam service health
     */
    async checkHealth() {
        try {
            const data = await this.makeRequest(this.endpoints.health);
            return {
                success: true,
                status: data.status,
                components: data.components
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Validate Steam connection integrity
     */
    async validateConnection() {
        try {
            const data = await this.makeRequest(this.endpoints.validateConnection, {
                method: 'POST'
            });
            
            return {
                success: true,
                status: data.status,
                message: data.message,
                health: data.health,
                recommendations: data.recommendations
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    // ============================================================================
    // CONNECTION MANAGEMENT
    // ============================================================================

    /**
     * Connect Steam via OpenID (backend handles everything)
     */
    async connectViaOpenID(returnTo = '/dashboard') {
        try {
            const data = await this.makeRequest(`${this.endpoints.connectOpenID}?return_to=${encodeURIComponent(returnTo)}`);
            
            if (data.steam_auth_url) {
                // Backend provides Steam auth URL, redirect there
                window.location.href = data.steam_auth_url;
                return { success: true, redirected: true };
            } else {
                throw new Error('No Steam authentication URL received');
            }
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Connect Steam manually with Steam ID
     */
    async connectManually(steamId) {
        try {
            const data = await this.makeRequest(this.endpoints.connectManual, {
                method: 'POST',
                body: JSON.stringify({ steam_id: steamId })
            });
            
            return {
                success: data.success,
                user: data.user,
                message: data.message,
                newGames: data.new_games || 0,
                updatedGames: data.updated_games || 0
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Disconnect Steam account
     */
    async disconnect() {
        try {
            const data = await this.makeRequest(this.endpoints.disconnect, {
                method: 'POST'
            });
            
            return {
                success: data.success,
                message: data.message
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    // ============================================================================
    // LIBRARY MANAGEMENT
    // ============================================================================

    /**
     * Sync Steam library
     */
    async syncLibrary() {
        try {
            const data = await this.makeRequest(this.endpoints.sync, {
                method: 'POST'
            });
            
            return {
                success: data.success,
                newGames: data.new_games || 0,
                updatedGames: data.updated_games || 0,
                totalGames: data.total_games || 0,
                syncTime: data.sync_time,
                message: data.message
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Get owned games
     */
    async getOwnedGames(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) queryParams.append(key, filters[key]);
            });
            
            const endpoint = `${this.endpoints.ownedGames}${queryParams.toString() ? `?${queryParams}` : ''}`;
            const data = await this.makeRequest(endpoint);
            
            return {
                success: data.success,
                games: data.games || [],
                total: data.total || 0,
                steamConnected: data.steam_connected,
                steamUsername: data.steam_username,
                lastSynced: data.last_synced
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error),
                games: [],
                total: 0
            };
        }
    }

    /**
     * Check if user can sync
     */
    async canSync() {
        try {
            const data = await this.makeRequest(this.endpoints.canSync);
            
            return {
                success: data.success,
                canSync: data.can_sync,
                message: data.message,
                cooldownRemaining: data.cooldown_remaining || 0,
                lastSynced: data.last_synced
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Get sync status
     */
    async getSyncStatus() {
        try {
            const data = await this.makeRequest(this.endpoints.syncStatus);
            
            return {
                success: data.success,
                status: data.status
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    // ============================================================================
    // GROUP INTEGRATION
    // ============================================================================

    /**
     * Get group Steam status
     */
    async getGroupSteamStatus(groupId) {
        try {
            const data = await this.makeRequest(`${this.endpoints.groupStatus}/${groupId}`);
            
            return {
                success: true,
                groupId: data.group_id,
                steamStats: data.steam_stats,
                members: data.members,
                recommendations: data.recommendations
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Get common games for a group (from gaming.py)
     */
    async getCommonGames(groupId) {
        try {
            const data = await this.makeRequest(`/api/gaming/groups/${groupId}/common-games`);
            
            return {
                success: true,
                games: data.games || [],
                steamConnectedCount: data.steam_connected_count || 0,
                totalMembers: data.total_members || 0
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error),
                games: []
            };
        }
    }

    // ============================================================================
    // USER PROFILE
    // ============================================================================

    /**
     * Get Steam user profile
     */
    async getUserProfile() {
        try {
            const data = await this.makeRequest(this.endpoints.userProfile);
            
            return {
                success: data.success,
                steamProfile: data.steam_profile,
                cachedData: data.cached_data,
                apiError: data.api_error
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    /**
     * Check Steam connection health with performance context
     */
    checkSteamConnection(user) {
        return {
            isConnected: user?.steam_connected || user?.is_steam_connected || false,
            hasUsername: !!(user?.steam_username),
            hasAvatar: !!(user?.steam_avatar_url),
            hasGames: (user?.total_games || 0) > 0,
            lastSynced: user?.steam_library_synced_at,
            steamId: user?.steam_id,
            isHealthy: function() {
                return this.isConnected && this.hasUsername && this.hasGames;
            },
            getStatus: function() {
                if (!this.isConnected) return 'disconnected';
                if (!this.hasGames) return 'connected_no_games';
                if (!this.hasUsername) return 'connected_partial';
                return 'connected_healthy';
            },
            getRecommendation: function() {
                switch (this.getStatus()) {
                    case 'disconnected':
                        return 'Connect your Steam account to sync your game library';
                    case 'connected_no_games':
                        return 'Sync your Steam library to see your games';
                    case 'connected_partial':
                        return 'Steam connection incomplete. Try reconnecting';
                    case 'connected_healthy':
                        return 'Steam connection is healthy';
                    default:
                        return 'Check your Steam connection';
                }
            }
        };
    }

    /**
     * Validate Steam ID format
     */
    validateSteamId(steamId) {
        if (!steamId || typeof steamId !== 'string') {
            return { 
                valid: false, 
                error: 'Steam ID is required and must be a string' 
            };
        }

        const cleanId = steamId.trim().replace(/\s+/g, '');
        
        if (!/^\d{17}$/.test(cleanId)) {
            return { 
                valid: false, 
                error: 'Steam ID must be exactly 17 digits (e.g., 76561198123456789)' 
            };
        }

        if (!cleanId.startsWith('765611')) {
            return {
                valid: false,
                error: 'Invalid Steam ID format. Most Steam IDs start with 765611...'
            };
        }

        return { 
            valid: true, 
            steamId: cleanId,
            formatted: this.formatSteamId(cleanId)
        };
    }

    /**
     * Format Steam ID for display
     */
    formatSteamId(steamId) {
        if (!steamId || steamId.length !== 17) return steamId;
        return `${steamId.slice(0, 5)}-${steamId.slice(5, 10)}-${steamId.slice(10)}`;
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        if (!error) return 'An unknown error occurred';
        
        const message = error.message || error.toString() || '';
        
        const errorMappings = {
            'authentication expired': 'Your session has expired. Please log in again.',
            'authentication': 'Authentication failed. Please log in again.',
            'invalid_id': 'Please enter a valid 17-digit Steam ID',
            'not_connected': 'Steam account not connected. Please connect your Steam account first.',
            'already_connected': 'This Steam account is already connected to another user',
            'profile_not_found': 'Steam profile not found. Make sure your profile is public and the Steam ID is correct.',
            'rate_limit': 'Too many requests. Please wait a few minutes before trying again.',
            'cooldown': 'Please wait before syncing again. Steam API has rate limits.',
            'network': 'Network error. Please check your internet connection and try again.',
            'connection_failed': 'Failed to connect to Steam. Please try again.',
            'sync_failed': 'Failed to sync Steam library. Please try again later.',
            'timeout': 'Request timed out. Please check your connection and try again.',
            'service_unavailable': 'Steam service is temporarily unavailable. Please try again later.',
            'forbidden': 'Access denied. Please check your permissions.',
            'not_found': 'Steam service endpoint not found. Please contact support.',
            'server_error': 'Server error occurred. Please try again later.'
        };
        
        // Find matching error pattern
        for (const [key, value] of Object.entries(errorMappings)) {
            if (message.toLowerCase().includes(key.toLowerCase().replace('_', ' '))) {
                return value;
            }
        }
        
        // Handle HTTP status codes
        if (message.includes('401')) return 'Authentication expired. Please log in again.';
        if (message.includes('403')) return 'Access denied. Please check your permissions.';
        if (message.includes('404')) return 'Steam service not found. Please contact support.';
        if (message.includes('429')) return 'Too many requests. Please wait before trying again.';
        if (message.includes('500')) return 'Server error. Please try again later.';
        if (message.includes('502')) return 'Steam service temporarily unavailable.';
        if (message.includes('503')) return 'Steam service temporarily unavailable.';
        if (message.includes('504')) return 'Request timed out. Please try again.';
        
        return message || 'An unexpected error occurred. Please try again.';
    }

    /**
     * Get Steam ID finder instructions
     */
    getSteamIdInstructions() {
        return {
            title: 'How to find your Steam ID:',
            methods: [
                {
                    name: 'Method 1: Steam ID Finder',
                    steps: [
                        '1. Go to steamid.io or steamidfinder.com',
                        '2. Enter your Steam profile URL or username',
                        '3. Copy the 17-digit "steamID64" number',
                        '4. Paste it in the field below'
                    ]
                },
                {
                    name: 'Method 2: Steam Profile URL',
                    steps: [
                        '1. Open your Steam profile',
                        '2. Look at the URL - if it contains numbers like:',
                        '   steamcommunity.com/profiles/76561198123456789',
                        '3. Copy those 17 digits',
                        '4. If your URL has a custom name instead, use Method 1'
                    ]
                }
            ],
            example: '76561198123456789',
            notes: [
                'Your Steam profile must be public to connect',
                'The Steam ID is permanent and never changes',
                'Custom URLs (vanity names) cannot be used directly'
            ]
        };
    }

    /**
     * Format playtime for display
     */
    formatPlaytime(minutes) {
        if (!minutes || minutes === 0) return 'Never played';
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours < 1) return `${minutes}m`;
        if (remainingMinutes === 0) return `${hours}h`;
        if (hours < 100) return `${hours}h ${remainingMinutes}m`;
        
        return `${hours}h`;
    }

    /**
     * Calculate library statistics
     */
    calculateLibraryStats(games) {
        if (!games || games.length === 0) {
            return {
                totalGames: 0,
                totalPlaytime: 0,
                averagePlaytime: 0,
                mostPlayedGame: null,
                unplayedCount: 0,
                multiplayerCount: 0
            };
        }
        
        const totalPlaytime = games.reduce((sum, game) => 
            sum + (game.playtime_forever || game.hours_played || 0), 0
        );
        
        const mostPlayedGame = games.reduce((max, game) => {
            const playtime = game.playtime_forever || game.hours_played || 0;
            const maxPlaytime = max?.playtime_forever || max?.hours_played || 0;
            return playtime > maxPlaytime ? game : max;
        }, null);
        
        const unplayedCount = games.filter(game => 
            (game.playtime_forever || game.hours_played || 0) === 0
        ).length;
        
        const multiplayerCount = games.filter(game => 
            game.multiplayer || game.co_op
        ).length;
        
        return {
            totalGames: games.length,
            totalPlaytime: Math.floor(totalPlaytime / 60), // Convert to hours
            averagePlaytime: Math.floor(totalPlaytime / games.length / 60), // Hours per game
            mostPlayedGame,
            unplayedCount,
            multiplayerCount,
            playedPercentage: Math.round(((games.length - unplayedCount) / games.length) * 100)
        };
    }
}

// Create and export singleton instance
const steamServiceFixed = new SteamServiceFixed();
export default steamServiceFixed;