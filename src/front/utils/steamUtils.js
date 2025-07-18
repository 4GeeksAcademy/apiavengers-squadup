// src/front/utils/steamUtils.js - Steam Utility Functions

/**
 * Steam-related utility functions
 * Provides common formatting, validation, and helper functions
 */

/**
 * Validate Steam ID format
 */
export const validateSteamId = (steamId) => {
    if (!steamId || typeof steamId !== 'string') {
        return { valid: false, error: 'Steam ID is required' };
    }

    const cleanId = steamId.trim();
    
    if (!/^\d{17}$/.test(cleanId)) {
        return { 
            valid: false, 
            error: 'Steam ID must be exactly 17 digits' 
        };
    }

    if (!cleanId.startsWith('765611')) {
        return {
            valid: false,
            error: 'Invalid Steam ID format. Most Steam IDs start with 765611...'
        };
    }

    return { valid: true, steamId: cleanId };
};

/**
 * Extract Steam ID from various Steam URL formats
 */
export const extractSteamIdFromUrl = (url) => {
    if (!url) return null;
    
    // Handle direct Steam ID (17 digits)
    const directMatch = url.match(/^\d{17}$/);
    if (directMatch) return url;
    
    // Handle profile URLs with Steam ID
    const profileMatch = url.match(/steamcommunity\.com\/profiles\/(\d{17})/);
    if (profileMatch) return profileMatch[1];
    
    // Handle Steam ID URLs
    const steamIdMatch = url.match(/steamcommunity\.com\/id\/([^\/]+)/);
    if (steamIdMatch) {
        // This would need to be resolved via Steam API or steamid.io
        return null; // Can't directly convert custom URLs
    }
    
    return null;
};

/**
 * Format playtime in minutes to human readable format
 */
export const formatPlaytime = (minutes) => {
    if (!minutes || minutes === 0) return 'Never played';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 1) return `${minutes}m`;
    if (remainingMinutes === 0) return `${hours}h`;
    if (hours < 100) return `${hours}h ${remainingMinutes}m`;
    
    // For very high hours, just show hours
    return `${hours}h`;
};

/**
 * Format playtime for detailed stats
 */
export const formatPlaytimeDetailed = (minutes) => {
    if (!minutes || minutes === 0) return { text: 'Never played', hours: 0, minutes: 0 };
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return {
        text: formatPlaytime(minutes),
        hours,
        minutes: remainingMinutes,
        totalMinutes: minutes
    };
};

/**
 * Format last played date to relative time
 */
export const formatLastPlayed = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
};

/**
 * Get Steam app image URLs
 */
export const getSteamImageUrls = (appId) => {
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
};

/**
 * Create safe image fallback for games
 */
export const createGameImageFallback = (gameName, appId) => {
    const safeGameName = (gameName || 'Unknown Game').replace(/[^\w\s-]/g, '').slice(0, 20);
    
    const svgContent = `
        <svg width="460" height="215" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="gameBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#334155;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#gameBg)"/>
            <rect x="15" y="15" width="430" height="185" fill="#475569" stroke="#64748b" stroke-width="1" rx="8" opacity="0.8"/>
            <text x="50%" y="35%" text-anchor="middle" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
                🎮 ${safeGameName}
            </text>
            <text x="50%" y="55%" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="12">
                Steam Game
            </text>
            <text x="50%" y="70%" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="10">
                App ID: ${appId || 'Unknown'}
            </text>
            <text x="50%" y="80%" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="10">
                Image Not Available
            </text>
        </svg>
    `;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
};

/**
 * Categorize games by play status
 */
export const categorizeGamesByPlaytime = (games) => {
    const categories = {
        unplayed: [],
        lightlyPlayed: [], // < 5 hours
        moderatelyPlayed: [], // 5-50 hours
        heavilyPlayed: [], // 50+ hours
    };
    
    games.forEach(game => {
        const hours = Math.floor((game.playtime_forever || game.hours_played || 0) / 60);
        
        if (hours === 0) {
            categories.unplayed.push(game);
        } else if (hours < 5) {
            categories.lightlyPlayed.push(game);
        } else if (hours < 50) {
            categories.moderatelyPlayed.push(game);
        } else {
            categories.heavilyPlayed.push(game);
        }
    });
    
    return categories;
};

/**
 * Calculate library statistics
 */
export const calculateLibraryStats = (games) => {
    if (!games || games.length === 0) {
        return {
            totalGames: 0,
            totalPlaytime: 0,
            averagePlaytime: 0,
            mostPlayedGame: null,
            unplayedCount: 0,
            multiplayerCount: 0,
            genreDistribution: {}
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
    
    // Calculate genre distribution
    const genreDistribution = {};
    games.forEach(game => {
        if (game.genres && Array.isArray(game.genres)) {
            game.genres.forEach(genre => {
                genreDistribution[genre] = (genreDistribution[genre] || 0) + 1;
            });
        }
    });
    
    return {
        totalGames: games.length,
        totalPlaytime: Math.floor(totalPlaytime / 60), // Convert to hours
        averagePlaytime: Math.floor(totalPlaytime / games.length / 60), // Hours per game
        mostPlayedGame,
        unplayedCount,
        multiplayerCount,
        genreDistribution: Object.entries(genreDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10) // Top 10 genres
            .reduce((obj, [genre, count]) => ({ ...obj, [genre]: count }), {})
    };
};

/**
 * Filter games by criteria
 */
export const filterGames = (games, filters) => {
    if (!games || games.length === 0) return [];
    
    return games.filter(game => {
        // Search filter
        if (filters.search) {
            const search = filters.search.toLowerCase();
            if (!game.name.toLowerCase().includes(search)) {
                return false;
            }
        }
        
        // Genre filter
        if (filters.genre && filters.genre !== '') {
            if (!game.genres || !game.genres.includes(filters.genre)) {
                return false;
            }
        }
        
        // Multiplayer filter
        if (filters.multiplayerOnly) {
            if (!game.multiplayer && !game.co_op) {
                return false;
            }
        }
        
        // Playtime filter
        if (filters.playtimeRange) {
            const hours = Math.floor((game.playtime_forever || game.hours_played || 0) / 60);
            switch (filters.playtimeRange) {
                case 'unplayed':
                    if (hours > 0) return false;
                    break;
                case 'light':
                    if (hours === 0 || hours >= 5) return false;
                    break;
                case 'moderate':
                    if (hours < 5 || hours >= 50) return false;
                    break;
                case 'heavy':
                    if (hours < 50) return false;
                    break;
            }
        }
        
        return true;
    });
};

/**
 * Sort games by criteria
 */
export const sortGames = (games, sortBy) => {
    if (!games || games.length === 0) return [];
    
    const sorted = [...games];
    
    switch (sortBy) {
        case 'name':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
            
        case 'playtime':
        case 'hours':
            return sorted.sort((a, b) => {
                const aHours = a.playtime_forever || a.hours_played || 0;
                const bHours = b.playtime_forever || b.hours_played || 0;
                return bHours - aHours;
            });
            
        case 'recent':
        case 'last_played':
            return sorted.sort((a, b) => {
                if (!a.last_played && !b.last_played) return 0;
                if (!a.last_played) return 1;
                if (!b.last_played) return -1;
                return new Date(b.last_played) - new Date(a.last_played);
            });
            
        case 'alphabetical':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
            
        case 'release_date':
            return sorted.sort((a, b) => {
                if (!a.release_date && !b.release_date) return 0;
                if (!a.release_date) return 1;
                if (!b.release_date) return -1;
                return new Date(b.release_date) - new Date(a.release_date);
            });
            
        default:
            return sorted;
    }
};

/**
 * Get available genres from games list
 */
export const extractGenres = (games) => {
    if (!games || games.length === 0) return [];
    
    const genreSet = new Set();
    
    games.forEach(game => {
        if (game.genres && Array.isArray(game.genres)) {
            game.genres.forEach(genre => genreSet.add(genre));
        }
    });
    
    return Array.from(genreSet).sort();
};

/**
 * Check if Steam connection is healthy
 */
export const checkSteamConnection = (user) => {
    return {
        isConnected: user?.steam_connected || user?.is_steam_connected || false,
        hasUsername: !!(user?.steam_username),
        hasAvatar: !!(user?.steam_avatar_url),
        hasGames: (user?.total_games || 0) > 0,
        lastSynced: user?.steam_library_synced_at,
        isHealthy: function() {
            return this.isConnected && this.hasUsername && this.hasGames;
        }
    };
};

/**
 * Steam error messages mapping
 */
export const STEAM_ERROR_MESSAGES = {
    INVALID_ID: 'Please enter a valid 17-digit Steam ID',
    NOT_CONNECTED: 'Steam account not connected',
    ALREADY_CONNECTED: 'This Steam account is already connected to another user',
    PROFILE_NOT_FOUND: 'Steam profile not found. Make sure your profile is public',
    SYNC_RATE_LIMIT: 'Please wait a few minutes before syncing again',
    NETWORK_ERROR: 'Network error. Please check your connection',
    AUTHENTICATION_FAILED: 'Steam authentication failed',
    CONNECTION_FAILED: 'Failed to connect Steam account',
    SYNC_FAILED: 'Failed to sync Steam library'
};

/**
 * Get user-friendly error message
 */
export const getSteamErrorMessage = (error) => {
    const message = error.message || error || '';
    
    for (const [key, value] of Object.entries(STEAM_ERROR_MESSAGES)) {
        if (message.toLowerCase().includes(key.toLowerCase().replace('_', ' '))) {
            return value;
        }
    }
    
    return message || 'An unknown error occurred';
};

/**
 * Steam profile URL generators
 */
export const getSteamUrls = (steamId, steamUsername) => {
    if (!steamId) return {};
    
    return {
        profile: `https://steamcommunity.com/profiles/${steamId}`,
        games: `https://steamcommunity.com/profiles/${steamId}/games/?tab=all`,
        screenshots: `https://steamcommunity.com/profiles/${steamId}/screenshots/`,
        inventory: `https://steamcommunity.com/profiles/${steamId}/inventory/`,
        badges: `https://steamcommunity.com/profiles/${steamId}/badges/`,
        groups: `https://steamcommunity.com/profiles/${steamId}/groups/`
    };
};