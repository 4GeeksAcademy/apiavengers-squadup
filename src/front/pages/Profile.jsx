import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../store/authService.js'
import useGlobalReducer from '../hooks/useGlobalReducer';
import { ACTION_TYPES } from '../store/store';
import { ConnectSteamButton } from "../components/ConnectSteamButton";

export const Profile = () => {
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        bio: '',
        avatar_url: '',
        gaming_style: '',
        favorite_genres: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const { user: storeUser, dispatch } = useGlobalReducer();

    const navigate = useNavigate();  
    const backendUrl = authService.getApiUrl();

    useEffect(() => {
        let mounted = true;

        const loadProfile = async () => {
            // If the user is already in global state, use it
            if (storeUser) {
                setFormData({
                    username: storeUser.username ?? '',
                    email: storeUser.email ?? '',
                    bio: storeUser.bio ?? '',
                    avatar_url: storeUser.avatar_url ?? '',
                    gaming_style: storeUser.gaming_style ?? '',
                    favorite_genres: storeUser.favorite_genres ?? [],
                    created_at: storeUser.created_at ?? '',
                    total_games: storeUser.total_games || 0
                });
                setUser(storeUser); // Set local user state
                setIsLoading(false);
                return;
            }

            // Check if we have cached user data in localStorage
            const cachedUser = authService.getCurrentUser();
            if (cachedUser) {
                setFormData({
                    username: cachedUser.username ?? '',
                    email: cachedUser.email ?? '',
                    bio: cachedUser.bio ?? '',
                    avatar_url: cachedUser.avatar_url ?? '',
                    gaming_style: cachedUser.gaming_style ?? '',
                    favorite_genres: cachedUser.favorite_genres ?? [],
                    created_at: cachedUser.created_at ?? '',
                    total_games: cachedUser.total_games || 0
                });
                setUser(cachedUser);
                dispatch({ type: ACTION_TYPES.SET_USER, payload: cachedUser });
                setIsLoading(false);
                return;
            }

            // Only fetch from backend if we don't have any cached data
            try {
                const res = await authService.makeAuthenticatedRequest(
                    `${backendUrl}/api/auth/profile`
                );

                if (!res.ok) {
                    if (res.status === 401) {
                        authService.clearTokens();
                        navigate('/login', { replace: true });
                        return;
                    }
                    throw new Error('Failed to load profile');
                }

                const { user: u } = await res.json();
                if (!mounted) return;

                dispatch({ type: ACTION_TYPES.SET_USER, payload: u });
                setUser(u);
                setFormData({
                    username: u.username ?? '',
                    email: u.email ?? '',
                    bio: u.bio ?? '',
                    avatar_url: u.avatar_url ?? '',
                    gaming_style: u.gaming_style ?? '',
                    favorite_genres: u.favorite_genres ?? [],
                    created_at: u.created_at ?? '',
                    total_games: u.total_games || 0
                });
            } catch (err) {
                console.error(err);
                if (mounted) setMessage({ type: 'error', text: err.message });
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        loadProfile();

        return () => { mounted = false; };
    }, [backendUrl, navigate, dispatch, storeUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setMessage({ type: '', text: '' });
    };

    const handleGenreToggle = (genre) => {
        setFormData(prev => {
            const genres = prev.favorite_genres.includes(genre)
                ? prev.favorite_genres.filter(g => g !== genre)
                : [...prev.favorite_genres, genre];
            return { ...prev, favorite_genres: genres };
        });
    };
    const handleSave = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await authService.makeAuthenticatedRequest(
                `${backendUrl}/api/auth/profile`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                }
            );

            if (!res.ok) {
                const { error } = await res.json();
                throw new Error(error || 'Failed to update profile');
            }

            const { user: updated } = await res.json();
            setUser(updated);
            setFormData({
                username: updated.username ?? '',
                email: updated.email ?? '',
                bio: updated.bio ?? '',
                avatar_url: updated.avatar_url ?? '',
                gaming_style: updated.gaming_style ?? '',
                favorite_genres: updated.favorite_genres ?? [],
                total_games: updated.total_games || 0
            });

            setIsEditing(false);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsSaving(false);
        }
    };
   
    const handleCancel = () => {
        // Reset form data to original user data
        if (!user) return;

        setFormData({
            username: user.username || '',
            email: user.email || '',
            bio: user.bio || '',
            avatar_url: user.avatar_url || '',
            gaming_style: user.gaming_style || '',
            favorite_genres: user.favorite_genres || []
        });
        setIsEditing(false);
        setMessage({ type: '', text: '' });
    };

    const navigateToDashboard = () => navigate('/dashboard');


    const handleSteamConnect = () => {
        // Placeholder for Steam connection
        console.log('Steam connection feature coming soon!');
        setMessage({ type: 'info', text: 'Steam integration coming soon!' });
    };

    const availableGenres = [
        'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports',
        'Racing', 'Puzzle', 'Fighting', 'Shooter', 'Horror', 'Platformer',
        'MMO', 'Battle Royale', 'MOBA', 'Indie'
    ];

    const gamingStyles = [
        'Casual', 'Competitive', 'Hardcore', 'Social', 'Solo', 'Co-op'
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-white/70">Loading your profile...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            {/* Floating Particles Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 3}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="max-w-4xl mx-auto relative z-10">

                {/* Header */}
                <div className="mb-8">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
                                <p className="text-white/70">Manage your gaming profile and preferences</p>
                            </div>
                            <button
                                onClick={navigateToDashboard}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300"
                            >
                                ← Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>

                {/* Message Display */}
                {message.text && (
                    <div className="mb-6">
                        <div className={`p-4 rounded-xl border ${message.type === 'success'
                                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                                : message.type === 'error'
                                    ? 'bg-red-500/20 border-red-500/30 text-red-300'
                                    : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                            }`}>
                            {message.text}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Profile Overview */}
                    <div className="lg:col-span-1">
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                            <div className="text-center">

                                {/* Avatar */}
                                <div className="mb-6">
                                    {user?.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt="Profile Avatar"
                                            className="w-24 h-24 rounded-full mx-auto border-4 border-white/20"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full mx-auto flex items-center justify-center border-4 border-white/20">
                                            <span className="text-3xl font-bold text-white">
                                                {user?.username?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* User Info */}
                                <h2 className="text-2xl font-bold text-white mb-2">{user?.username}</h2>
                                <p className="text-white/70 mb-4">{user?.email}</p>

                                {/* Gaming Stats */}
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70">Total Games:</span>
                                        <span className="text-white font-medium">{storeUser?.total_games || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70">Steam Connected:</span>
                                        <span className={`font-medium ${storeUser?.is_steam_connected  ? 'text-green-300' : 'text-red-300'}`}>
                                            {storeUser?.is_steam_connected  ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70">Member Since:</span>
                                        <span className="text-white font-medium">
                                            {storeUser?.created_at ? new Date(storeUser.created_at).toLocaleDateString() : 'Unknown'}
                                        </span>
                                    </div>
                                </div>

                                {/* Steam Integration */}
                                {!storeUser?.is_steam_connected && (
                                    <div className="w-full">
                                        <ConnectSteamButton
                                            className="
                                        w-full py-3 px-4
                                        bg-gradient-to-r from-blue-600 to-blue-700
                                        hover:from-blue-700 hover:to-blue-800
                                        text-white font-semibold rounded-xl
                                        transition-all duration-300 transform hover:-translate-y-1
                                        shadow-lg hover:shadow-blue-500/25
                                        flex items-center justify-center space-x-2
                                    "
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Profile Details */}
                    <div className="lg:col-span-2">
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">

                            {/* Edit Toggle */}
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-bold text-white">Profile Details</h3>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-all duration-300"
                                    >
                                        ✏️ Edit Profile
                                    </button>
                                ) : (
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-300"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all duration-300 disabled:opacity-50"
                                        >
                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">

                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white/90 mb-2">Username</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            disabled={true}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white/50 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-white/50 mt-1">Username cannot be changed</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white/90 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            disabled={true}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white/50 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-white/50 mt-1">Email cannot be changed</p>
                                    </div>
                                </div>

                                {/* Bio */}
                                <div>
                                    <label className="block text-sm font-medium text-white/90 mb-2">Bio</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        rows={4}
                                        placeholder="Tell other gamers about yourself..."
                                        className={`w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 resize-none transition-all duration-300 ${isEditing
                                                ? 'focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/30'
                                                : 'cursor-not-allowed text-white/70'
                                            }`}
                                    />
                                </div>

                                {/* Avatar URL */}
                                <div>
                                    <label className="block text-sm font-medium text-white/90 mb-2">Avatar URL</label>
                                    <input
                                        type="url"
                                        name="avatar_url"
                                        value={formData.avatar_url}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="https://example.com/your-avatar.jpg"
                                        className={`w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 transition-all duration-300 ${isEditing
                                                ? 'focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/30'
                                                : 'cursor-not-allowed text-white/70'
                                            }`}
                                    />
                                </div>

                                {/* Gaming Style */}
                                <div>
                                    <label className="block text-sm font-medium text-white/90 mb-2">Gaming Style</label>
                                    <select
                                        name="gaming_style"
                                        value={formData.gaming_style}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white transition-all duration-300 ${isEditing
                                                ? 'focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/30'
                                                : 'cursor-not-allowed text-white/70'
                                            }`}
                                    >
                                        <option value="">Select your style</option>
                                        {gamingStyles.map(style => (
                                            <option key={style} value={style.toLowerCase()} className="bg-slate-800">
                                                {style}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Favorite Genres */}
                                <div>
                                    <label className="block text-sm font-medium text-white/90 mb-4">Favorite Genres</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {availableGenres.map(genre => (
                                            <button
                                                key={genre}
                                                type="button"
                                                onClick={() => isEditing && handleGenreToggle(genre)}
                                                disabled={!isEditing}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${formData.favorite_genres.includes(genre)
                                                        ? 'bg-coral-500 text-white'
                                                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                                                    } ${!isEditing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                            >
                                                {genre}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};