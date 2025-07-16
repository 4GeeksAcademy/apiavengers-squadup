import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';

export const Profile = () => {
    const { store, dispatch } = useGlobalReducer();
    const { user: globalUser } = store;
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
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
            toast.success('Steam account connected and library synced successfully!');
            // Refresh user data
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
                'no_user': 'Authentication session expired. Please try again.'
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
        setMessage({ type: '', text: '' });
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
        setMessage({ type: '', text: '' });
    };

    const navigateToDashboard = () => {
        navigate('/dashboard');
    };

    // FIXED: Steam Connect via OpenID
    const handleSteamConnect = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const returnTo = encodeURIComponent('/profile');
            
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/steam/login?return_to=${returnTo}`, {
                method: 'GET'
            });
            
            if (response.ok) {
                const data = await response.json();
                // Redirect to Steam OpenID
                window.location.href = data.steam_auth_url;
            } else {
                const errorData = await response.json();
                console.error('Steam connect failed:', errorData);
                toast.error(errorData.message || 'Failed to initiate Steam connection');
            }
        } catch (error) {
            console.error('Error initiating Steam connect:', error);
            toast.error('Network error connecting to Steam');
        }
    };

    // FIXED: Manual Steam ID connection with library sync
    const handleManualSteamConnect = async () => {
        const steamId = prompt('Enter your Steam ID (17-digit number):');
        if (!steamId || steamId.trim() === '') {
            return;
        }

        if (!/^\d{17}$/.test(steamId.trim())) {
            toast.error('Please enter a valid 17-digit Steam ID');
            return;
        }

        const loadingToast = toast.loading('Connecting Steam account...');
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/steam/connect`, {
                method: 'POST',
                body: JSON.stringify({ steam_id: steamId.trim() })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update user in store
                dispatch({ type: 'set_user', payload: data.user });
                
                toast.dismiss(loadingToast);
                toast.success(`Steam connected! Synced ${data.new_games} new games and updated ${data.updated_games} games.`);
                
                // Refresh profile to get latest data
                await refreshUserProfile();
            } else {
                const errorData = await response.json();
                toast.dismiss(loadingToast);
                toast.error(errorData.error || 'Failed to connect Steam account');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error connecting Steam manually:', error);
            toast.error('Network error connecting to Steam');
        }
    };

    // FIXED: Steam Disconnect
    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect your Steam account? This will clear your game library.')) {
            return;
        }

        const loadingToast = toast.loading('Disconnecting Steam account...');
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/steam/disconnect`, {
                method: 'POST'
            });
            
            if (response.ok) {
                // Refresh user data after disconnect
                await refreshUserProfile();
                
                toast.dismiss(loadingToast);
                toast.success('Steam account disconnected successfully!');
            } else {
                const errorData = await response.json();
                toast.dismiss(loadingToast);
                toast.error(errorData.error || 'Failed to disconnect Steam');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error disconnecting Steam:', error);
            toast.error('Network error disconnecting Steam');
        }
    };

    // FIXED: Steam Library Sync
    const handleSyncLibrary = async () => {
        if (!globalUser.steam_connected) {
            toast.error('Please connect your Steam account first');
            return;
        }

        const loadingToast = toast.loading('Syncing Steam library...');
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/steam/sync-games`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                toast.dismiss(loadingToast);
                toast.success(data.message || `Synced ${data.new_games} new games and updated ${data.updated_games} games`);
                
                // Refresh user data
                await refreshUserProfile();
            } else {
                const errorData = await response.json();
                toast.dismiss(loadingToast);
                toast.error(errorData.error || 'Failed to sync library');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error syncing library:', error);
            toast.error('Network error syncing library');
        }
    };

    const availableGenres = ['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Racing', 'Puzzle', 'Fighting', 'Shooter', 'Horror', 'Platformer', 'MMO', 'Battle Royale', 'MOBA', 'Indie'];
    const gamingStyles = ['Casual', 'Competitive', 'Hardcore', 'Social', 'Solo', 'Co-op'];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
                <div className="text-white text-xl">Loading your profile...</div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
                <div className="max-w-4xl mx-auto relative z-10">
                    <button 
                        onClick={navigateToDashboard}
                        className="mb-4 px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                    >
                        ← Back to Dashboard
                    </button>
                    
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                        <h1 className="text-3xl font-bold text-white mb-6">Profile Settings</h1>
                        <p className="text-white/70 mb-8">Manage your gaming profile and preferences</p>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* 🔧 FIXED: Profile Image and Basic Info - Better spacing and alignment */}
                            <div className="flex flex-col items-center space-y-4">
                                <div className="text-center">
                                    {/* 🔧 FIXED: Use Avatar component as fallback when no Steam avatar */}
                                    {globalUser.steam_avatar_url || formData.avatar_url ? (
                                        <img 
                                            src={globalUser.steam_avatar_url || formData.avatar_url} 
                                            alt="Profile Avatar" 
                                            className="w-32 h-32 rounded-full mb-4 object-cover mx-auto border-4 border-white/20"
                                            onError={(e) => {
                                                // If image fails to load, hide it and show Avatar component
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
                                
                                {/* 🔧 FIXED: Steam Connection Status - Better layout */}
                                <div className="w-full p-6 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-white font-medium">Steam Status</span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            globalUser.steam_connected 
                                                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                        }`}>
                                            {globalUser.steam_connected ? 'Connected' : 'Not Connected'}
                                        </span>
                                    </div>
                                    
                                    {globalUser.steam_connected ? (
                                        <div className="space-y-3">
                                            <p className="text-white/80">
                                                <span className="text-coral-400 font-semibold">{globalUser.total_games || 0}</span> games in library
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                <button 
                                                    onClick={() => navigate('/game-library')}
                                                    className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center gap-2"
                                                >
                                                    📚 View Library
                                                </button>
                                                <button 
                                                    onClick={handleSyncLibrary}
                                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center gap-2"
                                                >
                                                    🔄 Sync Games
                                                </button>
                                                <button 
                                                    onClick={handleDisconnect}
                                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center gap-2"
                                                >
                                                    🔌 Disconnect
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-white/70 text-sm">
                                                Connect your Steam account to sync your game library and find games to play with friends
                                            </p>
                                            <div className="flex flex-col gap-2">
                                                <button 
                                                    onClick={handleSteamConnect}
                                                    className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center justify-center gap-2"
                                                >
                                                    🎮 Connect via Steam
                                                </button>
                                                <button 
                                                    onClick={handleManualSteamConnect}
                                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center justify-center gap-2"
                                                >
                                                    📝 Manual Steam ID
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 🔧 FIXED: Profile Details - Better organization */}
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
        </>
    );
};