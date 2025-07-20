// src/front/components/Steam/SteamComponents.jsx - Updated to work with your existing backend
import React from 'react';
import { formatPlaytime, formatLastPlayed } from '../../utils/steamUtils';

// Steam Status Indicator Component
const SteamStatusIndicator = ({ isConnected, isLoading, compact = false, showText = true }) => {
    if (isLoading) {
        return (
            <div className={`flex items-center space-x-2 ${compact ? 'text-sm' : ''}`}>
                <div className="w-4 h-4 border-2 border-white/30 border-t-blue-500 rounded-full animate-spin"></div>
                {showText && <span className="text-white/70">Checking Steam...</span>}
            </div>
        );
    }

    if (isConnected) {
        return (
            <div className={`flex items-center space-x-2 ${compact ? 'text-sm' : ''}`}>
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                {showText && <span className="text-green-400">Steam Connected</span>}
            </div>
        );
    }

    return (
        <div className={`flex items-center space-x-2 ${compact ? 'text-sm' : ''}`}>
            <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
            {showText && <span className="text-gray-400">No Steam</span>}
        </div>
    );
};

// Steam Connect Button Component
const SteamConnectButton = ({ 
    isConnected, 
    isLoading, 
    onConnect, 
    onDisconnect, 
    variant = 'primary', 
    size = 'md',
    disabled = false
}) => {
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg'
    };

    const variantClasses = {
        primary: isConnected 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white',
        secondary: 'bg-white/10 hover:bg-white/20 border border-white/30 text-white',
        minimal: 'text-blue-400 hover:text-blue-300 underline'
    };

    const handleClick = () => {
        if (isConnected) {
            onDisconnect();
        } else {
            onConnect();
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={isLoading || disabled}
            className={`
                ${sizeClasses[size]} 
                ${variantClasses[variant]}
                rounded-lg font-medium transition-all duration-200 
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center space-x-2
            `}
        >
            {isLoading ? (
                <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                </>
            ) : isConnected ? (
                <>
                    <span>🔌</span>
                    <span>Disconnect Steam</span>
                </>
            ) : (
                <>
                    <span>🎮</span>
                    <span>Connect Steam</span>
                </>
            )}
        </button>
    );
};

// Steam Sync Button Component
const SteamSyncButton = ({ 
    onSync, 
    isLoading, 
    lastSyncTime, 
    needsSync, 
    gamesCount,
    canSync = true,
    cooldownSeconds = 0,
    variant = 'primary',
    size = 'md' 
}) => {
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg'
    };

    const getVariantClasses = () => {
        if (!canSync || cooldownSeconds > 0) {
            return 'bg-orange-500/50 cursor-not-allowed text-white border-orange-400';
        }
        if (needsSync) {
            return 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-400';
        }
        return variant === 'secondary' 
            ? 'bg-white/10 hover:bg-white/20 border border-white/30 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white';
    };

    const formatLastSync = () => {
        if (!lastSyncTime) return 'Never synced';
        return `Last sync: ${formatLastPlayed(lastSyncTime)}`;
    };

    const formatCooldown = () => {
        if (cooldownSeconds <= 0) return '';
        const minutes = Math.floor(cooldownSeconds / 60);
        const seconds = cooldownSeconds % 60;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    };

    const getButtonText = () => {
        if (isLoading) return 'Syncing...';
        if (cooldownSeconds > 0) return `Cooldown (${formatCooldown()})`;
        if (needsSync) return 'Sync Required';
        return 'Sync Games';
    };

    const getButtonIcon = () => {
        if (isLoading) return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>;
        if (cooldownSeconds > 0) return '⏳';
        if (needsSync) return '⚠️';
        return '🔄';
    };

    return (
        <div className="space-y-2">
            <button
                onClick={onSync}
                disabled={isLoading || !canSync || cooldownSeconds > 0}
                className={`
                    ${sizeClasses[size]} 
                    ${getVariantClasses()}
                    rounded-lg font-medium transition-all duration-200 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center space-x-2 w-full justify-center
                `}
                title={formatLastSync()}
            >
                {getButtonIcon()}
                <span>{getButtonText()}</span>
                {gamesCount > 0 && <span className="text-xs">({gamesCount})</span>}
            </button>
            
            {lastSyncTime && (
                <p className="text-xs text-white/60 text-center">
                    {formatLastSync()}
                </p>
            )}
        </div>
    );
};

// Steam User Card Component
const SteamUserCard = ({ 
    steamUsername, 
    steamAvatar, 
    gamesCount, 
    totalPlaytime = 0,
    compact = false 
}) => {
    if (!steamUsername) return null;

    if (compact) {
        return (
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/20">
                {steamAvatar ? (
                    <img 
                        src={steamAvatar} 
                        alt={steamUsername}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div 
                    className={`${steamAvatar ? 'hidden' : 'flex'} w-10 h-10 rounded-full bg-blue-500 items-center justify-center text-white font-bold text-sm`}
                >
                    {steamUsername.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="text-white font-medium">{steamUsername}</div>
                    <div className="text-white/60 text-sm">
                        {gamesCount} games
                        {totalPlaytime > 0 && ` • ${formatPlaytime(totalPlaytime)}`}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-white/20">
            <div className="flex items-center space-x-4 mb-4">
                {steamAvatar ? (
                    <img 
                        src={steamAvatar} 
                        alt={steamUsername}
                        className="w-16 h-16 rounded-full border-2 border-blue-400"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div 
                    className={`${steamAvatar ? 'hidden' : 'flex'} w-16 h-16 rounded-full border-2 border-blue-400 bg-blue-500 items-center justify-center text-white font-bold text-xl`}
                >
                    {steamUsername.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">{steamUsername}</h3>
                    <p className="text-blue-300">Steam Profile Connected</p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-white/10 rounded-lg">
                    <div className="text-2xl font-bold text-white">{gamesCount}</div>
                    <div className="text-white/70 text-sm">Games</div>
                </div>
                <div className="p-3 bg-white/10 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">✓</div>
                    <div className="text-white/70 text-sm">Connected</div>
                </div>
            </div>
            
            {totalPlaytime > 0 && (
                <div className="mt-4 p-3 bg-white/5 rounded-lg text-center">
                    <div className="text-lg font-bold text-white">{formatPlaytime(totalPlaytime)}</div>
                    <div className="text-white/70 text-sm">Total Playtime</div>
                </div>
            )}
        </div>
    );
};

// Main Steam Connection Widget
const SteamConnectionWidget = ({ 
    variant = 'full', // 'full', 'compact', 'modal'
    steam,
    title,
    showSyncButton = true,
    showUserCard = true
}) => {
    const {
        isConnected,
        loading,
        steamUsername,
        steamAvatar,
        totalGames,
        needsSync,
        lastSynced,
        canSync,
        cooldownSeconds,
        connectViaOpenID,
        disconnect,
        syncLibrary
    } = steam;

    // Modal variant
    if (variant === 'modal') {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <div className="text-6xl mb-4">🎮</div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                        {isConnected ? 'Steam Connected' : 'Connect Your Steam Account'}
                    </h3>
                    <p className="text-white/70">
                        {isConnected 
                            ? 'Your Steam account is connected and ready to find common games!'
                            : 'Connect Steam to find games you share with your squad members'
                        }
                    </p>
                </div>

                <SteamStatusIndicator 
                    isConnected={isConnected} 
                    isLoading={loading} 
                    showText={true} 
                />

                {isConnected ? (
                    <div className="space-y-4">
                        {showUserCard && (
                            <SteamUserCard 
                                steamUsername={steamUsername}
                                steamAvatar={steamAvatar}
                                gamesCount={totalGames}
                                compact={false} 
                            />
                        )}
                        
                        {showSyncButton && (
                            <SteamSyncButton
                                onSync={syncLibrary}
                                isLoading={loading}
                                lastSyncTime={lastSynced}
                                needsSync={needsSync}
                                gamesCount={totalGames}
                                canSync={canSync}
                                cooldownSeconds={cooldownSeconds}
                                size="lg"
                            />
                        )}
                        
                        <SteamConnectButton
                            isConnected={isConnected}
                            isLoading={loading}
                            onConnect={connectViaOpenID}
                            onDisconnect={disconnect}
                            variant="secondary"
                            size="md"
                        />
                    </div>
                ) : (
                    <SteamConnectButton
                        isConnected={isConnected}
                        isLoading={loading}
                        onConnect={connectViaOpenID}
                        onDisconnect={disconnect}
                        variant="primary"
                        size="lg"
                    />
                )}
            </div>
        );
    }

    // Compact variant
    if (variant === 'compact') {
        return (
            <div className="p-4 bg-white/5 rounded-lg border border-white/20">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium flex items-center space-x-2">
                        <span>🎮</span>
                        <span>Steam</span>
                    </h4>
                    <SteamStatusIndicator 
                        isConnected={isConnected} 
                        isLoading={loading} 
                        compact={true}
                        showText={false}
                    />
                </div>

                {isConnected ? (
                    <div className="space-y-3">
                        {showUserCard && (
                            <SteamUserCard 
                                steamUsername={steamUsername}
                                steamAvatar={steamAvatar}
                                gamesCount={totalGames}
                                compact={true} 
                            />
                        )}
                        
                        <div className="flex space-x-2">
                            {showSyncButton && (
                                <div className="flex-1">
                                    <SteamSyncButton
                                        onSync={syncLibrary}
                                        isLoading={loading}
                                        lastSyncTime={lastSynced}
                                        needsSync={needsSync}
                                        gamesCount={totalGames}
                                        canSync={canSync}
                                        cooldownSeconds={cooldownSeconds}
                                        variant="secondary"
                                        size="sm"
                                    />
                                </div>
                            )}
                            
                            <SteamConnectButton
                                isConnected={isConnected}
                                isLoading={loading}
                                onConnect={connectViaOpenID}
                                onDisconnect={disconnect}
                                variant="minimal"
                                size="sm"
                            />
                        </div>
                    </div>
                ) : (
                    <SteamConnectButton
                        isConnected={isConnected}
                        isLoading={loading}
                        onConnect={connectViaOpenID}
                        onDisconnect={disconnect}
                        variant="secondary"
                        size="sm"
                    />
                )}
            </div>
        );
    }

    // Full variant (default)
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center">
                <span className="text-xl mr-2">🎮</span>
                {title || 'Steam Integration'}
            </h3>

            <SteamStatusIndicator 
                isConnected={isConnected} 
                isLoading={loading} 
                showText={true} 
            />

            <div className="mt-6 space-y-6">
                {isConnected ? (
                    <>
                        {showUserCard && (
                            <SteamUserCard 
                                steamUsername={steamUsername}
                                steamAvatar={steamAvatar}
                                gamesCount={totalGames}
                                compact={false} 
                            />
                        )}
                        
                        {showSyncButton && (
                            <SteamSyncButton
                                onSync={syncLibrary}
                                isLoading={loading}
                                lastSyncTime={lastSynced}
                                needsSync={needsSync}
                                gamesCount={totalGames}
                                canSync={canSync}
                                cooldownSeconds={cooldownSeconds}
                                size="md"
                            />
                        )}
                        
                        <SteamConnectButton
                            isConnected={isConnected}
                            isLoading={loading}
                            onConnect={connectViaOpenID}
                            onDisconnect={disconnect}
                            variant="secondary"
                            size="md"
                        />
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-blue-300 text-sm">
                                Connect your Steam account to automatically sync your games and find what you share with your squad!
                            </p>
                        </div>
                        
                        <SteamConnectButton
                            isConnected={isConnected}
                            isLoading={loading}
                            onConnect={connectViaOpenID}
                            onDisconnect={disconnect}
                            variant="primary"
                            size="lg"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// Export all components
export {
    SteamStatusIndicator,
    SteamConnectButton,
    SteamSyncButton,
    SteamUserCard,
    SteamConnectionWidget
};