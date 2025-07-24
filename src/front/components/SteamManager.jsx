// src/front/components/SteamManager.jsx - Updated to work with your existing backend
import React, { useState, useEffect } from 'react';
import useSteamConnection from '../hooks/useSteamConnection.js';

// Inline Steam components to replace missing imports
const SteamStatusIndicator = ({ isConnected, isLoading, compact = false, className = '' }) => {
    const getStatus = () => {
        if (isLoading) {
            return { text: 'Loading...', color: 'text-yellow-400', icon: '⏳' };
        }
        if (!isConnected) {
            return { text: 'Not Connected', color: 'text-red-400', icon: '❌' };
        }
        return { text: 'Connected', color: 'text-green-400', icon: '✅' };
    };
    
    const status = getStatus();
    
    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <span>{status.icon}</span>
            <span className={status.color}>{status.text}</span>
        </div>
    );
};

const SteamConnectButton = ({ 
    isConnected, 
    isLoading = false, 
    onConnect, 
    onDisconnect,
    variant = 'primary',
    size = 'md',
    className = '' 
}) => {
    const baseClasses = 'font-medium rounded-lg transition-colors disabled:opacity-50';
    const variants = {
        primary: 'bg-green-600 hover:bg-green-700 text-white',
        secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
    };
    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2'
    };
    
    const buttonClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;
    
    if (isConnected) {
        return (
            <button 
                onClick={onDisconnect}
                disabled={isLoading}
                className={buttonClasses}
            >
                {isLoading ? 'Disconnecting...' : 'Disconnect Steam'}
            </button>
        );
    }
    
    return (
        <button 
            onClick={onConnect}
            disabled={isLoading}
            className={buttonClasses}
        >
            {isLoading ? 'Connecting...' : '🎮 Connect Steam'}
        </button>
    );
};

const SteamSyncButton = ({ 
    onSync, 
    isLoading = false, 
    lastSyncTime,
    needsSync,
    gamesCount,
    canSync = true,
    cooldownSeconds = 0,
    variant = 'primary',
    size = 'md',
    className = '' 
}) => {
    const baseClasses = 'font-medium rounded-lg transition-colors disabled:opacity-50';
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
    };
    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2'
    };
    
    const buttonClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;
    const disabled = isLoading || !canSync || cooldownSeconds > 0;
    
    let buttonText = '🔄 Sync Games';
    if (isLoading) buttonText = 'Syncing...';
    else if (cooldownSeconds > 0) buttonText = `Cooldown (${cooldownSeconds}s)`;
    else if (needsSync) buttonText = '🔄 Sync Needed';
    
    return (
        <button 
            onClick={onSync}
            disabled={disabled}
            className={buttonClasses}
            title={gamesCount ? `${gamesCount} games` : 'Sync your Steam library'}
        >
            {buttonText}
        </button>
    );
};

const SteamConnectionWidget = ({ 
    variant = 'full',
    steam,
    title,
    showSyncButton = true,
    showUserCard = true,
    className = '' 
}) => {
    if (variant === 'compact') {
        return (
            <div className={`space-y-3 ${className}`}>
                <div className="flex items-center justify-between">
                    {title && <h3 className="text-white font-medium">{title}</h3>}
                    <SteamStatusIndicator 
                        isConnected={steam.isConnected}
                        isLoading={steam.loading}
                        compact={true}
                    />
                </div>
                
                {steam.isConnected ? (
                    <div className="flex space-x-2">
                        {showSyncButton && (
                            <SteamSyncButton
                                onSync={steam.syncLibrary}
                                isLoading={steam.loading}
                                lastSyncTime={steam.lastSynced}
                                needsSync={steam.needsSync}
                                gamesCount={steam.totalGames}
                                canSync={steam.canSync}
                                cooldownSeconds={steam.cooldownSeconds}
                                size="sm"
                            />
                        )}
                        
                        <SteamConnectButton
                            isConnected={steam.isConnected}
                            isLoading={steam.loading}
                            onConnect={steam.connectViaOpenID}
                            onDisconnect={steam.disconnect}
                            variant="secondary"
                            size="sm"
                        />
                    </div>
                ) : (
                    <SteamConnectButton
                        isConnected={steam.isConnected}
                        isLoading={steam.loading}
                        onConnect={steam.connectViaOpenID}
                        onDisconnect={steam.disconnect}
                        size="sm"
                    />
                )}
            </div>
        );
    }
    
    // Full variant
    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center">
                    <span className="text-xl mr-2">🎮</span>
                    {title || 'Steam Connection'}
                </h3>
                <SteamStatusIndicator 
                    isConnected={steam.isConnected}
                    isLoading={steam.loading}
                />
            </div>

            {steam.isConnected ? (
                <div className="space-y-4">
                    {showUserCard && (
                        <SteamUserCard 
                            steamUsername={steam.steamUsername}
                            steamAvatar={steam.steamAvatar}
                            gamesCount={steam.totalGames}
                        />
                    )}

                    <div className="flex space-x-3">
                        {showSyncButton && (
                            <div className="flex-1">
                                <SteamSyncButton
                                    onSync={steam.syncLibrary}
                                    isLoading={steam.loading}
                                    lastSyncTime={steam.lastSynced}
                                    needsSync={steam.needsSync}
                                    gamesCount={steam.totalGames}
                                    canSync={steam.canSync}
                                    cooldownSeconds={steam.cooldownSeconds}
                                />
                            </div>
                        )}

                        <SteamConnectButton
                            isConnected={steam.isConnected}
                            isLoading={steam.loading}
                            onConnect={steam.connectViaOpenID}
                            onDisconnect={steam.disconnect}
                            variant="secondary"
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-blue-300 text-sm">
                            Connect your Steam account to sync your games and improve squad matching.
                        </p>
                    </div>
                    
                    <SteamConnectButton
                        isConnected={steam.isConnected}
                        isLoading={steam.loading}
                        onConnect={steam.connectViaOpenID}
                        onDisconnect={steam.disconnect}
                    />
                </div>
            )}
        </div>
    );
};

const SteamUserCard = ({ 
    steamUsername, 
    steamAvatar, 
    gamesCount, 
    compact = false,
    className = '' 
}) => {
    return (
        <div className={`p-4 bg-white/10 border border-white/20 rounded-lg ${className}`}>
            <div className="flex items-center space-x-3">
                {steamAvatar && (
                    <img 
                        src={steamAvatar} 
                        alt={steamUsername}
                        className={compact ? "w-8 h-8 rounded-full" : "w-12 h-12 rounded-full"}
                    />
                )}
                <div>
                    <h3 className={`text-white font-bold ${compact ? 'text-sm' : ''}`}>
                        {steamUsername || 'Steam User'}
                    </h3>
                    <p className={`text-white/60 ${compact ? 'text-xs' : 'text-sm'}`}>
                        {gamesCount || 0} games
                    </p>
                </div>
            </div>
        </div>
    );
};

/**
 * Unified Steam Manager - Replaces multiple Steam components
 * Compatible with your existing backend API endpoints
 * 
 * @param {Object} props
 * @param {string} props.variant - 'full' | 'compact' | 'modal' | 'profile' | 'status-only'
 * @param {Object} props.user - User object from your auth system
 * @param {string} props.title - Custom title for the section
 * @param {boolean} props.showSyncButton - Show sync games button
 * @param {boolean} props.showUserCard - Show user profile card
 * @param {boolean} props.showDisconnect - Show disconnect option
 * @param {Function} props.onConnectionChange - Callback when connection status changes
 * @param {Function} props.onUserUpdate - Callback when user data updates (for parent components)
 * @param {Object} props.className - Additional CSS classes
 */
const SteamManager = ({ 
    variant = 'full',
    user,
    title,
    showSyncButton = true,
    showUserCard = true,
    showDisconnect = true,
    onConnectionChange,
    onUserUpdate,
    className = ''
}) => {
    const steam = useSteamConnection(user);

    // Notify parent of connection changes
    useEffect(() => {
        if (onConnectionChange) {
            onConnectionChange(steam.isConnected, {
                steam_username: steam.steamUsername,
                steam_avatar_url: steam.steamAvatar,
                total_games: steam.totalGames,
                steam_library_synced_at: steam.lastSynced
            });
        }
    }, [steam.isConnected, steam.steamUsername, steam.steamAvatar, steam.totalGames, steam.lastSynced, onConnectionChange]);

    // Notify parent of user data updates (for compatibility with existing components)
    useEffect(() => {
        if (onUserUpdate && steam.isConnected) {
            onUserUpdate({
                ...user,
                steam_connected: steam.isConnected,
                is_steam_connected: steam.isConnected,
                steam_username: steam.steamUsername,
                steam_avatar_url: steam.steamAvatar,
                total_games: steam.totalGames,
                steam_library_synced_at: steam.lastSynced
            });
        }
    }, [steam.isConnected, steam.steamUsername, steam.steamAvatar, steam.totalGames, steam.lastSynced, onUserUpdate, user]);

    // Status-only variant - just shows connection indicator
    if (variant === 'status-only') {
        return (
            <div className={className}>
                <SteamStatusIndicator 
                    isConnected={steam.isConnected}
                    isLoading={steam.loading}
                    compact={true}
                />
            </div>
        );
    }

    // Profile variant - designed for profile pages
    if (variant === 'profile') {
        return (
            <div className={`space-y-4 ${className}`}>
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                        <span className="text-xl mr-2">🎮</span>
                        Steam Account
                    </h3>
                    <SteamStatusIndicator 
                        isConnected={steam.isConnected}
                        isLoading={steam.loading}
                        compact={true}
                    />
                </div>

                {steam.isConnected ? (
                    <div className="space-y-4">
                        {showUserCard && (
                            <SteamUserCard 
                                steamUsername={steam.steamUsername}
                                steamAvatar={steam.steamAvatar}
                                gamesCount={steam.totalGames}
                                compact={true}
                            />
                        )}

                        <div className="flex space-x-3">
                            {showSyncButton && (
                                <div className="flex-1">
                                    <SteamSyncButton
                                        onSync={steam.syncLibrary}
                                        isLoading={steam.loading}
                                        lastSyncTime={steam.lastSynced}
                                        needsSync={steam.needsSync}
                                        gamesCount={steam.totalGames}
                                        canSync={steam.canSync}
                                        cooldownSeconds={steam.cooldownSeconds}
                                        variant="secondary"
                                        size="sm"
                                    />
                                </div>
                            )}

                            {showDisconnect && (
                                <SteamConnectButton
                                    isConnected={steam.isConnected}
                                    isLoading={steam.loading}
                                    onConnect={steam.connectViaOpenID}
                                    onDisconnect={steam.disconnect}
                                    variant="secondary"
                                    size="sm"
                                />
                            )}
                        </div>

                        {steam.needsSync && (
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                <p className="text-yellow-300 text-sm">
                                    ⚠️ Your Steam games haven't been synced recently. 
                                    Sync now to ensure accurate game matching.
                                </p>
                            </div>
                        )}

                        {steam.cooldownSeconds > 0 && (
                            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                <p className="text-orange-300 text-sm">
                                    ⏳ Sync cooldown active. Next sync available in {steam.formatCooldown()}.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-blue-300 text-sm">
                                Connect your Steam account to sync your games and improve squad matching.
                            </p>
                        </div>
                        
                        <SteamConnectButton
                            isConnected={steam.isConnected}
                            isLoading={steam.loading}
                            onConnect={steam.connectViaOpenID}
                            onDisconnect={steam.disconnect}
                            variant="primary"
                            size="md"
                        />
                    </div>
                )}

                {steam.error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-red-300 text-sm">
                            {steam.error}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // All other variants use SteamConnectionWidget
    return (
        <div className={className}>
            <SteamConnectionWidget
                variant={variant}
                steam={steam}
                title={title}
                showSyncButton={showSyncButton}
                showUserCard={showUserCard}
            />
            
            {steam.error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-sm">
                        {steam.error}
                    </p>
                </div>
            )}
        </div>
    );
};

export {
    SteamStatusIndicator,
    SteamConnectButton,
    SteamSyncButton,
    SteamConnectionWidget,
    SteamUserCard,
    useSteamConnection
};

export default SteamManager;