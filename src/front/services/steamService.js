// src/front/services/steamService.js - Centralized Frontend Steam Service

import authService from '../store/authService.js';
import toast from 'react-hot-toast';

/**
 * Centralized Steam Service for Frontend
 * Provides unified interface for all Steam operations
 */
class SteamService {
    constructor() {
        this.backendUrl = import.meta.env.VITE_BACKEND_URL;
    }

    /**
     * Steam ID validation
     */
    validateSteamId(steamId) {
        if (!steamId || typeof steamId !== 'string') {
            return { valid: false, error: 'Steam ID is required' };
        }

        const cleanId = steamId.trim();
        
        if (!/^\d{17}$/.test(cleanId)) {
            return { 
                valid: false, 
                error: 'Steam ID must be exactly 17 digits (e.g., 76561198000000000)' 
            };
        }

        // Additional validation - Steam IDs start with specific patterns
        if (!cleanId.startsWith('765611')) {
            return {
                valid: false,
                error: 'Invalid Steam ID format. Most Steam IDs start with 765611...'
            };
        }

        return { valid: true, steamId: cleanId };
    }

    /**
     * Connect Steam account via OpenID
     */
    async connectViaOpenID(returnTo = '/profile') {
        try {
            console.log('🎮 Initiating Steam OpenID connection...');
            
            const response = await authService.authenticatedFetch(
                `${this.backendUrl}/api/auth/steam/login?return_to=${encodeURIComponent(returnTo)}`
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to initiate Steam connection');
            }
            
            const data = await response.json();
            
            if (!data.steam_auth_url) {
                throw new Error('No Steam auth URL received');
            }

            console.log('✅ Redirecting to Steam OpenID...');
            window.location.href = data.steam_auth_url;
            
        } catch (error) {
            console.error('❌ Steam OpenID connection failed:', error);
            throw new Error(`Steam connection failed: ${error.message}`);
        }
    }

    /**
     * Connect Steam account manually with Steam ID
     */
    async connectManually(steamId) {
        const validation = this.validateSteamId(steamId);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        try {
            console.log('🔗 Connecting Steam manually with ID:', validation.steamId);
            
            const response = await authService.authenticatedFetch(
                `${this.backendUrl}/api/auth/steam/connect`,
                {
                    method: 'POST',
                    body: JSON.stringify({ steam_id: validation.steamId })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                
                // Handle specific error cases
                if (response.status === 409) {
                    throw new Error('This Steam account is already connected to another user');
                } else if (response.status === 404) {
                    throw new Error('Steam profile not found. Please check your Steam ID');
                } else {
                    throw new Error(errorData.error || 'Failed to connect Steam account');
                }
            }

            const data = await response.json();
            console.log('✅ Steam account connected successfully');
            
            return {
                success: true,
                user: data.user,
                newGames: data.new_games || 0,
                updatedGames: data.updated_games || 0,
                message: data.message || 'Steam account connected successfully!'
            };
            
        } catch (error) {
            console.error('❌ Manual Steam connection failed:', error);
            throw error;
        }
    }

    /**
     * Disconnect Steam account
     */
    async disconnect() {
        try {
            console.log('🔌 Disconnecting Steam account...');
            
            const response = await authService.authenticatedFetch(
                `${this.backendUrl}/api/auth/steam/disconnect`,
                { method: 'POST' }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to disconnect Steam');
            }

            const data = await response.json();
            console.log('✅ Steam account disconnected');
            
            return {
                success: true,
                message: data.message || 'Steam account disconnected successfully'
            };
            
        } catch (error) {
            console.error('❌ Steam disconnect failed:', error);
            throw error;
        }
    }

    /**
     * Sync Steam library
     */
    async syncLibrary() {
        try {
            console.log('🔄 Syncing Steam library...');
            
            const response = await authService.authenticatedFetch(
                `${this.backendUrl}/api/steam/sync-games`,
                { method: 'POST' }
            );

            if (!response.ok) {
                const errorData = await response.json();
                
                if (response.status === 429) {
                    throw new Error('Please wait a few minutes before syncing again');
                } else if (response.status === 400) {
                    throw new Error('Steam account not connected');
                } else {
                    throw new Error(errorData.error || 'Failed to sync Steam library');
                }
            }

            const data = await response.json();
            console.log('✅ Steam library synced successfully');
            
            return {
                success: true,
                newGames: data.new_games || 0,
                updatedGames: data.updated_games || 0,
                totalGames: data.total_games || data.new_games + data.updated_games,
                message: data.message || 'Library synced successfully!'
            };
            
        } catch (error) {
            console.error('❌ Steam library sync failed:', error);
            throw error;
        }
    }

    /**
     * Get owned games
     */
    async getOwnedGames() {
        try {
            console.log('📚 Fetching owned games...');
            
            const response = await authService.authenticatedFetch(
                `${this.backendUrl}/api/steam/owned-games`
            );

            if (!response.ok) {
                const errorData = await response.json();
                
                if (response.status === 400) {
                    throw new Error('Steam account not connected');
                } else {
                    throw new Error(errorData.error || 'Failed to load game library');
                }
            }

            const data = await response.json();
            console.log(`✅ Loaded ${data.games?.length || 0} games`);
            
            return {
                success: true,
                games: data.games || [],
                total: data.total || 0,
                steamConnected: data.steam_connected || false,
                steamUsername: data.steam_username,
                lastSynced: data.last_synced
            };
            
        } catch (error) {
            console.error('❌ Failed to fetch owned games:', error);
            throw error;
        }
    }

    /**
     * Get Steam connection status
     */
    async getConnectionStatus() {
        try {
            const response = await authService.authenticatedFetch(
                `${this.backendUrl}/api/auth/steam/status`
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get Steam status');
            }

            const data = await response.json();
            return data.status;
            
        } catch (error) {
            console.error('❌ Failed to get Steam status:', error);
            throw error;
        }
    }

    /**
     * Get Steam profile information
     */
    async getProfile() {
        try {
            const response = await authService.authenticatedFetch(
                `${this.backendUrl}/api/steam/user-profile`
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get Steam profile');
            }

            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('❌ Failed to get Steam profile:', error);
            throw error;
        }
    }

    /**
     * Helper method to show Steam ID finder instructions
     */
    showSteamIdInstructions() {
        return {
            title: "How to find your Steam ID",
            steps: [
                "1. Open Steam and go to your profile",
                "2. Right-click on your profile and select 'Copy Page URL'",
                "3. Paste the URL - if it contains numbers after '/profiles/', that's your Steam ID",
                "4. If it contains a custom name, go to steamid.io and enter your profile URL",
                "5. Your Steam ID should be 17 digits starting with 765611..."
            ],
            example: "76561198000000000",
            note: "Your Steam profile must be public for this to work"
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
        return `${hours}h ${remainingMinutes}m`;
    }

    /**
     * Format last played date
     */
    formatLastPlayed(dateString) {
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }

    /**
     * Get error message for common Steam errors
     */
    getErrorMessage(error) {
        const message = error.message || error;
        
        // Map common errors to user-friendly messages
        const errorMap = {
            'Steam not connected': 'Please connect your Steam account first',
            'Recently synced': 'Please wait a few minutes before syncing again',
            'Steam profile not found': 'Steam profile not found. Please check your Steam ID and make sure your profile is public',
            'Invalid Steam ID': 'Please enter a valid 17-digit Steam ID',
            'already connected': 'This Steam account is already connected to another user',
            'timeout': 'Request timed out. Please check your internet connection and try again',
            'network': 'Network error. Please check your internet connection'
        };

        for (const [key, value] of Object.entries(errorMap)) {
            if (message.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }

        return message;
    }
}

// Export singleton instance
export default new SteamService();