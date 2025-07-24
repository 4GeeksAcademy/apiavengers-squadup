// src/front/config/corsConfig.js - CORS Configuration for Steam Integration

const corsConfig = {
    // Backend API base URL
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
    
    // Steam API endpoints (all go through backend proxy)
    steamEndpoints: {
        status: '/api/steam/status',
        connect: '/api/auth/steam/login',
        disconnect: '/api/auth/steam/disconnect',
        sync: '/api/steam/sync-games',
        games: '/api/steam/owned-games',
        commonGames: '/api/gaming/groups/:groupId/common-games'
    },
    
    // Request configuration
    requestConfig: {
        timeout: 30000, // 30 seconds
        retries: 3,
        retryDelay: 1000
    },
    
    // Error handling
    errorMessages: {
        cors: 'Network configuration error. Steam features may not work properly.',
        timeout: 'Request timed out. Please check your connection.',
        network: 'Network error. Please check your internet connection.',
        server: 'Server error. Please try again later.'
    }
};

export default corsConfig;
