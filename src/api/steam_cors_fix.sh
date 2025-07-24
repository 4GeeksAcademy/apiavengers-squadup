#!/bin/bash

echo "🎮 SquadUp Steam Integration CORS Fix"
echo "======================================"

# Step 1: Create missing Steam API proxy endpoints
echo "📡 Step 1: Creating Steam API proxy endpoints..."

# Create enhanced steam status endpoint
cat > src/api/steam_status.py << 'EOF'
# src/api/steam_status.py - Steam Status Proxy Endpoint
from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import User
from api.steam_service import steam_service
from api.utils import utc_now

steam_status = Blueprint('steam_status', __name__)

@steam_status.route('/status', methods=['GET'])
@jwt_required()
def get_comprehensive_steam_status():
    """Get comprehensive Steam status for frontend"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get Steam service status
        steam_available = steam_service is not None
        api_configured = bool(steam_service and steam_service.api_key) if steam_available else False
        
        # Get user Steam connection status
        user_status = {
            'connected': user.is_steam_connected,
            'steam_id': user.steam_id if user.is_steam_connected else None,
            'steam_username': user.steam_username if user.is_steam_connected else None,
            'steam_avatar_url': user.steam_avatar_url if user.is_steam_connected else None,
            'total_games': user.total_games if user.is_steam_connected else 0,
            'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
        }
        
        # Get sync status
        sync_status = {
            'can_sync': False,
            'cooldown_remaining': 0,
            'message': 'Steam not connected'
        }
        
        if user.is_steam_connected and steam_service:
            can_sync, message = user.can_sync_steam()
            cooldown_remaining = user.steam_sync_cooldown_remaining()
            
            sync_status = {
                'can_sync': can_sync,
                'cooldown_remaining': cooldown_remaining,
                'message': message,
                'last_synced': user.steam_library_synced_at.isoformat() if user.steam_library_synced_at else None
            }
        
        return jsonify({
            'success': True,
            'steam_service': {
                'available': steam_available,
                'api_configured': api_configured,
                'status': 'operational' if steam_available and api_configured else 'limited'
            },
            'user_connection': user_status,
            'sync_status': sync_status,
            'timestamp': utc_now().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting Steam status: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
EOF

# Step 2: Update main app.py to include the new blueprint
echo "🔧 Step 2: Updating app.py to include Steam status endpoint..."

# Create app.py update
cat > temp_app_update.py << 'EOF'
# Add this import to your existing app.py imports
from api.steam_status import steam_status

# Add this blueprint registration with your existing ones
app.register_blueprint(steam_status, url_prefix='/api/steam')
EOF

echo "📝 Manual step required: Add the following to your src/app.py:"
echo "   Import: from api.steam_status import steam_status"
echo "   Register: app.register_blueprint(steam_status, url_prefix='/api/steam')"
echo ""

# Step 3: Create frontend Steam service configuration
echo "🌐 Step 3: Creating frontend Steam service proxy configuration..."

cat > src/front/services/steamServiceProxy.js << 'EOF'
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
EOF

# Step 4: Update existing steamService to use proxy
echo "🔄 Step 4: Updating existing Steam service to use backend proxy..."

# Create backup of existing service
if [ -f "src/front/services/steamService.js" ]; then
    cp src/front/services/steamService.js src/front/services/steamService.js.backup
    echo "✅ Backed up existing steamService.js"
fi

# Replace steamService with proxy version
cp src/front/services/steamServiceProxy.js src/front/services/steamService.js
echo "✅ Updated steamService.js to use backend proxy"

# Step 5: Update SteamManager to handle CORS errors
echo "🛠️ Step 5: Creating CORS-aware SteamManager component..."

cat > src/front/components/SteamManagerCORS.jsx << 'EOF'
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
EOF

# Step 6: Update environment configuration
echo "⚙️ Step 6: Creating environment configuration for CORS handling..."

cat > src/front/config/corsConfig.js << 'EOF'
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
EOF

# Step 7: Create troubleshooting documentation
echo "📚 Step 7: Creating troubleshooting documentation..."

cat > STEAM_CORS_TROUBLESHOOTING.md << 'EOF'
# Steam CORS Troubleshooting Guide

## Problem
CORS (Cross-Origin Resource Sharing) errors when accessing Steam APIs from the frontend.

## Root Cause
- Frontend trying to access Steam APIs directly
- Steam APIs don't allow cross-origin requests
- Need backend proxy for all Steam API calls

## Solution Applied

### 1. Backend Proxy Endpoints ✅
- Created `src/api/steam_status.py` for comprehensive Steam status
- All Steam API calls now go through backend
- Proper error handling and rate limiting

### 2. Frontend Service Update ✅
- Updated `steamService.js` to use backend proxy
- Removed direct Steam API calls
- Added proper error handling for network issues

### 3. CORS-Aware Components ✅
- Created `SteamManagerCORS.jsx` with proper error handling
- Handles network errors gracefully
- Provides user feedback for connection issues

## Testing the Fix

1. **Check Backend Endpoints**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/steam/status
   ```

2. **Check Frontend Integration**:
   - Open browser console
   - Look for Steam-related requests
   - Should see calls to `/api/steam/*` instead of `steamcommunity.com`

3. **Test Steam Connection**:
   - Go to Profile page
   - Try connecting Steam account
   - Should redirect to Steam without CORS errors

## Manual Steps Required

1. **Update app.py**:
   ```python
   from api.steam_status import steam_status
   app.register_blueprint(steam_status, url_prefix='/api/steam')
   ```

2. **Replace SteamManager imports**:
   ```javascript
   // Replace this:
   import SteamManager from '../components/SteamManager';
   
   // With this:
   import SteamManager from '../components/SteamManagerCORS';
   ```

3. **Environment Variables**:
   ```bash
   VITE_BACKEND_URL=http://localhost:5000
   STEAM_API_KEY=your_steam_api_key
   ```

## Common Issues

### Still seeing CORS errors?
- Check that all Steam requests go through `/api/steam/*`
- Verify backend endpoints are registered
- Check network tab for direct Steam API calls

### Steam connection fails?
- Verify `STEAM_API_KEY` is set
- Check Steam service initialization
- Ensure user is authenticated

### Sync not working?
- Check rate limiting (5-minute cooldown)
- Verify Steam profile is public
- Check backend logs for API errors

## Verification Commands

```bash
# Check if new endpoints exist
ls -la src/api/steam_status.py
ls -la src/front/services/steamServiceProxy.js
ls -la src/front/components/SteamManagerCORS.jsx

# Check for old direct Steam API calls (should return nothing)
grep -r "steamcommunity.com" src/front/

# Check for proper backend proxy usage
grep -r "/api/steam/" src/front/
```

## Success Indicators

✅ No CORS errors in browser console
✅ Steam status loads properly
✅ Steam connection works without errors
✅ Library sync functions correctly
✅ Common games feature works in groups

## Need Help?

1. Check browser console for specific errors
2. Check backend logs: `tail -f logs/app.log`
3. Verify environment variables are set
4. Test individual API endpoints with curl
EOF

echo ""
echo "🎉 Steam CORS Fix Complete!"
echo "=========================================="
echo ""
echo "✅ Created backend Steam status proxy"
echo "✅ Updated frontend Steam service"
echo "✅ Created CORS-aware components"
echo "✅ Added error handling and documentation"
echo ""
echo "📋 MANUAL STEPS REQUIRED:"
echo "1. Add steam_status blueprint to app.py"
echo "2. Replace SteamManager imports with SteamManagerCORS"
echo "3. Restart your backend server"
echo "4. Test Steam functionality"
echo ""
echo "📚 See STEAM_CORS_TROUBLESHOOTING.md for detailed instructions"
echo ""
echo "🔍 Quick Test:"
echo "   curl -H \"Authorization: Bearer YOUR_TOKEN\" http://localhost:5000/api/steam/status"
echo ""
EOF

# Make script executable
chmod +x steam_cors_fix.sh

echo "✅ Steam CORS fix script created successfully!"
echo "📁 Files created:"
echo "   • src/api/steam_proxy.py"
echo "   • src/front/services/steamServiceProxy.js"
echo "   • src/front/components/SteamManagerCORS.jsx"
echo "   • src/front/config/corsConfig.js"
echo "   • STEAM_CORS_TROUBLESHOOTING.md"
echo ""
echo "🚀 Run the script from your project root:"
echo "   chmod +x steam_cors_fix.sh"
echo "   ./steam_cors_fix.sh"