import React, { useState, useEffect } from 'react';

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

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${backendUrl}/api/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                setFormData({
                    username: data.user.username || '',
                    email: data.user.email || '',
                    bio: data.user.bio || '',
                    avatar_url: data.user.avatar_url || '',
                    gaming_style: data.user.gaming_style || '',
                    favorite_genres: data.user.favorite_genres || []
                });
            } else {
                setMessage({ type: 'error', text: 'Failed to load profile' });
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            setMessage({ type: 'error', text: 'Network error loading profile' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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

        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${backendUrl}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bio: formData.bio,
                    avatar_url: formData.avatar_url,
                    gaming_style: formData.gaming_style,
                    favorite_genres: formData.favorite_genres
                })
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
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
        // Reset form data to original user data
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

    const navigateToDashboard = () => {
        window.location.href = '/dashboard';
    };

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
                        <div className={`p-4 rounded-xl border ${
                            message.type === 'success' 
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
                                        <span className="text-white font-medium">{user?.total_games || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70">Steam Connected:</span>
                                        <span className={`font-medium ${user?.steam_connected ? 'text-green-300' : 'text-red-300'}`}>
                                            {user?.steam_connected ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70">Member Since:</span>
                                        <span className="text-white font-medium">
                                            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                                        </span>
                                    </div>
                                </div>

                                {/* Steam Integration */}
                                {!user?.steam_connected && (
                                    <button
                                        onClick={handleSteamConnect}
                                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center space-x-2"
                                    >
                                        <span className="text-lg">🎮</span>
                                        <span>Connect Steam</span>
                                    </button>
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
                                        className={`w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 resize-none transition-all duration-300 ${
                                            isEditing 
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
                                        className={`w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 transition-all duration-300 ${
                                            isEditing 
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
                                        className={`w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white transition-all duration-300 ${
                                            isEditing 
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
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                                    formData.favorite_genres.includes(genre)
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