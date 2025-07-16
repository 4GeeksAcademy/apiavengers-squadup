import React, { useState, useEffect, useCallback } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import { ACTION_TYPES } from '../store/store';
import { ConnectSteamButton } from "../components/ConnectSteamButton";
import { steamApi } from '../store/steamapi';

export const Profile = () => {
    const { store, dispatch } = useGlobalReducer();
    const { user: storeUser } = store;
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        bio: '',
        avatar_url: '',
        gaming_style: '',
        favorite_genres: [],
        created_at: '',
        total_games: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [gameList, setGameList] = useState([]);
    const [isGamesLoading, setIsGamesLoading] = useState(false);
    const [gamesError, setGamesError] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState("");

    const navigate = useNavigate();
    const backendUrl = authService.getApiUrl();

    // Load profile data
    const loadProfile = useCallback(async () => {
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
            setUser(storeUser);
            setIsLoading(false);
            return;
        }

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
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [backendUrl, navigate, dispatch, storeUser]);

    // Helper to refresh profile
    const refreshUserProfile = async () => {
        setIsLoading(true);
        await loadProfile();
        setIsLoading(false);
    };

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        const fetchGames = async () => {
            if (storeUser?.is_steam_connected) {
                setIsGamesLoading(true);
                setGamesError("");
                try {
                    const res = await steamApi.getMyLibrary();
                    if (res.ok) {
                        const data = await res.json();
                        setGameList(data.games || []);
                    } else {
                        setGamesError("Failed to load game library");
                    }
                } catch (err) {
                    setGamesError("Error loading game library");
                } finally {
                    setIsGamesLoading(false);
                }
            } else {
                setGameList([]);
            }
        };
        fetchGames();
    }, [storeUser?.is_steam_connected]);

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
                    body: JSON.stringify({
                        bio: formData.bio,
                        avatar_url: formData.avatar_url,
                        gaming_style: formData.gaming_style,
                        favorite_genres: formData.favorite_genres
                    }),
                }
            );

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to update profile');
            }

            const { user: updated } = await res.json();
            setUser(updated);
            setFormData(prev => ({
                ...prev,
                bio: updated.bio ?? '',
                avatar_url: updated.avatar_url ?? '',
                gaming_style: updated.gaming_style ?? '',
                favorite_genres: updated.favorite_genres ?? []
            }));

            setIsEditing(false);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            dispatch({ type: ACTION_TYPES.SET_USER, payload: updated });
            toast.success('Profile updated successfully!');
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: err.message });
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset form data to current user data
        setFormData({
            username: user?.username ?? '',
            email: user?.email ?? '',
            bio: user?.bio ?? '',
            avatar_url: user?.avatar_url ?? '',
            gaming_style: user?.gaming_style ?? '',
            favorite_genres: user?.favorite_genres ?? [],
            created_at: user?.created_at ?? '',
            total_games: user?.total_games || 0
        });
        setIsEditing(false);
        setMessage({ type: '', text: '' });
    };

    const navigateToDashboard = () => {
        navigate('/dashboard');
    };

    const handleSteamConnect = async () => {
        try {
            const response = await authService.makeAuthenticatedRequest(
                `${backendUrl}/api/auth/steam/login`
            );

            if (response.ok) {
                const { steam_auth_url } = await response.json();
                window.location.href = steam_auth_url;
            } else {
                toast.error('Failed to initiate Steam connection');
            }
        } catch (error) {
            console.error('Error connecting Steam:', error);
            toast.error('Network error connecting to Steam');
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect your Steam account? This will clear your game library.')) {
            return;
        }

        const loadingToast = toast.loading('Disconnecting Steam account...');

        try {
            const response = await authService.makeAuthenticatedRequest(
                `${backendUrl}/api/auth/steam/disconnect`,
                { method: 'POST' }
            );

            if (response.ok) {
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

    const handleSyncLibrary = async () => {
        if (!storeUser.is_steam_connected) {
            toast.error('Please connect your Steam account first');
            return;
        }

        setIsSyncing(true);
        setSyncMessage('');
        const loadingToast = toast.loading('Syncing Steam library...');

        try {
            const response = await authService.makeAuthenticatedRequest(
                `${backendUrl}/api/steam/sync-games`,
                { method: 'POST' }
            );

            if (response.ok) {
                const data = await response.json();
                toast.dismiss(loadingToast);
                setSyncMessage(data.message || `Synced ${data.new_games} new games and updated ${data.updated_games} games`);
                toast.success(data.message || `Synced ${data.new_games} new games and updated ${data.updated_games} games`);
                await refreshUserProfile();
            } else {
                const errorData = await response.json();
                toast.dismiss(loadingToast);
                setSyncMessage(errorData.error || 'Failed to sync library');
                toast.error(errorData.error || 'Failed to sync library');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            setSyncMessage('Network error syncing library');
            toast.error('Network error syncing library');
        } finally {
            setIsSyncing(false);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 relative">
            {/* Floating Particles Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
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

            <div className="max-w-6xl mx-auto relative z-10">

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

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

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
                                        <div className="mb-4 mx-auto border-4 border-white/20 rounded-full" style={{ width: '128px', height: '128px' }}>
                                            <Avatar
                                                name={formData.username || 'User'}
                                                size={120}
                                                className="border-none"
                                            />
                                        </div>
                                    )}

                                    <h2 className="text-2xl font-bold text-white">{formData.username}</h2>
                                    {storeUser.steam_username && (
                                        <p className="text-white/60 mt-1">{storeUser.steam_username} (Steam)</p>
                                    )}
                                </div>

                                {/* Steam Connection Status */}
                                <div className="w-full p-6 bg-white/5 rounded-xl border border-white/10 mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-white font-medium">Steam Status</span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${storeUser.is_steam_connected
                                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            }`}>
                                            {storeUser.is_steam_connected ? 'Connected' : 'Not Connected'}
                                        </span>
                                    </div>

                                    {storeUser.is_steam_connected ? (
                                        <div className="space-y-3">
                                            <p className="text-white/80">
                                                <span className="text-coral-400 font-semibold">{storeUser.total_games || 0}</span> games in library
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
                                            <ConnectSteamButton
                                                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center space-x-2"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* User Info */}
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70">Total Games:</span>
                                        <span className="text-white font-medium">{storeUser?.total_games || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70">Member Since:</span>
                                        <span className="text-white font-medium">
                                            {storeUser?.created_at ? new Date(storeUser.created_at).toLocaleDateString() : 'Unknown'}
                                        </span>
                                    </div>
                                </div>
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
                                                        <p className="text-white">{new Date(storeUser.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
                                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${formData.favorite_genres && formData.favorite_genres.includes(genre)
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

                    {/* Game List Panel */}
                    <div className="lg:col-span-1 hidden lg:block">
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl h-full flex flex-col">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span role="img" aria-label="games">🎮</span> My Games
                            </h3>
                            {storeUser?.is_steam_connected && (
                                <button
                                    onClick={handleSyncLibrary}
                                    disabled={isSyncing || isGamesLoading}
                                    className="mb-4 w-full p-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
                                >
                                    {isSyncing ? 'Syncing...' : '🔄 Sync Game Library'}
                                </button>
                            )}
                            {syncMessage && (
                                <div className={`mb-2 text-center text-sm ${syncMessage.includes('error') || syncMessage.includes('fail') ? 'text-red-300' : 'text-green-300'}`}>{syncMessage}</div>
                            )}
                            {isGamesLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <span className="text-white/70">Loading games...</span>
                                </div>
                            ) : gamesError ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <span className="text-red-300">{gamesError}</span>
                                </div>
                            ) : gameList.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <span className="text-white/70">
                                        {storeUser?.is_steam_connected ? 'No games found.' : 'Connect Steam to see your games.'}
                                    </span>
                                </div>
                            ) : (
                                <ul className="overflow-y-auto flex-1 space-y-2 pr-2 max-h-[120vh]">
                                    {gameList.map((game) => (
                                        <li key={game.id} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/90 flex items-center gap-2">
                                            {game.icon_url && (
                                                <img src={game.icon_url} alt={game.name} className="w-8 h-8 rounded mr-2" />
                                            )}
                                            <span className="truncate">{game.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};