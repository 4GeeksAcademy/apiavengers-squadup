// src/front/components/SteamConnectionManager.jsx - REFACTORED VERSION
// Now uses the useSteamConnection hook for all logic

import React from 'react';
import useSteamConnection from '../hooks/useSteamConnection';
import { formatLastPlayed } from '../utils/steamUtils.js';

const SteamConnectionManager = ({ 
    user, 
    onUserUpdate, 
    showLibraryButton = true,
    showSyncButton = true,
    compact = false,
    className = "" 
}) => {
    const {
        isConnected,
        loading,
        error,
        connectionMethod,
        steamId,
        showInstructions,
        cooldownSeconds,
        canSync,
        steamUsername,
        steamAvatar,
        totalGames,
        lastSynced,
        connectViaOpenID,
        connectManually,
        disconnect,
        syncLibrary,
        updateState,
        formatCooldown,
        getInstructions
    } = useSteamConnection(user);

    // Handle successful user updates by calling parent callback
    React.useEffect(() => {
        if (onUserUpdate && user) {
            // This effect ensures parent components get updated user data
            // The hook handles global state, but parent may need local updates
        }
    }, [user, onUserUpdate]);

    // Compact version for navbar/small spaces
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
                                onClick={() => syncLibrary()}
                                disabled={loading || !canSync}
                                className={`px-2 py-1 text-white text-xs rounded transition-colors disabled:opacity-50 ${
                                    !canSync 
                                        ? 'bg-orange-500 cursor-not-allowed' 
                                        : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                                title={!canSync ? `Cooldown: ${formatCooldown()}` : 'Sync library'}
                            >
                                {!canSync ? '⏳' : '🔄'}
                            </button>
                        )}
                        {showLibraryButton && (
                            <button
                                onClick={() => window.location.href = '/game-library'}
                                className="px-2 py-1 bg-coral-500 hover:bg-coral-600 text-white text-xs rounded transition-colors"
                            >
                                📚
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => connectViaOpenID()}
                        disabled={loading}
                        className="px-3 py-1 bg-coral-500 hover:bg-coral-600 text-white text-xs rounded transition-colors disabled:opacity-50"
                    >
                        Connect
                    </button>
                )}
            </div>
        );
    }

    // Full version for profile/settings pages
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
                        {steamAvatar && (
                            <img 
                                src={steamAvatar} 
                                alt="Steam Avatar" 
                                className="w-12 h-12 rounded-full border-2 border-white/20"
                            />
                        )}
                        <div>
                            <p className="text-white font-medium">
                                {steamUsername || 'Steam User'}
                            </p>
                            <p className="text-white/60 text-sm">
                                {totalGames} games in library
                            </p>
                            {lastSynced && (
                                <p className="text-white/50 text-xs">
                                    Last synced: {formatLastPlayed(lastSynced)}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {/* Sync Cooldown Notice */}
                    {!canSync && cooldownSeconds > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                                <span className="text-orange-400">⏳</span>
                                <div>
                                    <p className="text-orange-300 text-sm font-medium">
                                        Sync Cooldown Active
                                    </p>
                                    <p className="text-orange-400/80 text-xs">
                                        Next sync available in {formatCooldown()}
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
                                onClick={() => window.location.href = '/game-library'}
                                className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center gap-2"
                            >
                                📚 View Library
                            </button>
                        )}
                        {showSyncButton && (
                            <button 
                                onClick={() => syncLibrary()}
                                disabled={loading || !canSync}
                                className={`px-4 py-2 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 ${
                                    !canSync 
                                        ? 'bg-orange-500 cursor-not-allowed' 
                                        : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                            >
                                {loading ? (
                                    <>⏳ Syncing...</>
                                ) : !canSync ? (
                                    <>⏳ Cooldown ({formatCooldown()})</>
                                ) : (
                                    <>🔄 Sync Games</>
                                )}
                            </button>
                        )}
                        <button 
                            onClick={() => disconnect()}
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
                            onClick={() => updateState({ connectionMethod: 'openid' })}
                            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                connectionMethod === 'openid'
                                    ? 'bg-coral-500 text-white'
                                    : 'text-white/70 hover:text-white'
                            }`}
                        >
                            Steam Login
                        </button>
                        <button
                            onClick={() => updateState({ connectionMethod: 'manual' })}
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
                                onClick={() => connectViaOpenID()}
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
                                    onChange={(e) => updateState({ steamId: e.target.value })}
                                    placeholder="Enter your 17-digit Steam ID..."
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 transition-colors"
                                    disabled={loading}
                                />
                                {error && (
                                    <p className="text-red-400 text-sm mt-1">{error}</p>
                                )}
                            </div>
                            
                            <button 
                                onClick={() => connectManually()}
                                disabled={loading || !steamId.trim()}
                                className="w-full px-4 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
                            >
                                {loading ? 'Connecting...' : 'Connect Steam ID'}
                            </button>
                            
                            <button
                                onClick={() => updateState({ showInstructions: !showInstructions })}
                                className="w-full text-white/60 hover:text-white text-sm underline"
                            >
                                How to find my Steam ID?
                            </button>
                            
                            {showInstructions && (
                                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                    <h4 className="text-white font-medium mb-2">Finding your Steam ID:</h4>
                                    <ol className="text-white/70 text-sm space-y-1 list-decimal list-inside">
                                        {getInstructions().steps.map((step, index) => (
                                            <li key={index}>{step}</li>
                                        ))}
                                    </ol>
                                    <p className="text-white/50 text-xs mt-3">
                                        <strong>Note:</strong> {getInstructions().note}
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