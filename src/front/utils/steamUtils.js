// src/front/utils/steamUtils.js - Steam Utility Functions

/**
 * Format playtime in minutes to human readable format
 */
export const formatPlaytime = (minutes) => {
    if (!minutes || minutes === 0) return '0h';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) return `${remainingMinutes}m`;
    if (remainingMinutes === 0) return `${hours}h`;
    
    return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format last played date to relative time
 */
export const formatLastPlayed = (dateString) => {
    if (!dateString) return 'Never';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        
        return `${Math.floor(diffDays / 365)} years ago`;
    } catch (error) {
        return 'Unknown';
    }
};

/**
 * Create safe image fallback for games
 */
export const createGameImageFallback = (gameName, appId) => {
    const svgContent = `
        <svg width="460" height="215" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#1e293b"/>
            <rect x="10" y="10" width="440" height="195" fill="#334155" stroke="#475569" stroke-width="2" rx="8"/>
            <text x="50%" y="45%" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
                🎮 ${gameName.slice(0, 20)}
            </text>
            <text x="50%" y="65%" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="12">
                Game Image
            </text>
        </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svgContent)}`;
};

/**
 * Calculate library statistics
 */
export const calculateLibraryStats = (games) => {
    if (!games || games.length === 0) {
        return {
            totalGames: 0,
            multiplayerCount: 0,
            totalPlaytime: 0,
            unplayedCount: 0,
            mostPlayedGame: null
        };
    }
    
    const totalGames = games.length;
    const multiplayerCount = games.filter(g => g.multiplayer || g.co_op).length;
    const totalPlaytime = games.reduce((sum, g) => sum + (g.playtime_forever || g.hours_played || 0), 0);
    const unplayedCount = games.filter(g => (g.playtime_forever || g.hours_played || 0) === 0).length;
    const mostPlayedGame = games.reduce((prev, current) => 
        (prev.playtime_forever || prev.hours_played || 0) > (current.playtime_forever || current.hours_played || 0) 
            ? prev : current, games[0]);
    
    return {
        totalGames,
        multiplayerCount,
        totalPlaytime: Math.floor(totalPlaytime / 60), // Convert to hours
        unplayedCount,
        mostPlayedGame
    };
};

/**
 * Filter games by criteria
 */
export const filterGames = (games, filters) => {
    return games.filter(game => {
        if (filters.search && !game.name.toLowerCase().includes(filters.search.toLowerCase())) {
            return false;
        }
        
        if (filters.genre && (!game.genres || !game.genres.includes(filters.genre))) {
            return false;
        }
        
        if (filters.multiplayerOnly && !game.multiplayer && !game.co_op) {
            return false;
        }
        
        return true;
    });
};

/**
 * Sort games by criteria
 */
export const sortGames = (games, sortBy) => {
    return [...games].sort((a, b) => {
        switch (sortBy) {
            case 'playtime':
                return (b.playtime_forever || b.hours_played || 0) - (a.playtime_forever || a.hours_played || 0);
            case 'recent':
                const aDate = new Date(a.last_played || 0);
                const bDate = new Date(b.last_played || 0);
                return bDate - aDate;
            case 'release_date':
                const aRelease = new Date(a.release_date || 0);
                const bRelease = new Date(b.release_date || 0);
                return bRelease - aRelease;
            case 'name':
            default:
                return a.name.localeCompare(b.name);
        }
    });
};

/**
 * Extract genres from games list
 */
export const extractGenres = (games) => {
    const genreSet = new Set();
    games.forEach(game => {
        if (game.genres) {
            game.genres.forEach(genre => genreSet.add(genre));
        }
    });
    return Array.from(genreSet).sort();
};