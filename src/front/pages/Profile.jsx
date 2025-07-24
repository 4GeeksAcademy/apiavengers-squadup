// src/front/pages/Profile.jsx - FIXED VERSION with proper syntax

import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// 🚀 PHASE 5: Import standardized components
import { PageLoadingState } from '../components/LoadingState';
import { NetworkErrorState } from '../components/ErrorState';

// 🎯 NEW: Import extracted components
import ProfileDisplay from '../components/ProfileDisplay';
import ProfileEditForm from '../components/ProfileEditForm';
import SteamManager from '../components/SteamManager';

// 🐛 DEBUG: Debug component moved outside main component
const DebugAuth = () => {
    const { store } = useGlobalReducer();
    
    // Only show in development
    if (import.meta.env.PROD) return null;
    
    return (
        <div style={{ 
            position: 'fixed', 
            top: '100px', 
            right: '10px', 
            background: 'black', 
            color: 'white', 
            padding: '10px', 
            zIndex: 9999,
            fontSize: '12px',
            border: '1px solid #666',
            borderRadius: '4px'
        }}>
            <div><strong>🐛 Debug Auth</strong></div>
            <div>Auth: {store?.isAuthenticated ? '✅' : '❌'}</div>
            <div>User: {store?.user?.username || 'None'}</div>
            <div>Loading: {store?.authLoading ? '⏳' : '✅'}</div>
            <div>Token: {!!localStorage.getItem('token') ? '✅' : '❌'}</div>
        </div>
    );
};

export const Profile = () => {
    const { store, dispatch } = useGlobalReducer();
    const { user: globalUser } = store;
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [profileError, setProfileError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (globalUser) {
            setIsLoading(false);
            setProfileError(null);
        } else {
            setIsLoading(true);
        }

        // Check for Steam connection success/error in URL params
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('steam_connected') === 'true') {
            const newGames = urlParams.get('new_games') || 0;
            const updatedGames = urlParams.get('updated_games') || 0;
            
            toast.success(`Steam connected! Synced ${newGames} new games and updated ${updatedGames} games.`);
            refreshUserProfile();
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('steam_error')) {
            const error = urlParams.get('steam_error');
            const errorMessages = {
                'auth_failed': 'Steam authentication failed. Please try again.',
                'connection_failed': 'Failed to connect Steam account.',
                'invalid_id': 'Invalid Steam ID received.',
                'server_error': 'Server error occurred. Please try again later.',
                'no_user': 'Authentication session expired. Please try again.',
                'invalid_state': 'Invalid authentication state. Please try again.',
                'missing_params': 'Missing authentication parameters. Please try again.',
                'timeout': 'Authentication timed out. Please try again.',
                'network_error': 'Network error during authentication. Please try again.',
                'user_not_found': 'User session not found. Please log in again.'
            };
            toast.error(errorMessages[error] || 'An unknown Steam connection error occurred.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [globalUser]);

    /**
     * Refresh user profile data
     */
    const refreshUserProfile = async () => {
        try {
            setProfileError(null);
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/profile`);
            
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: 'set_user', payload: data.user });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to refresh profile');
            }
        } catch (error) {
            console.error('Error refreshing profile:', error);
            setProfileError(error.message);
            toast.error('Failed to refresh profile data');
        }
    };

    /**
     * Handle user updates from components
     */
    const handleUserUpdate = (updatedUser) => {
        if (updatedUser) {
            dispatch({ type: 'set_user', payload: updatedUser });
            setProfileError(null);
        } else {
            refreshUserProfile();
        }
    };

    /**
     * Handle entering edit mode
     */
    const handleStartEdit = () => {
        setIsEditing(true);
        setProfileError(null);
    };

    /**
     * Handle exiting edit mode
     */
    const handleExitEdit = () => {
        setIsEditing(false);
        setProfileError(null);
    };

    /**
     * Clear Steam-specific errors
     */
    const handleClearSteamError = () => {
        if (profileError && profileError.includes('Steam')) {
            setProfileError(null);
        }
    };

    // 🚀 PHASE 5: Use standardized PageLoadingState
    if (isLoading) {
        return (
            <PageLoadingState 
                message="Loading your profile..." 
                subMessage="Fetching Steam data and preferences" 
            />
        );
    }

    // 🚀 PHASE 5: Handle profile errors with NetworkErrorState
    if (profileError && !globalUser) {
        return (
            <NetworkErrorState 
                error={profileError}
                onRetry={refreshUserProfile}
                onRefresh={() => window.location.reload()}
                helpText="Check your connection and try refreshing."
            />
        );
    }

    return (
        <>
            {/* 🐛 DEBUG: Only shows in development */}
            <DebugAuth />
            
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
                <div className="max-w-4xl mx-auto relative z-10">
                    {/* Back Button */}
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="mb-4 px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                    >
                        ← Back to Dashboard
                    </button>
                    
                    {/* Main Profile Container */}
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                        <h1 className="text-3xl font-bold text-white mb-6">Profile Settings</h1>
                        <p className="text-white/70 mb-8">Manage your gaming profile and preferences</p>

                        {/* Profile Error Display */}
                        {profileError && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                                <div className="flex items-center space-x-2">
                                    <span>⚠️</span>
                                    <div>
                                        <strong>Profile Error:</strong> {profileError}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setProfileError(null)}
                                    className="mt-2 text-xs underline hover:no-underline"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column: Steam Integration Section */}
                            <div className="flex flex-col space-y-6">
                                <SteamManager
                                    user={globalUser}
                                    onUserUpdate={handleUserUpdate}
                                    onRefreshProfile={refreshUserProfile}
                                    steamError={profileError}
                                    onClearSteamError={handleClearSteamError}
                                    className="w-full"
                                />
                            </div>

                            {/* Right Column: Profile Details */}
                            <div className="space-y-6">
                                {!isEditing ? (
                                    <ProfileDisplay
                                        user={globalUser}
                                        onEdit={handleStartEdit}
                                        className="w-full"
                                    />
                                ) : (
                                    <ProfileEditForm
                                        user={globalUser}
                                        onUserUpdate={handleUserUpdate}
                                        onCancel={handleExitEdit}
                                        className="w-full"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Profile Actions Footer */}
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <div className="flex flex-wrap justify-between items-center gap-4">
                                <div className="text-white/60 text-sm">
                                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                                </div>
                                
                                <div className="flex space-x-3">
                                    <button
                                        onClick={refreshUserProfile}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                                    >
                                        🔄 Refresh
                                    </button>
                                    
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white text-sm rounded-lg transition-colors"
                                    >
                                        📊 Dashboard
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};