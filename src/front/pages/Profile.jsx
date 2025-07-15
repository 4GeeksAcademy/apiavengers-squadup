import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import { useNavigate } from 'react-router-dom';

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
    }, [globalUser]);

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
                dispatch({ type: 'SET_USER', payload: data.user });
                setIsEditing(false);
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'Network error updating profile' });
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

    const handleSteamConnect = async () => {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const returnTo = encodeURIComponent('/profile');
        try {
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/steam/login?return_to=${returnTo}`, {
                method: 'GET'
            });
            if (response.ok) {
                const data = await response.json();
                window.location.href = data.steam_auth_url;
            } else {
                const errorData = await response.json();
                console.error('Steam connect failed:', errorData);
                setMessage({ type: 'error', text: errorData.message || 'Failed to initiate Steam connection' });
            }
        } catch (error) {
            console.error('Error initiating Steam connect:', error);
            setMessage({ type: 'error', text: 'Network error connecting to Steam' });
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect your Steam account? This will clear your game library.')) return;
        setMessage({ type: '', text: '' });
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        try {
            const disconnectResponse = await authService.authenticatedFetch(`${backendUrl}/api/auth/steam/disconnect`, {
                method: 'POST'
            });
            if (disconnectResponse.ok) {
                // Refresh user data after disconnect
                const profileResponse = await authService.authenticatedFetch(`${backendUrl}/api/auth/profile`);
                if (profileResponse.ok) {
                    const updatedData = await profileResponse.json();
                    dispatch({ type: 'SET_USER', payload: updatedData.user || updatedData });
                    setMessage({ type: 'success', text: 'Steam account disconnected successfully!' });
                } else {
                    throw new Error('Failed to refresh profile after disconnect');
                }
            } else {
                const errorData = await disconnectResponse.json();
                setMessage({ type: 'error', text: errorData.error || 'Failed to disconnect Steam' });
            }
        } catch (error) {
            console.error('Error disconnecting Steam:', error);
            setMessage({ type: 'error', text: 'Network error disconnecting Steam' });
        }
    };

    const availableGenres = ['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Racing', 'Puzzle', 'Fighting', 'Shooter', 'Horror', 'Platformer', 'MMO', 'Battle Royale', 'MOBA', 'Indie'];
    const gamingStyles = ['Casual', 'Competitive', 'Hardcore', 'Social', 'Solo', 'Co-op'];

    if (isLoading) {
        return <div>Loading your profile...</div>;
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
                        
                        {message.text && (
                            <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col items-center">
                                <img 
                                    src={globalUser.steam_avatar_url || formData.avatar_url || '/placeholder-avatar.jpg'} 
                                    alt="Avatar" 
                                    className="w-32 h-32 rounded-full mb-4 object-cover"
                                />
                                <h2 className="text-2xl font-bold text-white">{formData.username}</h2>
                                {globalUser.steam_username && (
                                    <p className="text-white/60">{globalUser.steam_username} (Steam)</p>
                                )}
                            </div>
                            <div>
                                {!isEditing ? (
                                    <>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-white/70 text-sm mb-1">Username</label>
                                                <p className="text-white">{formData.username}</p>
                                                <p className="text-white/50 text-xs">Username cannot be changed</p>
                                            </div>
                                            <div>
                                                <label className="block text-white/70 text-sm mb-1">Email</label>
                                                <p className="text-white">{formData.email}</p>
                                                <p className="text-white/50 text-xs">Email cannot be changed</p>
                                            </div>
                                            <div>
                                                <label className="block text-white/70 text-sm mb-1">Bio</label>
                                                <p className="text-white">{formData.bio || 'Tell other gamers about yourself...'}</p>
                                            </div>
                                            <div className="flex items-center">
                                                <div>
                                                    <label className="block text-white/70 text-sm mb-1">Steam Connected</label>
                                                    <p className="text-white">{globalUser.is_steam_connected ? 'Yes' : 'No'}</p>
                                                </div>
                                                {globalUser.is_steam_connected && (
                                                    <>
                                                        <button 
                                                            onClick={() => navigate('/game-library')}
                                                            className="ml-4 px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                                                        >
                                                            View Game Library
                                                        </button>
                                                        <button 
                                                            onClick={handleDisconnect}
                                                            className="ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                                                        >
                                                            Disconnect Steam
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            {!globalUser.is_steam_connected && (
                                                <button 
                                                    onClick={handleSteamConnect}
                                                    className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                                                >
                                                    Connect Steam
                                                </button>
                                            )}
                                            <div>
                                                <label className="block text-white/70 text-sm mb-1">Member Since</label>
                                                <p className="text-white">{new Date(globalUser.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <label className="block text-white/70 text-sm mb-1">Avatar URL</label>
                                                <p className="text-white">{formData.avatar_url}</p>
                                            </div>
                                            <div>
                                                <label className="block text-white/70 text-sm mb-1">Gaming Style</label>
                                                <p className="text-white">{formData.gaming_style || 'Select your style'}</p>
                                            </div>
                                            <div>
                                                <label className="block text-white/70 text-sm mb-1">Favorite Genres</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {formData.favorite_genres.map(genre => (
                                                        <span key={genre} className="px-3 py-1 bg-white/10 rounded-full text-white text-sm">
                                                            {genre}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="mt-6 px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                                        >
                                            Edit Profile
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2">Bio</label>
                                                <textarea 
                                                    name="bio"
                                                    value={formData.bio}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 transition-colors"
                                                    rows="4"
                                                    placeholder="Tell other gamers about yourself..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2">Avatar URL</label>
                                                <input 
                                                    type="text"
                                                    name="avatar_url"
                                                    value={formData.avatar_url}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2">Gaming Style</label>
                                                <select 
                                                    name="gaming_style"
                                                    value={formData.gaming_style}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-coral-500 transition-colors"
                                                >
                                                    <option value="">Select your style</option>
                                                    {gamingStyles.map(style => (
                                                        <option key={style} value={style}>{style}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2">Favorite Genres</label>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    {availableGenres.map(genre => (
                                                        <button 
                                                            key={genre}
                                                            onClick={() => handleGenreToggle(genre)}
                                                            className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                                                formData.favorite_genres.includes(genre)
                                                                    ? 'bg-coral-500 text-white'
                                                                    : 'bg-white/10 text-white hover:bg-white/20'
                                                            }`}
                                                        >
                                                            {genre}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-6 flex gap-4">
                                            <button 
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50"
                                            >
                                                {isSaving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                            <button 
                                                onClick={handleCancel}
                                                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors duration-200"
                                            >
                                                Cancel
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