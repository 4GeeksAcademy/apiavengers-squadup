// src/front/components/SteamIntegrationSection.jsx - Steam Integration Container

import React, { useState } from 'react';
import SteamConnectionManager from './SteamConnectionManager';
import SteamConnectModal from './SteamConnectModal';
import { SteamErrorState } from './ErrorState';
import Avatar from './Avatar';

/**
 * SteamIntegrationSection Component
 * Manages Steam integration with modal support and error handling
 * Extracted from Profile.jsx for better organization
 */
const SteamIntegrationSection = ({ 
    user, 
    onUserUpdate,
    onRefreshProfile,
    steamError = null,
    onClearSteamError = null,
    className = "" 
}) => {
    const [showConnectModal, setShowConnectModal] = useState(false);

    const isConnected = user?.steam_connected || user?.is_steam_connected;

    /**
     * Handle Steam connection success
     */
    const handleSteamSuccess = (result) => {
        if (result?.user && onUserUpdate) {
            onUserUpdate(result.user);
        } else if (onRefreshProfile) {
            onRefreshProfile();
        }
        setShowConnectModal(false);
    };

    /**
     * Handle opening the connection modal
     */
    const handleOpenModal = () => {
        setShowConnectModal(true);
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Profile Avatar Section */}
            <div className="text-center">
                {/* Profile Avatar */}
                {user?.steam_avatar_url || user?.avatar_url ? (
                    <img 
                        src={user.steam_avatar_url || user.avatar_url} 
                        alt="Profile Avatar" 
                        className="w-32 h-32 rounded-full mb-4 object-cover mx-auto border-4 border-white/20"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                
                {/* Avatar component fallback */}
                <div 
                    className={`${user?.steam_avatar_url || user?.avatar_url ? 'hidden' : 'flex'} mb-4 mx-auto border-4 border-white/20 rounded-full`}
                    style={{ width: '128px', height: '128px' }}
                >
                    <Avatar 
                        name={user?.username || 'User'} 
                        size={120} 
                        className="border-none"
                    />
                </div>
                
                {/* User Name */}
                <h2 className="text-2xl font-bold text-white">
                    {user?.username || 'Loading...'}
                </h2>
                
                {/* Steam Username */}
                {user?.steam_username && (
                    <p className="text-white/60 mt-1 flex items-center justify-center gap-2">
                        <span>🎮</span>
                        {user.steam_username} (Steam)
                    </p>
                )}
                
                {/* Connection Status Badge */}
                <div className="mt-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 ${
                        isConnected 
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${
                            isConnected ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        {isConnected ? 'Steam Connected' : 'Steam Not Connected'}
                    </span>
                </div>
            </div>
            
            {/* Steam Connection Manager */}
            <div className="w-full">
                <SteamConnectionManager 
                    user={user}
                    onUserUpdate={onUserUpdate}
                    showLibraryButton={true}
                    showSyncButton={true}
                    className="w-full"
                />
            </div>
            
            {/* Steam-specific Error Display */}
            {steamError && steamError.includes('Steam') && (
                <div className="mt-4">
                    <SteamErrorState 
                        error={steamError}
                        onRetry={onRefreshProfile}
                        onSkip={onClearSteamError}
                        className="w-full"
                    />
                </div>
            )}

            {/* Quick Actions */}
            {isConnected && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        <span>⚡</span>
                        Quick Actions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <a
                            href="/game-library"
                            className="px-4 py-3 bg-coral-500/20 hover:bg-coral-500/30 border border-coral-500/30 text-coral-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            📚 View Library
                        </a>
                        <a
                            href="/find-games"
                            className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            🔍 Find Games
                        </a>
                    </div>
                </div>
            )}

            {/* Steam Connection Tips */}
            {!isConnected && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                        <span>💡</span>
                        Why Connect Steam?
                    </h4>
                    <ul className="text-blue-300/80 text-sm space-y-1">
                        <li>• Automatically sync your game library</li>
                        <li>• Find common games with friends</li>
                        <li>• Get personalized game recommendations</li>
                        <li>• Join groups based on your games</li>
                        <li>• Track your gaming preferences</li>
                    </ul>
                    <button
                        onClick={handleOpenModal}
                        className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Get Started
                    </button>
                </div>
            )}

            {/* Steam Connect Modal */}
            <SteamConnectModal
                isOpen={showConnectModal}
                onClose={() => setShowConnectModal(false)}
                onSuccess={handleSteamSuccess}
                title="Connect Your Steam Account"
                defaultMethod="openid"
            />
        </div>
    );
};

export default SteamIntegrationSection;