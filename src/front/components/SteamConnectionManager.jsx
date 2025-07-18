// src/front/components/SteamConnectionManager.jsx - Unified Steam Connection Component

import React, { useState, useEffect } from 'react';
import steamService from '../services/steamService.js';
import toast from 'react-hot-toast';

/**
 * Unified Steam Connection Manager Component
 * Handles all Steam connection methods with consistent UI/UX
 */
const SteamConnectionManager = ({ 
    user, 
    onUserUpdate, 
    showLibraryButton = true,
    showSyncButton = true,
    compact = false,
    className = "" 
}) => {
    const [loading, setLoading] = useState(false);
    const [connectionMethod, setConnectionMethod] = useState('openid'); // 'openid' or 'manual'
    const [steamId, setSteamId] = useState('');
    const [showInstructions, setShowInstructions] = useState(false);
    const [error, setError] = useState('');

    const isConnected = user?.steam_connected || user?.is_steam_connected;

    // Clear error when connection method changes
    useEffect(() => {
        setError('');
        setSteamId('');
    }, [connectionMethod]);

    /**
     * Handle Steam connection via OpenID
     */
    const handleOpenIDConnect = async () => {
        setLoading(true);
        setError('');
        
        try {
            await steamService.connectViaOpenID(window.location.pathname);
            // Note: This will redirect, so no need for success handling
        } catch (error) {
            setError(steamService.getErrorMessage(error));
            toast.error(steamService.getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle manual Steam ID connection
     */
    const handleManualConnect = async () => {
        if (!steamId.trim()) {
            setError('Please enter your Steam ID');
            return;
        }

        setLoading(true);
        setError('');
        const loadingToast = toast.loading('Connecting Steam account...');
        
        try {
            const result = await steamService.connectManually(steamId);
            
            toast.dismiss(loadingToast);
            toast.success(`${result.message} Synced ${result.newGames} games!`);
            
            // Update user data
            if (onUserUpdate && result.user) {
                onUserUpdate(result.user);
            }
            
            setSteamId('');
            
        } catch (error) {
            toast.dismiss(loadingToast);
            const errorMessage = steamService.getErrorMessage(error);
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle Steam disconnection
     */
    const handleDisconnect = async () => {
        if (!window.confirm('Disconnect Steam account? This will clear your game library from SquadUp.')) {
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading('Disconnecting Steam...');
        
        try {
            const result = await steamService.disconnect();
            
            toast.dismiss(loadingToast);
            toast.success(result.message);
            
            // Update user data
            if (onUserUpdate) {
                onUserUpdate({ ...user, steam_connected: false, is_steam_connected: false });
            }
            
        } catch (error) {
            toast.dismiss(loadingToast);
            const errorMessage = steamService.getErrorMessage(error);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle library sync
     */
    const handleSync = async () => {
        if (!isConnected) {
            toast.error('Please connect your Steam account first');
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading('Syncing Steam library...');
        
        try {
            const result = await steamService.syncLibrary();
            
            toast.dismiss(loadingToast);
            toast.success(`${result.message} Found ${result.newGames} new games!`);
            
            // Refresh user data if callback provided
            if (onUserUpdate) {
                // You might want to fetch fresh user data here
                onUserUpdate({ 
                    ...user, 
                    steam_library_synced_at: new Date().toISOString(),
                    total_games: result.totalGames 
                });
            }
            
        } catch (error) {
            toast.dismiss(loadingToast);
            const errorMessage = steamService.getErrorMessage(error);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Navigate to game library
     */
    const handleViewLibrary = () => {
        window.location.href = '/game-library';
    };

    if (compact) {
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
                <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-sm font-medium">
                        {isConnected ? 'Steam Connected' : 'Steam Not Connected'}
                    </span>
                </div>
                
                {isConnected ? (
                    <div className="flex space-x-1">
                        {showSyncButton && (
                            <button
                                onClick={handleSync}
                                disabled={loading}
                                className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors disabled:opacity-50"
                            >
                                🔄
                            </button>
                        )}
                        {showLibraryButton && (
                            <button
                                onClick={handleViewLibrary}
                                className="px-2 py-1 bg-coral-500 hover:bg-coral-600 text-white text-xs rounded transition-colors"
                            >
                                📚
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={handleOpenIDConnect}
                        disabled={loading}
                        className="px-3 py-1 bg-coral-500 hover:bg-coral-600 text-white text-xs rounded transition-colors disabled:opacity-50"
                    >
                        Connect
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={`p-6 bg-white/5 rounded-xl border border-white/10 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium text-lg">Steam Integration</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isConnected 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                    {isConnected ? 'Connected' : 'Not Connected'}
                </span>
            </div>
            
            {isConnected ? (
                /* Connected State */
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        {user?.steam_avatar_url && (
                            <img 
                                src={user.steam_avatar_url} 
                                alt="Steam Avatar" 
                                className="w-12 h-12 rounded-full border-2 border-white/20"
                            />
                        )}
                        <div>
                            <p className="text-white font-medium">
                                {user?.steam_username || 'Steam User'}
                            </p>
                            <p className="text-white/60 text-sm">
                                {user?.total_games || 0} games in library
                            </p>
                            {user?.steam_library_synced_at && (
                                <p className="text-white/50 text-xs">
                                    Last synced: {steamService.formatLastPlayed(user.steam_library_synced_at)}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {showLibraryButton && (
                            <button 
                                onClick={handleViewLibrary}
                                className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center gap-2"
                            >
                                📚 View Library
                            </button>
                        )}
                        {showSyncButton && (
                            <button 
                                onClick={handleSync}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
                            >
                                🔄 {loading ? 'Syncing...' : 'Sync Games'}
                            </button>
                        )}
                        <button 
                            onClick={handleDisconnect}
                            disabled={loading}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
                        >
                            🔌 Disconnect
                        </button>
                    </div>
                </div>
            ) : (
                /* Not Connected State */
                <div className="space-y-4">
                    <p className="text-white/70 text-sm">
                        Connect your Steam account to sync your game library and find games to play with friends.
                    </p>
                    
                    {/* Connection Method Selector */}
                    <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
                        <button
                            onClick={() => setConnectionMethod('openid')}
                            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                connectionMethod === 'openid'
                                    ? 'bg-coral-500 text-white'
                                    : 'text-white/70 hover:text-white'
                            }`}
                        >
                            Steam Login
                        </button>
                        <button
                            onClick={() => setConnectionMethod('manual')}
                            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                connectionMethod === 'manual'
                                    ? 'bg-coral-500 text-white'
                                    : 'text-white/70 hover:text-white'
                            }`}
                        >
                            Steam ID
                        </button>
                    </div>
                    
                    {connectionMethod === 'openid' ? (
                        /* OpenID Connection */
                        <div className="space-y-3">
                            <button 
                                onClick={handleOpenIDConnect}
                                disabled={loading}
                                className="w-full px-4 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                🎮 {loading ? 'Connecting...' : 'Connect via Steam'}
                            </button>
                            <p className="text-white/50 text-xs text-center">
                                Secure login through Steam's official system
                            </p>
                        </div>
                    ) : (
                        /* Manual Steam ID Connection */
                        <div className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    value={steamId}
                                    onChange={(e) => setSteamId(e.target.value)}
                                    placeholder="Enter your 17-digit Steam ID..."
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 transition-colors"
                                    disabled={loading}
                                />
                                {error && (
                                    <p className="text-red-400 text-sm mt-1">{error}</p>
                                )}
                            </div>
                            
                            <button 
                                onClick={handleManualConnect}
                                disabled={loading || !steamId.trim()}
                                className="w-full px-4 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
                            >
                                {loading ? 'Connecting...' : 'Connect Steam ID'}
                            </button>
                            
                            <button
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="w-full text-white/60 hover:text-white text-sm underline"
                            >
                                How to find my Steam ID?
                            </button>
                            
                            {showInstructions && (
                                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                    <h4 className="text-white font-medium mb-2">Finding your Steam ID:</h4>
                                    <ol className="text-white/70 text-sm space-y-1 list-decimal list-inside">
                                        <li>Open Steam and go to your profile</li>
                                        <li>Right-click and select "Copy Page URL"</li>
                                        <li>If the URL contains numbers after '/profiles/', that's your Steam ID</li>
                                        <li>If it has a custom name, visit <span className="text-coral-400">steamid.io</span> and paste your URL</li>
                                        <li>Your Steam ID should be 17 digits starting with 765611...</li>
                                    </ol>
                                    <p className="text-white/50 text-xs mt-3">
                                        <strong>Note:</strong> Your Steam profile must be public for this to work
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SteamConnectionManager;