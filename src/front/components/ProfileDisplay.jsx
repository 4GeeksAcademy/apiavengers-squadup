// src/front/components/ProfileDisplay.jsx - Profile Information Display Component

import React from 'react';

/**
 * ProfileDisplay Component
 * Displays profile information in read-only mode
 * Extracted from Profile.jsx to improve component organization
 */
const ProfileDisplay = ({ 
    user, 
    onEdit,
    className = "" 
}) => {
    if (!user) {
        return (
            <div className={`space-y-6 ${className}`}>
                <div className="text-white/60 text-center py-8">
                    <span>⚠️ No user data available</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Username Field */}
            <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">
                    Username
                </label>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white font-medium">{user.username}</p>
                    <p className="text-white/50 text-xs mt-1">
                        Username cannot be changed
                    </p>
                </div>
            </div>
            
            {/* Email Field */}
            <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">
                    Email
                </label>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white">{user.email}</p>
                    <p className="text-white/50 text-xs mt-1">
                        Email cannot be changed
                    </p>
                </div>
            </div>
            
            {/* Bio Field */}
            <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">
                    Bio
                </label>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10 min-h-[80px]">
                    {user.bio ? (
                        <p className="text-white whitespace-pre-wrap">{user.bio}</p>
                    ) : (
                        <p className="text-white/60 italic">
                            Tell other gamers about yourself...
                        </p>
                    )}
                </div>
            </div>
            
            {/* Gaming Style Field */}
            <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">
                    Gaming Style
                </label>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    {user.gaming_style ? (
                        <div className="flex items-center space-x-3">
                            <span className="px-3 py-1 bg-coral-500/20 text-coral-300 rounded-full text-sm border border-coral-500/30">
                                {user.gaming_style}
                            </span>
                        </div>
                    ) : (
                        <p className="text-white/60 italic">No gaming style selected</p>
                    )}
                </div>
            </div>
            
            {/* Favorite Genres Field */}
            <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">
                    Favorite Genres
                </label>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10 min-h-[60px] flex flex-wrap gap-2 items-start">
                    {user.favorite_genres && user.favorite_genres.length > 0 ? (
                        user.favorite_genres.map(genre => (
                            <span 
                                key={genre} 
                                className="px-3 py-1 bg-coral-500/20 text-coral-300 rounded-full text-sm border border-coral-500/30"
                            >
                                {genre}
                            </span>
                        ))
                    ) : (
                        <span className="text-white/60 italic self-center">
                            No genres selected
                        </span>
                    )}
                </div>
            </div>
            
            {/* Account Information */}
            <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">
                    Account Information
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Member Since */}
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-white/70 text-xs mb-1">Member Since</p>
                        <p className="text-white font-medium">
                            {new Date(user.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    
                    {/* Steam Connection Status */}
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-white/70 text-xs mb-1">Steam Status</p>
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                                user.steam_connected || user.is_steam_connected 
                                    ? 'bg-green-400' 
                                    : 'bg-red-400'
                            }`}></div>
                            <p className={`text-sm font-medium ${
                                user.steam_connected || user.is_steam_connected 
                                    ? 'text-green-400' 
                                    : 'text-red-400'
                            }`}>
                                {user.steam_connected || user.is_steam_connected ? 'Connected' : 'Not Connected'}
                            </p>
                        </div>
                        {user.steam_username && (
                            <p className="text-white/60 text-xs mt-1">
                                {user.steam_username}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Gaming Statistics */}
            {(user.total_games > 0 || user.steam_connected || user.is_steam_connected) && (
                <div>
                    <label className="block text-white/70 text-sm mb-2 font-medium">
                        Gaming Statistics
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Games */}
                        {user.total_games > 0 && (
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                                <p className="text-2xl font-bold text-coral-400">
                                    {user.total_games}
                                </p>
                                <p className="text-white/70 text-xs">
                                    Games in Library
                                </p>
                            </div>
                        )}
                        
                        {/* Groups (if available) */}
                        {user.groups_count !== undefined && (
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                                <p className="text-2xl font-bold text-blue-400">
                                    {user.groups_count || 0}
                                </p>
                                <p className="text-white/70 text-xs">
                                    Groups Joined
                                </p>
                            </div>
                        )}
                        
                        {/* Friends (if available) */}
                        {user.friends_count !== undefined && (
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                                <p className="text-2xl font-bold text-purple-400">
                                    {user.friends_count || 0}
                                </p>
                                <p className="text-white/70 text-xs">
                                    Friends
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Last Activity */}
            {user.last_login && (
                <div>
                    <label className="block text-white/70 text-sm mb-2 font-medium">
                        Recent Activity
                    </label>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-white/60 text-sm">
                            Last login: {new Date(user.last_login).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                        {user.steam_library_synced_at && (
                            <p className="text-white/60 text-sm mt-1">
                                Steam library synced: {new Date(user.steam_library_synced_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        )}
                    </div>
                </div>
            )}
            
            {/* Edit Button */}
            <button 
                onClick={onEdit}
                className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
            >
                <span>✏️</span>
                Edit Profile
            </button>
        </div>
    );
};

export default ProfileDisplay;