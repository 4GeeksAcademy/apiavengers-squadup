// src/front/components/SteamConnectionManager.jsx - Enhanced with Sync Cooldown Management

import React, { useState, useEffect } from 'react';
import steamService from '../services/steamService.js';
import { formatLastPlayed } from '../utils/steamUtils.js';
import toast from 'react-hot-toast';

/**
 * Unified Steam Connection Manager Component
 * Handles all Steam connection methods with sync cooldown management
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
    const [connectionMethod, setConnectionMethod] = useState('openid');
    const [steamId, setSteamId] = useState('');
    const [showInstructions, setShowInstructions] = useState(false);
    const [error, setError] = useState('');
    
    // Sync cooldown management
    const [syncCooldownEnd, setSyncCooldownEnd] = useState(null);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);

    const isConnected = user?.steam_connected || user?.is_steam_connected;

    // Clear error when connection method changes
    useEffect(() => {
        setError('');
        setSteamId('');
    }, [connectionMethod]);

    // Cooldown timer effect
    useEffect(() => {
        let interval;
        
        if (syncCooldownEnd) {
            interval = setInterval(() => {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((syncCooldownEnd - now) / 1000));
                setCooldownSeconds(remaining);
                
                if (remaining <= 0) {
                    setSyncCooldownEnd(null);
                    setCooldownSeconds(0);
                }
            }, 1000);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [syncCooldownEnd]);

    // Initialize cooldown from last sync time
    useEffect(() => {
        if (user?.steam_library_synced_at && !syncCooldownEnd) {
            const lastSync = new Date(user.steam_library_synced_at).getTime();
            const cooldownDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
            const cooldownEnd = lastSync + cooldownDuration;
            const now = Date.now();
            
            if (now < cooldownEnd) {
                setSyncCooldownEnd(cooldownEnd);
                setCooldownSeconds(Math.ceil((cooldownEnd - now) / 1000));
            }
        }
    }, [user?.steam_library_synced_at]);

    /**
     * Parse cooldown time from error message
     */
    const parseCooldownFromError = (errorMessage) => {
        const match = errorMessage.match(/wait (\d+) seconds/);
        if (match) {
            const seconds = parseInt(match[1]);
            const cooldownEnd = Date.now() + (seconds * 1000);
            setSyncCooldownEnd(cooldownEnd);
            setCooldownSeconds(seconds);
            return seconds;
        }
        return null;
    };

    /**
     * Format cooldown display
     */
    const formatCooldown = (seconds) => {
        if (seconds <= 0) return '';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    };

    /**
     * Handle Steam connection via OpenID
     */
    const handleOpenIDConnect = async () => {
        setLoading(true);
        setError('');
        
        try {
            await steamService.connectViaOpenID(window.location.pathname);
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
            
            if (onUserUpdate) {
                onUserUpdate({ ...user, steam_connected: false, is_steam_connected: false });
            }
            
            // Clear cooldown when disconnecting
            setSyncCooldownEnd(null);
            setCooldownSeconds(0);
            
        } catch (error) {
            toast.dismiss(loadingToast);
            const errorMessage = steamService.getErrorMessage(error);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle library sync with enhanced cooldown management
     */
    const handleSync = async () => {
        if (!isConnected) {
            toast.error('Please connect your Steam account first');
            return;
        }

        if (cooldownSeconds > 0) {
            toast.error(`Please wait ${formatCooldown(cooldownSeconds)} before syncing again`);
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading('Syncing Steam library...');
        
        try {
            const result = await steamService.syncLibrary();
            
            toast.dismiss(loadingToast);
            toast.success(`${result.message} Found ${result.newGames} new games!`);
            
            // Set cooldown after successful sync
            const cooldownEnd = Date.now() + (5 * 60 * 1000); // 5 minutes
            setSyncCooldownEnd(cooldownEnd);
            setCooldownSeconds(300);
            
            if (onUserUpdate) {
                onUserUpdate({ 
                    ...user, 
                    steam_library_synced_at: new Date().toISOString(),
                    total_games: result.totalGames 
                });
            }
            
        } catch (error) {
            toast.dismiss(loadingToast);
            const errorMessage = steamService.getErrorMessage(error);
            
            // Parse cooldown from error if present
            const cooldownFromError = parseCooldownFromError(errorMessage);
            
            if (cooldownFromError) {
                toast.error(`Sync on cooldown. Please wait ${formatCooldown(cooldownFromError)}`);
            } else {
                toast.error(errorMessage);
            }
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
                                disabled={loading || cooldownSeconds > 0}
                                className={`px-2 py-1 text-white text-xs rounded transition-colors disabled:opacity-50 ${
                                    cooldownSeconds > 0 
                                        ? 'bg-orange-500 cursor-not-allowed' 
                                        : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                                title={cooldownSeconds > 0 ? `Cooldown: ${formatCooldown(cooldownSeconds)}` : 'Sync library'}
                            >
                                {cooldownSeconds > 0 ? '⏳' : '🔄'}
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
                                    Last synced: {formatLastPlayed(user.steam_library_synced_at)}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {/* Sync Cooldown Notice */}
                    {cooldownSeconds > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                                <span className="text-orange-400">⏳</span>
                                <div>
                                    <p className="text-orange-300 text-sm font-medium">
                                        Sync Cooldown Active
                                    </p>
                                    <p className="text-orange-400/80 text-xs">
                                        Next sync available in {formatCooldown(cooldownSeconds)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 w-full bg-orange-500/20 rounded-full h-1.5">
                                <div 
                                    className="bg-orange-400 h-1.5 rounded-full transition-all duration-1000"
                                    style={{ 
                                        width: `${Math.max(0, 100 - ((300 - cooldownSeconds) / 300 * 100))}%` 
                                    }}
                                ></div>
                            </div>
                        </div>
                    )}
                    
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
                                disabled={loading || cooldownSeconds > 0}
                                className={`px-4 py-2 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 ${
                                    cooldownSeconds > 0 
                                        ? 'bg-orange-500 cursor-not-allowed' 
                                        : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                            >
                                {loading ? (
                                    <>⏳ Syncing...</>
                                ) : cooldownSeconds > 0 ? (
                                    <>⏳ Cooldown ({formatCooldown(cooldownSeconds)})</>
                                ) : (
                                    <>🔄 Sync Games</>
                                )}
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