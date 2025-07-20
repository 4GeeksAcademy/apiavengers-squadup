// src/front/components/FriendCard.jsx - Individual Friend Display Component

import React, { useState } from 'react';
import Avatar from './Avatar';
import toast from 'react-hot-toast';

/**
 * FriendCard Component
 * Displays individual friend information with action buttons
 * Extracted from Friends.jsx for better component organization
 */
const FriendCard = ({ 
    friend, 
    onInviteToGroup,
    onViewProfile,
    onRemoveFriend,
    className = ""
}) => {
    const [actionLoading, setActionLoading] = useState({});

    /**
     * Get status color based on friend's online status
     */
    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'away': return 'bg-yellow-500';
            case 'offline': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    /**
     * Get status text
     */
    const getStatusText = (status) => {
        switch (status) {
            case 'online': return 'Online';
            case 'away': return 'Away';
            case 'offline': return 'Offline';
            default: return 'Unknown';
        }
    };

    /**
     * Handle invite to group action
     */
    const handleInviteToGroup = async () => {
        setActionLoading(prev => ({ ...prev, invite: true }));
        
        try {
            if (onInviteToGroup) {
                await onInviteToGroup(friend);
            } else {
                // Default behavior - show coming soon message
                toast.info('Group invitation feature coming soon!');
            }
        } catch (error) {
            console.error('Error inviting friend to group:', error);
            toast.error('Failed to invite friend to group');
        } finally {
            setActionLoading(prev => ({ ...prev, invite: false }));
        }
    };

    /**
     * Handle view profile action
     */
    const handleViewProfile = async () => {
        setActionLoading(prev => ({ ...prev, profile: true }));
        
        try {
            if (onViewProfile) {
                await onViewProfile(friend);
            } else {
                // Default behavior - show coming soon message
                toast.info('Friend profile viewing coming soon!');
            }
        } catch (error) {
            console.error('Error viewing friend profile:', error);
            toast.error('Failed to view friend profile');
        } finally {
            setActionLoading(prev => ({ ...prev, profile: false }));
        }
    };

    /**
     * Handle remove friend action
     */
    const handleRemoveFriend = async () => {
        if (!window.confirm(`Remove ${friend.displayName || friend.username} from your friends?`)) {
            return;
        }

        setActionLoading(prev => ({ ...prev, remove: true }));
        
        try {
            if (onRemoveFriend) {
                await onRemoveFriend(friend);
                toast.success(`Removed ${friend.displayName || friend.username} from friends`);
            } else {
                // Default behavior - show coming soon message
                toast.info('Remove friend feature coming soon!');
            }
        } catch (error) {
            console.error('Error removing friend:', error);
            toast.error('Failed to remove friend');
        } finally {
            setActionLoading(prev => ({ ...prev, remove: false }));
        }
    };

    if (!friend) {
        return null;
    }

    return (
        <div className={`bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-colors duration-200 border border-white/10 ${className}`}>
            <div className="flex items-center justify-between">
                {/* Friend Info Section */}
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        {/* Avatar */}
                        {friend.avatar_url ? (
                            <img 
                                src={friend.avatar_url} 
                                alt={friend.displayName || friend.username}
                                className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        
                        {/* Avatar component fallback */}
                        <div 
                            className={`${friend.avatar_url ? 'hidden' : 'flex'} w-16 h-16 border-2 border-white/20 rounded-full`}
                        >
                            <Avatar 
                                name={friend.displayName || friend.username} 
                                size={60} 
                                className="border-none"
                            />
                        </div>
                        
                        {/* Status indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800 ${getStatusColor(friend.status)}`}></div>
                    </div>
                    
                    {/* Friend Details */}
                    <div>
                        <h3 className="text-white font-bold text-lg">
                            {friend.displayName || friend.username}
                        </h3>
                        <p className="text-white/60 text-sm">@{friend.username}</p>
                        
                        {/* Status and Activity */}
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

                {/* Friend Stats and Actions */}
                <div className="flex items-center space-x-4">
                    {/* Stats Section */}
                    <div className="text-right">
                        <p className="text-white/60 text-sm">
                            {friend.mutualGroups || 0} mutual groups
                        </p>
                        <div className="flex items-center justify-end space-x-1 mt-1">
                            {friend.steamConnected ? (
                                <span className="text-green-400 text-xs flex items-center">
                                    <span className="mr-1">🎮</span>
                                    Steam Connected
                                </span>
                            ) : (
                                <span className="text-gray-400 text-xs">
                                    Steam Not Connected
                                </span>
                            )}
                        </div>
                        
                        {/* Additional stats */}
                        {friend.totalGames && (
                            <div className="text-white/50 text-xs mt-1">
                                {friend.totalGames} games
                            </div>
                        )}
                        
                        {friend.lastOnline && friend.status === 'offline' && (
                            <div className="text-white/40 text-xs mt-1">
                                Last seen: {new Date(friend.lastOnline).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2">
                        <button 
                            onClick={handleInviteToGroup}
                            disabled={actionLoading.invite}
                            className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {actionLoading.invite ? (
                                <div className="flex items-center">
                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-1"></div>
                                    Inviting...
                                </div>
                            ) : (
                                'Invite to Group'
                            )}
                        </button>
                        
                        <button 
                            onClick={handleViewProfile}
                            disabled={actionLoading.profile}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-sm transition-colors duration-200 disabled:opacity-50"
                        >
                            {actionLoading.profile ? (
                                <div className="flex items-center">
                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-1"></div>
                                    Loading...
                                </div>
                            ) : (
                                'View Profile'
                            )}
                        </button>
                        
                        {/* Remove friend button (optional, shown on hover or for certain states) */}
                        <button 
                            onClick={handleRemoveFriend}
                            disabled={actionLoading.remove}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-medium rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 opacity-60 hover:opacity-100"
                            title={`Remove ${friend.displayName || friend.username} from friends`}
                        >
                            {actionLoading.remove ? (
                                <div className="flex items-center">
                                    <div className="w-3 h-3 border border-red-300/30 border-t-red-300 rounded-full animate-spin mr-1"></div>
                                    Removing...
                                </div>
                            ) : (
                                '🗑️ Remove'
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Additional Info Row (expandable section) */}
            {(friend.bio || friend.gamingStyle || friend.favoriteGenres) && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    {friend.bio && (
                        <p className="text-white/70 text-sm mb-2 line-clamp-2">
                            {friend.bio}
                        </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                        {friend.gamingStyle && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs">
                                {friend.gamingStyle}
                            </span>
                        )}
                        
                        {friend.favoriteGenres && friend.favoriteGenres.slice(0, 3).map(genre => (
                            <span key={genre} className="px-2 py-1 bg-white/10 text-white/70 rounded text-xs">
                                {genre}
                            </span>
                        ))}
                        
                        {friend.favoriteGenres && friend.favoriteGenres.length > 3 && (
                            <span className="px-2 py-1 bg-white/5 text-white/50 rounded text-xs">
                                +{friend.favoriteGenres.length - 3} more
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FriendCard;