// src/front/pages/Profile.jsx - PHASE 5 IMPLEMENTATION: Standardized UI/UX Components

import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import SteamConnectionManager from '../components/SteamConnectionManager';

// 🚀 PHASE 5: Import standardized components
import { PageLoadingState, DataLoadingState } from '../components/LoadingState';
import { NetworkErrorState, SteamErrorState } from '../components/ErrorState';

export const Profile = () => {
    const { store, dispatch } = useGlobalReducer();
    const { user: globalUser } = store;
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profileError, setProfileError] = useState(null); // 🚀 PHASE 5: Enhanced error state
    const navigate = useNavigate();

    useEffect(() => {
        if (globalUser) {
            setFormData({
                username: globalUser.username || '',
                email: globalUser.email || '',
                bio: globalUser.bio || '',
                avatar_url: globalUser.avatar_url || '',
                gaming_style: globalUser.gaming_style || '',
                favorite_genres: globalUser.favorite_genres || []
            });
            setIsLoading(false);
            setProfileError(null); // Clear any previous errors
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

    // 🚀 PHASE 5: Enhanced refreshUserProfile with better error handling
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenreToggle = (genre) => {
        setFormData(prev => ({
            ...prev,
            favorite_genres: prev.favorite_genres.includes(genre)
                ? prev.favorite_genres.filter(g => g !== genre)
                : [...prev.favorite_genres, genre]
        }));
    };

    // 🚀 PHASE 5: Enhanced handleSave with better error handling
    const handleSave = async () => {
        setIsSaving(true);
        setProfileError(null);
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/profile`, {
                method: 'PUT',
                body: JSON.stringify({
                    bio: formData.bio,
                    avatar_url: formData.avatar_url,
                    gaming_style: formData.gaming_style,
                    favorite_genres: formData.favorite_genres
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: 'set_user', payload: data.user });
                setIsEditing(false);
                toast.success('Profile updated successfully!');
            } else {
                const data = await response.json();
                const errorMessage = data.error || 'Failed to update profile';
                setProfileError(errorMessage);
                toast.error(errorMessage);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            const errorMessage = 'Network error updating profile';
            setProfileError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            username: globalUser.username || '',
            email: globalUser.email || '',
            bio: globalUser.bio || '',
            avatar_url: globalUser.avatar_url || '',
            gaming_style: globalUser.gaming_style || '',
            favorite_genres: globalUser.favorite_genres || []
        });
        setIsEditing(false);
        setProfileError(null); // Clear any errors when canceling
    };

    // Handle user updates from Steam connection
    const handleUserUpdate = (updatedUser) => {
        if (updatedUser) {
            dispatch({ type: 'set_user', payload: updatedUser });
            setProfileError(null); // Clear errors on successful update
        } else {
            // If user is null/false, refresh profile
            refreshUserProfile();
        }
    };

    const availableGenres = ['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Racing', 'Puzzle', 'Fighting', 'Shooter', 'Horror', 'Platformer', 'MMO', 'Battle Royale', 'MOBA', 'Indie'];
    const gamingStyles = ['Casual', 'Competitive', 'Hardcore', 'Social', 'Solo', 'Co-op'];

    // 🚀 PHASE 5: Use standardized PageLoadingState
    if (isLoading) {
        return <PageLoadingState 
            message="Loading your profile..." 
            subMessage="Fetching Steam data and preferences" 
        />;
    }

    // 🚀 PHASE 5: Handle profile errors with NetworkErrorState
    if (profileError && !globalUser) {
        return <NetworkErrorState 
            error={profileError}
            onRetry={refreshUserProfile}
            onRefresh={() => window.location.reload()}
            helpText="Check your connection and try refreshing."
        />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-4xl mx-auto relative z-10">
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="mb-4 px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                >
                    ← Back to Dashboard
                </button>
                
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                    <h1 className="text-3xl font-bold text-white mb-6">Profile Settings</h1>
                    <p className="text-white/70 mb-8">Manage your gaming profile and preferences</p>

                    {/* 🚀 PHASE 5: Display profile error if exists */}
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
                        {/* Profile Image and Basic Info */}
                        <div className="flex flex-col items-center space-y-6">
                            <div className="text-center">
                                {/* Profile Avatar */}
                                {globalUser.steam_avatar_url || formData.avatar_url ? (
                                    <img 
                                        src={globalUser.steam_avatar_url || formData.avatar_url} 
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
                                    className={`${globalUser.steam_avatar_url || formData.avatar_url ? 'hidden' : 'flex'} mb-4 mx-auto border-4 border-white/20 rounded-full`}
                                    style={{ width: '128px', height: '128px' }}
                                >
                                    <Avatar 
                                        name={formData.username || 'User'} 
                                        size={120} 
                                        className="border-none"
                                    />
                                </div>
                                
                                <h2 className="text-2xl font-bold text-white">{formData.username}</h2>
                                {globalUser.steam_username && (
                                    <p className="text-white/60 mt-1">{globalUser.steam_username} (Steam)</p>
                                )}
                            </div>
                            
                            {/* 🚀 PHASE 5: Enhanced Steam Connection with error handling */}
                            <div className="w-full">
                                <SteamConnectionManager 
                                    user={globalUser}
                                    onUserUpdate={handleUserUpdate}
                                    showLibraryButton={true}
                                    showSyncButton={true}
                                    className="w-full"
                                />
                                
                                {/* Show Steam-specific errors */}
                                {profileError && profileError.includes('Steam') && (
                                    <div className="mt-4">
                                        <SteamErrorState 
                                            error={profileError}
                                            onRetry={refreshUserProfile}
                                            onSkip={() => setProfileError(null)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Profile Details */}
                        <div className="space-y-6">
                            {!isEditing ? (
                                <>
                                    <div className="grid gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2 font-medium">Username</label>
                                                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                                    <p className="text-white">{formData.username}</p>
                                                    <p className="text-white/50 text-xs mt-1">Username cannot be changed</p>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2 font-medium">Email</label>
                                                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                                    <p className="text-white">{formData.email}</p>
                                                    <p className="text-white/50 text-xs mt-1">Email cannot be changed</p>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2 font-medium">Bio</label>
                                                <div className="p-3 bg-white/5 rounded-lg border border-white/10 min-h-[80px]">
                                                    <p className="text-white">{formData.bio || 'Tell other gamers about yourself...'}</p>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2 font-medium">Gaming Style</label>
                                                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                                    <p className="text-white">{formData.gaming_style || 'No style selected'}</p>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2 font-medium">Favorite Genres</label>
                                                <div className="p-3 bg-white/5 rounded-lg border border-white/10 min-h-[60px] flex flex-wrap gap-2 items-start">
                                                    {formData.favorite_genres && formData.favorite_genres.length > 0 ? (
                                                        formData.favorite_genres.map(genre => (
                                                            <span key={genre} className="px-3 py-1 bg-coral-500/20 text-coral-300 rounded-full text-sm border border-coral-500/30">
                                                                {genre}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-white/60 text-sm">No genres selected</span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2 font-medium">Member Since</label>
                                                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                                    <p className="text-white">{new Date(globalUser.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        disabled={isSaving}
                                        className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50"
                                    >
                                        ✏️ Edit Profile
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-white/70 text-sm mb-2 font-medium">Bio</label>
                                            <textarea 
                                                name="bio"
                                                value={formData.bio}
                                                onChange={handleChange}
                                                className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 transition-all resize-none"
                                                rows="4"
                                                placeholder="Tell other gamers about yourself..."
                                                disabled={isSaving}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-white/70 text-sm mb-2 font-medium">Avatar URL</label>
                                            <input 
                                                type="url"
                                                name="avatar_url"
                                                value={formData.avatar_url}
                                                onChange={handleChange}
                                                className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 transition-all"
                                                placeholder="https://example.com/avatar.jpg"
                                                disabled={isSaving}
                                            />
                                            <p className="text-white/50 text-xs mt-1">
                                                Note: Steam avatar will take priority if connected
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-white/70 text-sm mb-2 font-medium">Gaming Style</label>
                                            <select 
                                                name="gaming_style"
                                                value={formData.gaming_style}
                                                onChange={handleChange}
                                                className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 transition-all"
                                                disabled={isSaving}
                                            >
                                                <option value="">Select your style</option>
                                                {gamingStyles.map(style => (
                                                    <option key={style} value={style}>{style}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-white/70 text-sm mb-3 font-medium">Favorite Genres</label>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {availableGenres.map(genre => (
                                                    <button 
                                                        key={genre}
                                                        onClick={() => handleGenreToggle(genre)}
                                                        disabled={isSaving}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                                                            formData.favorite_genres && formData.favorite_genres.includes(genre)
                                                                ? 'bg-coral-500 text-white border-2 border-coral-400'
                                                                : 'bg-white/10 text-white hover:bg-white/20 border-2 border-transparent'
                                                        }`}
                                                    >
                                                        {genre}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="flex-1 px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                                    Saving...
                                                </>
                                            ) : (
                                                '💾 Save Changes'
                                            )}
                                        </button>
                                        <button 
                                            onClick={handleCancel}
                                            disabled={isSaving}
                                            className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50"
                                        >
                                            ❌ Cancel
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};