import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';

const Friends = () => {
    const [searchTerm, setSearchTerm] = useState('');
    
    // 🔧 FIXED: Removed placeholder URLs, using names for Avatar component
    const mockFriends = [
        {
            id: 1,
            username: 'Alex Rodriguez',
            displayName: 'Alex Rodriguez',
            avatar_url: null, // Will use Avatar component
            status: 'online',
            currentGame: 'Valorant',
            mutualGroups: 3,
            steamConnected: true
        },
        {
            id: 2,
            username: 'Tyler Brown',
            displayName: 'Tyler Brown', 
            avatar_url: null, // Will use Avatar component
            status: 'away',
            currentGame: null,
            mutualGroups: 1,
            steamConnected: true
        },
        {
            id: 3,
            username: 'Lauren Garcia',
            displayName: 'Lauren Garcia',
            avatar_url: null, // Will use Avatar component
            status: 'offline',
            currentGame: null,
            mutualGroups: 2,
            steamConnected: false
        }
    ];

    const filteredFriends = mockFriends.filter(friend =>
        friend.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        friend.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'away': return 'bg-yellow-500';
            case 'offline': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'online': return 'Online';
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
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search friends..."
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 transition-colors"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40">
                            🔍
                        </div>
                    </div>
                </div>

                {/* Friends List */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">
                            Your Friends ({filteredFriends.length})
                        </h2>
                        <button className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200">
                            + Add Friend
                        </button>
                    </div>

                    {filteredFriends.length > 0 ? (
                        <div className="space-y-4">
                            {filteredFriends.map(friend => (
                                <div key={friend.id} className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-colors duration-200 border border-white/10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="relative">
                                                {/* 🔧 FIXED: Using Avatar component instead of broken placeholder */}
                                                <Avatar name={friend.displayName} size={64} />
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800 ${getStatusColor(friend.status)}`}></div>
                                            </div>
                                            
                                            <div>
                                                <h3 className="text-white font-bold text-lg">{friend.displayName}</h3>
                                                <p className="text-white/60 text-sm">@{friend.username}</p>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <span className={`text-sm ${
                                                        friend.status === 'online' ? 'text-green-400' :
                                                        friend.status === 'away' ? 'text-yellow-400' :
                                                        'text-gray-400'
                                                    }`}>
                                                        {getStatusText(friend.status)}
                                                    </span>
                                                    {friend.currentGame && (
                                                        <>
                                                            <span className="text-white/40">•</span>
                                                            <span className="text-white/70 text-sm">Playing {friend.currentGame}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <p className="text-white/60 text-sm">
                                                    {friend.mutualGroups} mutual groups
                                                </p>
                                                <div className="flex items-center justify-end space-x-1 mt-1">
                                                    {friend.steamConnected ? (
                                                        <span className="text-green-400 text-xs">🎮 Steam Connected</span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">Steam Not Connected</span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col space-y-2">
                                                <button className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg text-sm transition-colors duration-200">
                                                    Invite to Group
                                                </button>
                                                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-sm transition-colors duration-200">
                                                    View Profile
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">👥</div>
                            <h3 className="text-xl font-bold text-white mb-2">No friends found</h3>
                            <p className="text-white/60 mb-6">
                                {searchTerm ? `No friends match "${searchTerm}"` : "You haven't added any friends yet"}
                            </p>
                            <button className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200">
                                Find Friends
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="mt-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Link 
                            to="/dashboard"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">🎮</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Find Games</h4>
                                <p className="text-white/60 text-sm">Discover common games</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="/dashboard"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">👥</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Create Group</h4>
                                <p className="text-white/60 text-sm">Start a gaming squad</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="/profile"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">⚙️</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Settings</h4>
                                <p className="text-white/60 text-sm">Manage your profile</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Friends;