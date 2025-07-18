// src/front/pages/Profile.jsx - UPDATED with Unified Steam Integration

import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import SteamConnectionManager from '../components/SteamConnectionManager';

export const Profile = () => {
    const { store, dispatch } = useGlobalReducer();
    const { user: globalUser } = store;
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
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

    const refreshUserProfile = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/profile`);
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: 'set_user', payload: data.user });
            }
        } catch (error) {
            console.error('Error refreshing profile:', error);
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

    const handleSave = async () => {
        setIsSaving(true);
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        try {
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
                toast.error(data.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Network error updating profile');
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
    };

    // Handle user updates from Steam connection
    const handleUserUpdate = (updatedUser) => {
        if (updatedUser) {
            dispatch({ type: 'set_user', payload: updatedUser });
        } else {
            // If user is null/false, refresh profile
            refreshUserProfile();
        }
    };

    const availableGenres = ['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Racing', 'Puzzle', 'Fighting', 'Shooter', 'Horror', 'Platformer', 'MMO', 'Battle Royale', 'MOBA', 'Indie'];
    const gamingStyles = ['Casual', 'Competitive', 'Hardcore', 'Social', 'Solo', 'Co-op'];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading your profile...</p>
                </div>
            </div>
        );
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
                            
                            {/* UNIFIED Steam Connection Component */}
                            <SteamConnectionManager 
                                user={globalUser}
                                onUserUpdate={handleUserUpdate}
                                showLibraryButton={true}
                                showSyncButton={true}
                                className="w-full"
                            />
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
                                        className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
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
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
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
                                            className="flex-1 px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSaving ? '💾 Saving...' : '💾 Save Changes'}
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