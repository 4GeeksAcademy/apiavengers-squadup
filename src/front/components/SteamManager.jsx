// src/front/components/SteamManager.jsx - Updated to work with your existing backend
import React from 'react';
import useSteamConnection from '../hooks/useSteamConnection';
import { 
    SteamConnectionWidget,
    SteamStatusIndicator,
    SteamConnectButton,
    SteamSyncButton,
    SteamUserCard 
} from './Steam/SteamComponents';

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
    React.useEffect(() => {
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
    React.useEffect(() => {
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

// Export individual components for advanced usage
export {
    SteamStatusIndicator,
    SteamConnectButton, 
    SteamSyncButton,
    SteamUserCard,
    SteamConnectionWidget,
    useSteamConnection
};

// Default export
export default SteamManager;