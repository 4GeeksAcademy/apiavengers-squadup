import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Friends = () => {
    const [searchTerm, setSearchTerm] = useState('');
    
    // Mock data for demonstration - this won't break your existing code
    const mockFriends = [
        {
            id: 1,
            username: 'GamerPro2024',
            steam_username: 'Alex Rivera',
            avatar_url: 'https://via.placeholder.com/64x64/ff7f50/ffffff?text=AR',
            status: 'online',
            last_game: 'Valorant',
            is_favorite: true
        },
        {
            id: 2,
            username: 'Tyler_Beast',
            steam_username: 'Tyler B',
            avatar_url: 'https://via.placeholder.com/64x64/0ea5e9/ffffff?text=TB',
            status: 'playing',
            last_game: 'Apex Legends',
            is_favorite: false
        },
        {
            id: 3,
            username: 'Luna_Gaming',
            steam_username: 'Luna G',
            avatar_url: 'https://via.placeholder.com/64x64/a855f7/ffffff?text=LG',
            status: 'offline',
            last_game: 'Minecraft',
            is_favorite: true
        }
    ];

    const filteredFriends = mockFriends.filter(friend =>
        friend.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        friend.steam_username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const favoriteFriends = filteredFriends.filter(friend => friend.is_favorite);
    const regularFriends = filteredFriends.filter(friend => !friend.is_favorite);

    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return 'bg-green-400';
            case 'playing': return 'bg-blue-400';
            case 'away': return 'bg-yellow-400';
            case 'offline': return 'bg-gray-400';
            default: return 'bg-gray-400';
        }
    };

    const getStatusText = (status, lastGame) => {
        switch (status) {
            case 'online': return 'Online';
            case 'playing': return `Playing ${lastGame}`;
            case 'away': return 'Away';
            case 'offline': return 'Offline';
            default: return 'Unknown';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-4xl mx-auto relative z-10">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Friends</h1>
                        <p className="text-white/70">Connect with your gaming squad</p>
                    </div>
                    <Link 
                        to="/dashboard"
                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Search Bar */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 mb-8">
                    <div className="flex items-center space-x-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search friends..."
                                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 transition-colors"
                            />
                        </div>
                        <button className="px-6 py-3 bg-marine-500 hover:bg-marine-600 text-white font-medium rounded-xl transition-colors duration-200">
                            + Add Friend
                        </button>
                    </div>
                </div>

                {/* Demo Notice */}
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
                    <div className="flex items-center space-x-2">
                        <span>ℹ️</span>
                        <div>
                            <strong>Demo Mode:</strong> This page shows mock friend data for presentation purposes. 
                            Real friend functionality will be implemented in future updates.
                        </div>
                    </div>
                </div>

                {/* Favorite Friends */}
                {favoriteFriends.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                            <span className="text-yellow-400 mr-2">⭐</span>
                            Favorite Friends ({favoriteFriends.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {favoriteFriends.map(friend => (
                                <div key={friend.id} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                                    <div className="flex items-center space-x-4">
                                        <div className="relative">
                                            <img 
                                                src={friend.avatar_url} 
                                                alt={friend.username}
                                                className="w-16 h-16 rounded-full object-cover"
                                            />
                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${getStatusColor(friend.status)} rounded-full border-2 border-slate-800`}></div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-lg">{friend.username}</h3>
                                            <p className="text-white/70 text-sm">{friend.steam_username}</p>
                                            <p className="text-white/60 text-xs mt-1">
                                                {getStatusText(friend.status, friend.last_game)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col space-y-2">
                                            <button className="px-3 py-1 bg-marine-500 hover:bg-marine-600 text-white text-xs rounded-lg transition-colors">
                                                Message
                                            </button>
                                            <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg transition-colors">
                                                Invite
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Friends */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                        <span className="text-blue-400 mr-2">👥</span>
                        All Friends ({regularFriends.length})
                    </h2>
                    
                    {regularFriends.length > 0 ? (
                        <div className="space-y-4">
                            {regularFriends.map(friend => (
                                <div key={friend.id} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="relative">
                                                <img 
                                                    src={friend.avatar_url} 
                                                    alt={friend.username}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(friend.status)} rounded-full border-2 border-slate-800`}></div>
                                            </div>
                                            <div>
                                                <h3 className="text-white font-medium">{friend.username}</h3>
                                                <p className="text-white/70 text-sm">{friend.steam_username}</p>
                                                <p className="text-white/60 text-xs">
                                                    {getStatusText(friend.status, friend.last_game)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg transition-colors" title="Add to favorites">
                                                ⭐
                                            </button>
                                            <button className="p-2 bg-marine-500/20 hover:bg-marine-500/30 text-marine-300 rounded-lg transition-colors" title="Message">
                                                💬
                                            </button>
                                            <button className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors" title="Invite to group">
                                                ➕
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 text-center">
                            <div className="text-6xl mb-4">👥</div>
                            <h3 className="text-2xl font-bold text-white mb-4">No Friends Yet</h3>
                            <p className="text-white/70 mb-6">
                                Start connecting with other gamers by joining groups or sending friend requests
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link 
                                    to="/dashboard"
                                    className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                                >
                                    Find Groups
                                </Link>
                                <button className="px-6 py-3 bg-marine-500 hover:bg-marine-600 text-white font-medium rounded-xl transition-colors duration-200">
                                    Discover Players
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Future Features */}
                <div className="mt-12 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-4">Coming Soon</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">🔍</span>
                            <div>
                                <h4 className="text-white font-medium">Friend Discovery</h4>
                                <p className="text-white/60 text-sm">Find players based on games and preferences</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">💬</span>
                            <div>
                                <h4 className="text-white font-medium">Direct Messaging</h4>
                                <p className="text-white/60 text-sm">Chat directly with friends</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">🎮</span>
                            <div>
                                <h4 className="text-white font-medium">Activity Feed</h4>
                                <p className="text-white/60 text-sm">See what games your friends are playing</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">📊</span>
                            <div>
                                <h4 className="text-white font-medium">Friend Stats</h4>
                                <p className="text-white/60 text-sm">Compare gaming stats and achievements</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Friends;