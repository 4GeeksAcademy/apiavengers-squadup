// src/front/pages/Friends.jsx - REFACTORED with Component Extraction

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import toast from 'react-hot-toast';

// 🎯 NEW: Import extracted components
import FriendCard from '../components/FriendCard';
import FriendSearch from '../components/FriendSearch';
import AddFriendModal from '../components/AddFriendModal';

// Import standardized loading and error states
import { PageLoadingState, DataLoadingState } from '../components/LoadingState';
import { NetworkErrorState } from '../components/ErrorState';

const Friends = () => {
    const { store } = useGlobalReducer();
    const { user } = store;
    
    // Core state
    const [friends, setFriends] = useState([]);
    const [filteredFriends, setFilteredFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    
    // Modal state
    const [showAddFriendModal, setShowAddFriendModal] = useState(false);
    
    // Search state (managed by FriendSearch component)
    const [currentSearch, setCurrentSearch] = useState({
        term: '',
        filter: 'all',
        sortBy: 'name'
    });

    // Load friends on component mount
    useEffect(() => {
        if (user) {
            loadFriends();
        }
    }, [user]);

    /**
     * Load friends from API (or use mock data for now)
     */
    const loadFriends = async (silent = false) => {
        if (!silent) setLoading(true);
        if (silent) setRefreshing(true);
        
        try {
            // TODO: Replace with actual API call when friends endpoint is ready
            // For now, using enhanced mock data
            const mockFriends = [
                {
                    id: 1,
                    username: 'alexrodriguez',
                    displayName: 'Alex Rodriguez',
                    avatar_url: null,
                    status: 'online',
                    currentGame: 'Valorant',
                    mutualGroups: 3,
                    steamConnected: true,
                    totalGames: 127,
                    bio: 'Competitive FPS player, love tactical shooters and team coordination',
                    gamingStyle: 'Competitive',
                    favoriteGenres: ['Shooter', 'Action', 'Strategy'],
                    lastOnline: new Date().toISOString()
                },
                {
                    id: 2,
                    username: 'tylerbrown',
                    displayName: 'Tyler Brown',
                    avatar_url: null,
                    status: 'away',
                    currentGame: null,
                    mutualGroups: 1,
                    steamConnected: true,
                    totalGames: 89,
                    bio: 'Casual gamer who enjoys co-op adventures and indie games',
                    gamingStyle: 'Casual',
                    favoriteGenres: ['Adventure', 'Indie', 'Co-op'],
                    lastOnline: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
                },
                {
                    id: 3,
                    username: 'laurengarcia',
                    displayName: 'Lauren Garcia',
                    avatar_url: null,
                    status: 'offline',
                    currentGame: null,
                    mutualGroups: 2,
                    steamConnected: false,
                    totalGames: 0,
                    bio: 'New to PC gaming, looking for patient squad mates to learn with',
                    gamingStyle: 'Social',
                    favoriteGenres: ['Puzzle', 'Simulation', 'Social'],
                    lastOnline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
                },
                {
                    id: 4,
                    username: 'mikechenosu',
                    displayName: 'Mike Chen',
                    avatar_url: null,
                    status: 'online',
                    currentGame: 'Rocket League',
                    mutualGroups: 4,
                    steamConnected: true,
                    totalGames: 203,
                    bio: 'Rocket League veteran, always down for ranked matches and freestyle sessions',
                    gamingStyle: 'Hardcore',
                    favoriteGenres: ['Sports', 'Racing', 'Action'],
                    lastOnline: new Date().toISOString()
                },
                {
                    id: 5,
                    username: 'samanthalee',
                    displayName: 'Sam Lee',
                    avatar_url: null,
                    status: 'away',
                    currentGame: 'Minecraft',
                    mutualGroups: 1,
                    steamConnected: true,
                    totalGames: 156,
                    bio: 'Builder and explorer, love creative games and collaborative projects',
                    gamingStyle: 'Solo',
                    favoriteGenres: ['Simulation', 'Sandbox', 'Creative'],
                    lastOnline: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
                }
            ];

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, silent ? 500 : 1000));
            
            setFriends(mockFriends);
            setFilteredFriends(mockFriends);
            setError(null);
            
            /* TODO: Uncomment when friends API is ready
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/friends`);
            
            if (response.ok) {
                const data = await response.json();
                setFriends(data.friends || []);
                setFilteredFriends(data.friends || []);
                setError(null);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to load friends');
                if (!silent) {
                    toast.error('Failed to load friends');
                }
            }
            */
            
        } catch (error) {
            console.error('Error loading friends:', error);
            setError('Network error loading friends');
            if (!silent) {
                toast.error('Network error loading friends');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    /**
     * Handle search results from FriendSearch component
     */
    const handleSearchResults = (results, searchTerm, filter, sortBy) => {
        setFilteredFriends(results);
        setCurrentSearch({ term: searchTerm, filter, sortBy });
    };

    /**
     * Handle add friend action
     */
    const handleAddFriend = () => {
        setShowAddFriendModal(true);
    };

    /**
     * Handle friend added from modal
     */
    const handleFriendAdded = (newFriend, action) => {
        if (action === 'invite_sent') {
            // Friend invite sent, don't add to list yet
            // Will be added when they accept the invitation
            toast.success(`Friend invitation sent to ${newFriend.username}!`);
        } else if (action === 'added') {
            // Friend actually added to list
            setFriends(prev => [...prev, newFriend]);
            toast.success(`${newFriend.username} added as friend!`);
        }
    };

    /**
     * Handle invite friend to group
     */
    const handleInviteToGroup = async (friend) => {
        // TODO: Implement group invitation logic
        toast.info(`Group invitation feature coming soon! (${friend.displayName})`);
    };

    /**
     * Handle view friend profile
     */
    const handleViewProfile = async (friend) => {
        // TODO: Implement profile viewing logic
        toast.info(`Profile viewing coming soon! (${friend.displayName})`);
    };

    /**
     * Handle remove friend
     */
    const handleRemoveFriend = async (friend) => {
        try {
            // TODO: Replace with actual API call when friends endpoint is ready
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setFriends(prev => prev.filter(f => f.id !== friend.id));
            setFilteredFriends(prev => prev.filter(f => f.id !== friend.id));
            
            /* TODO: Uncomment when friends API is ready
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/friends/${friend.id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                setFriends(prev => prev.filter(f => f.id !== friend.id));
                setFilteredFriends(prev => prev.filter(f => f.id !== friend.id));
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to remove friend');
            }
            */
        } catch (error) {
            console.error('Error removing friend:', error);
            throw error; // Re-throw so FriendCard can handle the error
        }
    };

    /**
     * Handle manual refresh
     */
    const handleRefresh = () => {
        loadFriends(true);
    };

    // Calculate friends statistics
    const friendsStats = {
        total: friends.length,
        online: friends.filter(f => f.status === 'online').length,
        steamConnected: friends.filter(f => f.steamConnected).length,
        playing: friends.filter(f => f.currentGame).length
    };

    // Loading state
    if (loading) {
        return <PageLoadingState 
            message="Loading your friends..." 
            subMessage="Fetching gaming network data" 
        />;
    }

    // Error state
    if (error && friends.length === 0) {
        return <NetworkErrorState 
            error={error}
            onRetry={loadFriends}
            onRefresh={() => window.location.reload()}
            helpText="Check your connection and try again."
        />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-6xl mx-auto relative z-10">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Friends</h1>
                        <p className="text-white/70">Connect with your gaming squad</p>
                        
                        {/* Friends Statistics */}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                            <div className="flex items-center space-x-2">
                                <span className="text-white/60">👥</span>
                                <span className="text-white">{friendsStats.total} total friends</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-green-400">●</span>
                                <span className="text-white">{friendsStats.online} online</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-white/60">🎮</span>
                                <span className="text-white">{friendsStats.steamConnected} Steam connected</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-white/60">🎯</span>
                                <span className="text-white">{friendsStats.playing} currently playing</span>
                            </div>
                            {refreshing && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span className="text-white/60">Refreshing...</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl text-sm transition-colors duration-200 disabled:opacity-50"
                            title="Refresh friends list"
                        >
                            {refreshing ? '⏳' : '🔄'} Refresh
                        </button>
                        
                        <Link 
                            to="/dashboard"
                            className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Error Banner (if error but some friends loaded) */}
                {error && friends.length > 0 && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleRefresh}
                                    className="px-3 py-1 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-xs transition-colors"
                                >
                                    Retry
                                </button>
                                <button
                                    onClick={() => setError(null)}
                                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Component */}
                <FriendSearch
                    friends={friends}
                    onSearchResults={handleSearchResults}
                    onAddFriend={handleAddFriend}
                    placeholder="Search friends by name, game, or interests..."
                    className="mb-8"
                />

                {/* Friends List */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">
                            Your Friends ({filteredFriends.length})
                        </h2>
                        
                        {/* Search summary */}
                        {currentSearch.term && (
                            <div className="text-white/60 text-sm">
                                {filteredFriends.length === friends.length ? (
                                    `All friends shown`
                                ) : (
                                    `${filteredFriends.length} of ${friends.length} friends`
                                )}
                            </div>
                        )}
                    </div>

                    {filteredFriends.length > 0 ? (
                        <div className="space-y-4">
                            {filteredFriends.map(friend => (
                                <FriendCard
                                    key={friend.id}
                                    friend={friend}
                                    onInviteToGroup={handleInviteToGroup}
                                    onViewProfile={handleViewProfile}
                                    onRemoveFriend={handleRemoveFriend}
                                />
                            ))}
                        </div>
                    ) : friends.length === 0 ? (
                        /* No friends at all */
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">👥</div>
                            <h3 className="text-xl font-bold text-white mb-2">No friends yet</h3>
                            <p className="text-white/60 mb-6">
                                Start building your gaming network by adding friends
                            </p>
                            <button 
                                onClick={handleAddFriend}
                                className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                            >
                                Add Your First Friend
                            </button>
                        </div>
                    ) : (
                        /* Filtered results empty */
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🔍</div>
                            <h3 className="text-xl font-bold text-white mb-2">No friends found</h3>
                            <p className="text-white/60 mb-6">
                                {currentSearch.term ? (
                                    `No friends match "${currentSearch.term}" with current filters`
                                ) : (
                                    `No friends match the current filters`
                                )}
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="mt-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Link 
                            to="/find-games"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">🎮</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Find Games</h4>
                                <p className="text-white/60 text-sm">Discover common games with friends</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="/dashboard"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">👥</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Create Group</h4>
                                <p className="text-white/60 text-sm">Start a gaming squad with friends</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="/profile"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">⚙️</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Settings</h4>
                                <p className="text-white/60 text-sm">Manage your profile and preferences</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Friends Tips */}
                <div className="mt-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                        <span className="text-2xl mr-2">💡</span>
                        Friends Tips
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-white font-medium mb-2">Finding Friends</h4>
                                <ul className="text-white/70 text-sm space-y-1">
                                    <li>• Search by username, email, or Steam ID</li>
                                    <li>• Connect Steam account for better matching</li>
                                    <li>• Join groups to meet like-minded gamers</li>
                                    <li>• Invite friends from other platforms</li>
                                </ul>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-white font-medium mb-2">Building Your Network</h4>
                                <ul className="text-white/70 text-sm space-y-1">
                                    <li>• Complete your profile for better discoverability</li>
                                    <li>• Add favorite genres and gaming style</li>
                                    <li>• Be active in group voting and discussions</li>
                                    <li>• Share your favorite games and achievements</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Friend Modal */}
            <AddFriendModal
                isOpen={showAddFriendModal}
                onClose={() => setShowAddFriendModal(false)}
                onFriendAdded={handleFriendAdded}
            />
        </div>
    );
};

export default Friends;