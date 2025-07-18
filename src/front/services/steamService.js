// src/front/services/steamService.js - COMPLETE FIXED VERSION

import { fetchWithConfig, apiUrl, isCodespace, frontendUrl } from '../config/environment.js';
import authService from '../store/authService.js';

/**
 * Complete Steam service for frontend with enhanced authentication,
 * error handling, and GitHub Codespace compatibility
 */
class SteamService {
    constructor() {
        this.baseUrl = apiUrl;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.maxRetryDelay = 8000;
        
        // Steam connection state
        this.isConnecting = false;
        this.isSyncing = false;
        this.lastSyncAttempt = null;
        this.syncCooldown = 5 * 60 * 1000; // 5 minutes
        
        console.log('🎮 SteamService initialized:', {
            apiUrl: this.baseUrl,
            isCodespace,
            frontendUrl
        });
    }

    /**
     * Enhanced authenticated request with comprehensive error handling
     */
    async authenticatedRequest(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        
        const token = authService.getAccessToken();
        if (!token) {
            throw new Error('No authentication token available. Please log in.');
        }

        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                // Add origin for Codespaces CORS
                ...(isCodespace && { 'Origin': frontendUrl }),
                ...options.headers
            },
            credentials: 'include',
            ...options
        };

        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`🔄 Steam API attempt ${attempt}/${this.retryAttempts}:`, {
                    method: defaultOptions.method,
                    url,
                    hasAuth: !!defaultOptions.headers.Authorization
                });

                const response = await fetchWithConfig(url, defaultOptions);
                
                console.log(`📡 Steam API response:`, {
                    status: response.status,
                    statusText: response.statusText,
                    attempt
                });

                // Handle specific HTTP status codes
                if (response.status === 401) {
                    console.warn('🔑 Steam API authentication error');
                    authService.clearAuth();
                    throw new Error('Authentication expired. Please log in again.');
                }
                
                if (response.status === 403) {
                    throw new Error('Access denied. Please check your permissions.');
                }
                
                if (response.status === 404) {
                    throw new Error('Steam service endpoint not found.');
                }
                
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After') || 60;
                    throw new Error(`Rate limited. Please wait ${retryAfter} seconds before trying again.`);
                }
                
                if (response.status >= 500) {
                    throw new Error('Steam service is temporarily unavailable. Please try again later.');
                }
                
                // Success - return response
                if (response.ok) {
                    return response;
                }
                
                // Handle other 4xx errors
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
                
            } catch (error) {
                lastError = error;
                
                console.warn(`⚠️ Steam API attempt ${attempt} failed:`, {
                    error: error.message,
                    shouldRetry: this.shouldRetry(error),
                    attemptsLeft: this.retryAttempts - attempt
                });
                
                // Don't retry certain errors
                if (!this.shouldRetry(error) || attempt === this.retryAttempts) {
                    break;
                }
                
                // Exponential backoff with jitter
                const delay = Math.min(
                    this.retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
                    this.maxRetryDelay
                );
                
                console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.error('❌ All Steam API attempts failed:', lastError.message);
        throw lastError;
    }

    /**
     * Determine if an error should trigger a retry
     */
    shouldRetry(error) {
        const message = error.message.toLowerCase();
        
        // Never retry authentication or permission errors
        if (message.includes('authentication') || 
            message.includes('401') || 
            message.includes('403') || 
            message.includes('access denied')) {
            return false;
        }
        
        // Never retry client errors (4xx except 429)
        if (message.includes('404') || 
            message.includes('400') || 
            message.includes('not found')) {
            return false;
        }
        
        // Retry network errors, timeouts, and server errors
        return message.includes('fetch') || 
               message.includes('network') || 
               message.includes('timeout') || 
               message.includes('500') || 
               message.includes('502') || 
               message.includes('503') || 
               message.includes('504') ||
               message.includes('temporarily unavailable');
    }

    /**
     * Connect Steam account via OpenID (automatic method)
     */
    async connectViaOpenID(returnTo = '/dashboard') {
        if (this.isConnecting) {
            throw new Error('Steam connection already in progress');
        }

        try {
            console.log('🔗 Initiating Steam OpenID connection...');
            this.isConnecting = true;
            
            const response = await this.authenticatedRequest('/api/auth/steam/login', {
                method: 'GET'
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.steam_auth_url) {
                    console.log('🔗 Redirecting to Steam for authentication...');
                    
                    // Store return URL for after authentication
                    sessionStorage.setItem('steam_return_to', returnTo);
                    
                    // Redirect to Steam
                    window.location.href = data.steam_auth_url;
                    
                    return { success: true, redirected: true };
                } else {
                    throw new Error('No Steam authentication URL received from server');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to initiate Steam connection');
            }
        } catch (error) {
            console.error('❌ Steam OpenID connection failed:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Connect Steam account manually with Steam ID
     */
    async connectManually(steamId) {
        if (this.isConnecting) {
            throw new Error('Steam connection already in progress');
        }

        try {
            console.log('🔗 Connecting Steam account manually with ID:', steamId);
            this.isConnecting = true;
            
            // Validate Steam ID format
            const validation = this.validateSteamId(steamId);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            const response = await this.authenticatedRequest('/api/auth/steam/connect', {
                method: 'POST',
                body: JSON.stringify({
                    steam_id: validation.steamId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    console.log('✅ Steam account connected successfully:', {
                        newGames: data.new_games,
                        updatedGames: data.updated_games,
                        username: data.user?.steam_username
                    });
                    
                    return {
                        success: true,
                        user: data.user,
                        newGames: data.new_games || 0,
                        updatedGames: data.updated_games || 0,
                        message: `Steam account connected! ${data.new_games || 0} games added to your library.`
                    };
                } else {
                    throw new Error(data.error || 'Failed to connect Steam account');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to connect Steam account');
            }
        } catch (error) {
            console.error('❌ Manual Steam connection failed:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Disconnect Steam account
     */
    async disconnect() {
        try {
            console.log('🔌 Disconnecting Steam account...');
            
            const response = await this.authenticatedRequest('/api/auth/steam/disconnect', {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Steam account disconnected successfully');
                
                return { 
                    success: true, 
                    message: data.message || 'Steam account disconnected successfully'
                };
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to disconnect Steam account');
            }
        } catch (error) {
            console.error('❌ Steam disconnection failed:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Sync Steam library with rate limiting
     */
    async syncLibrary() {
        if (this.isSyncing) {
            throw new Error('Steam library sync already in progress');
        }

        try {
            console.log('🔄 Starting Steam library sync...');
            this.isSyncing = true;
            
            // Check rate limiting
            const now = Date.now();
            if (this.lastSyncAttempt && (now - this.lastSyncAttempt < this.syncCooldown)) {
                const remainingTime = Math.ceil((this.syncCooldown - (now - this.lastSyncAttempt)) / 1000);
                throw new Error(`Please wait ${remainingTime} seconds before syncing again`);
            }
            
            this.lastSyncAttempt = now;
            
            const response = await this.authenticatedRequest('/api/steam/sync-games', {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    console.log('✅ Steam library synced successfully:', {
                        newGames: data.new_games,
                        updatedGames: data.updated_games,
                        totalGames: data.total_games
                    });
                    
                    return {
                        success: true,
                        newGames: data.new_games || 0,
                        updatedGames: data.updated_games || 0,
                        totalGames: data.total_games || 0,
                        syncTime: data.sync_time,
                        message: `Library synced! Added ${data.new_games || 0} new games, updated ${data.updated_games || 0} games.`
                    };
                } else {
                    throw new Error(data.error || 'Failed to sync Steam library');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to sync Steam library');
            }
        } catch (error) {
            console.error('❌ Steam library sync failed:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Get user's Steam games with enhanced filtering
     */
    async getOwnedGames(filters = {}) {
        try {
            console.log('📚 Loading Steam games with filters:', filters);
            
            const queryParams = new URLSearchParams();
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.genre) queryParams.append('genre', filters.genre);
            if (filters.multiplayer) queryParams.append('multiplayer', 'true');
            if (filters.sort) queryParams.append('sort', filters.sort);
            
            const endpoint = `/api/steam/owned-games${queryParams.toString() ? `?${queryParams}` : ''}`;
            const response = await this.authenticatedRequest(endpoint);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    console.log(`✅ Loaded ${data.games.length} Steam games`);
                    
                    return {
                        success: true,
                        games: data.games || [],
                        total: data.total || 0,
                        steamConnected: data.steam_connected,
                        steamUsername: data.steam_username,
                        lastSynced: data.last_synced,
                        stats: this.calculateLibraryStats(data.games || [])
                    };
                } else {
                    throw new Error(data.error || 'Failed to load Steam games');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load Steam games');
            }
        } catch (error) {
            console.error('❌ Failed to load Steam games:', error);
            return {
                success: false,
                error: this.getErrorMessage(error),
                games: [],
                total: 0
            };
        }
    }

    /**
     * Get Steam connection status with detailed information
     */
    async getConnectionStatus() {
        try {
            const response = await this.authenticatedRequest('/api/steam/status');
            
            if (response.ok) {
                const data = await response.json();
                
                return {
                    success: true,
                    steamService: data.steam_service || {},
                    userConnection: data.user_connection || {},
                    syncStatus: data.sync_status || {},
                    canConnect: !data.user_connection?.connected,
                    canSync: data.sync_status?.can_sync || false,
                    cooldownRemaining: data.sync_status?.cooldown_remaining || 0
                };
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get Steam status');
            }
        } catch (error) {
            console.error('❌ Failed to get Steam status:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Validate Steam ID format with enhanced checks
     */
    validateSteamId(steamId) {
        if (!steamId || typeof steamId !== 'string') {
            return { 
                valid: false, 
                error: 'Steam ID is required and must be a string' 
            };
        }

        // Clean and normalize the input
        const cleanId = steamId.trim().replace(/\s+/g, '');
        
        // Check if it's exactly 17 digits
        if (!/^\d{17}$/.test(cleanId)) {
            return { 
                valid: false, 
                error: 'Steam ID must be exactly 17 digits (e.g., 76561198123456789)' 
            };
        }

        // Check if it starts with the typical Steam ID prefix
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
        
        // Format as: 76561-19812-3456789
        return `${steamId.slice(0, 5)}-${steamId.slice(5, 10)}-${steamId.slice(10)}`;
    }

    /**
     * Show Steam ID instructions to user
     */
    showSteamIdInstructions() {
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
     * Get user-friendly error message with context
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
            'server_error': 'Server error occurred. Please try again later.',
            'invalid_response': 'Received invalid response from Steam service.',
            'in_progress': 'A Steam operation is already in progress. Please wait.'
        };
        
        // Find matching error pattern
        for (const [key, value] of Object.entries(errorMappings)) {
            if (message.toLowerCase().includes(key.toLowerCase().replace('_', ' '))) {
                return value;
            }
        }
        
        // Handle specific HTTP status codes
        if (message.includes('401')) return 'Authentication expired. Please log in again.';
        if (message.includes('403')) return 'Access denied. Please check your permissions.';
        if (message.includes('404')) return 'Steam service not found. Please contact support.';
        if (message.includes('429')) return 'Too many requests. Please wait before trying again.';
        if (message.includes('500')) return 'Server error. Please try again later.';
        if (message.includes('502')) return 'Steam service temporarily unavailable.';
        if (message.includes('503')) return 'Steam service temporarily unavailable.';
        if (message.includes('504')) return 'Request timed out. Please try again.';
        
        // Return cleaned original message
        return message || 'An unexpected error occurred. Please try again.';
    }

    /**
     * Calculate comprehensive library statistics
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
     * Get Steam app image URLs
     */
    getSteamImageUrls(appId) {
        const baseUrl = 'https://steamcdn-a.akamaihd.net/steam/apps';
        
        return {
            header: `${baseUrl}/${appId}/header.jpg`,
            headerLarge: `${baseUrl}/${appId}/header_292x136.jpg`,
            capsule: `${baseUrl}/${appId}/capsule_184x69.jpg`,
            capsuleLarge: `${baseUrl}/${appId}/capsule_467x181.jpg`,
            icon: `${baseUrl}/${appId}/icon.jpg`,
            logo: `${baseUrl}/${appId}/logo.png`,
            library: `${baseUrl}/${appId}/library_600x900.jpg`,
            hero: `${baseUrl}/${appId}/page_bg_generated_v6b.jpg`
        };
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
}

// Create and export singleton instance
const steamService = new SteamService();
export default steamService;
export { SteamService };