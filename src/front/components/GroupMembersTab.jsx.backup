// src/front/components/GroupMembersTab.jsx - PATCHED to use existing Steam system
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import authService from '../store/authService';
import useGlobalReducer from '../hooks/useGlobalReducer';
import { ACTION_TYPES } from '../store/store.js';
import SteamManager from './SteamManager'; // 🔧 ADD: Import existing Steam system

const GroupMembersTab = ({ group, user, onGroupUpdate }) => {
    const { store, dispatch } = useGlobalReducer();
    
    const [members, setMembers] = useState(group?.members || []);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, role, joinDate, activity
    const [filter, setFilter] = useState('all'); // all, steam, no-steam
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // User permissions
    const isCreator = group?.creator?.id === user?.id;
    const canManageMembers = isCreator;

    // 🔧 ADD: Steam progress calculation
    const steamConnectedCount = members.filter(m => m.steam_connected).length;
    const steamSyncedCount = members.filter(m => 
        m.steam_connected && m.steam_library_synced_at
    ).length;
    const steamConnectedPercentage = members.length > 0 ? (steamConnectedCount / members.length) * 100 : 0;

    // 🔧 ADD: Steam status helper
    const getSteamStatus = (member) => {
        if (!member.steam_connected) return { status: 'Not Connected', color: 'text-gray-400', icon: '⚫' };
        if (!member.total_games) return { status: 'Connected (No Games)', color: 'text-yellow-400', icon: '🎮' };
        if (!member.steam_library_synced_at) return { status: 'Needs Sync', color: 'text-orange-400', icon: '⚠️' };
        
        const daysSinceSync = Math.floor(
            (Date.now() - new Date(member.steam_library_synced_at)) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceSync > 7) return { status: 'Sync Outdated', color: 'text-yellow-400', icon: '⚠️' };
        return { status: 'Up to Date', color: 'text-green-400', icon: '✅' };
    };

    // 🔧 ADD: Steam Progress Bar Component
    const SteamProgressBar = () => (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium flex items-center">
                    <span className="text-xl mr-2">🎮</span>
                    Steam Integration Progress
                </span>
                <span className="text-white/60 text-sm">{steamConnectedCount}/{members.length} connected</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 mb-2">
                <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${steamConnectedPercentage}%` }}
                ></div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                    <div className="text-green-400 font-bold">{steamConnectedCount}</div>
                    <div className="text-white/60">Connected</div>
                </div>
                <div>
                    <div className="text-blue-400 font-bold">{steamSyncedCount}</div>
                    <div className="text-white/60">Synced</div>
                </div>
                <div>
                    <div className="text-purple-400 font-bold">{Math.round(steamConnectedPercentage)}%</div>
                    <div className="text-white/60">Coverage</div>
                </div>
            </div>
            <p className="text-white/60 text-xs mt-3">
                {steamConnectedPercentage >= 75 ? 
                    '🎉 Great! Most members have Steam connected for better game matching.' :
                    steamConnectedPercentage >= 50 ?
                    '👍 Good progress! Encourage more members to connect Steam.' :
                    '⚠️ Low Steam connectivity. Members should connect Steam to find common games.'
                }
            </p>
        </div>
    );

    // Fetch members from API
    const fetchMembers = async () => {
        if (!group?.id) return;
        
        try {
            setLoading(true);
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${group.id}/members`
            );
            
            if (response.ok) {
                const data = await response.json();
                setMembers(data.members || []);
                
                // Update global state if needed
                if (dispatch) {
                    dispatch({ 
                        type: ACTION_TYPES.SET_GROUP_MEMBERS, 
                        payload: data.members || []
                    });
                }
            } else {
                toast.error('Failed to load members');
            }
        } catch (error) {
            console.error('Error fetching members:', error);
            toast.error('Network error loading members');
        } finally {
            setLoading(false);
        }
    };

    // Initialize and fetch members
    useEffect(() => {
        if (group?.members && Array.isArray(group.members)) {
            setMembers(group.members);
        }
        if (group?.id) {
            fetchMembers();
        }
    }, [group?.id, group?.members]);

    // Handle kicking a member
    const handleKickMember = async (memberId, memberUsername) => {
        if (!canManageMembers) {
            toast.error('You do not have permission to kick members');
            return;
        }

        if (memberId === user.id) {
            toast.error('You cannot kick yourself from the group');
            return;
        }

        const confirmMessage = `Are you sure you want to kick "${memberUsername}" from the group?\n\nThis action cannot be undone and will remove their votes from active sessions.`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [`kick_${memberId}`]: true }));
        const loadingToast = toast.loading(`Kicking ${memberUsername}...`);

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${group.id}/kick/${memberId}`,
                { method: 'POST' }
            );

            const data = await response.json();
            toast.dismiss(loadingToast);

            if (response.ok && data.success) {
                toast.success(`${memberUsername} has been removed from the group`);
                
                // Update local state
                const updatedMembers = members.filter(m => m.id !== memberId);
                setMembers(updatedMembers);
                
                // Update global state
                if (dispatch) {
                    dispatch({ 
                        type: ACTION_TYPES.SET_GROUP_MEMBERS, 
                        payload: updatedMembers
                    });
                }
                
                // Notify parent component
                if (onGroupUpdate) {
                    onGroupUpdate('member_kicked', false, { 
                        kickedMemberId: memberId,
                        remainingMembers: updatedMembers.length
                    });
                }
            } else {
                toast.error(data.error || 'Failed to kick member');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error kicking member:', error);
            toast.error('Network error occurred');
        } finally {
            setActionLoading(prev => ({ ...prev, [`kick_${memberId}`]: false }));
        }
    };

    // Handle transferring ownership
    const handleTransferOwnership = async (newOwnerId) => {
        if (!isCreator) {
            toast.error('Only the group creator can transfer ownership');
            return;
        }

        const newOwner = members.find(m => m.id === newOwnerId);
        if (!newOwner) {
            toast.error('Invalid member selected');
            return;
        }

        const confirmMessage = `Transfer group ownership to "${newOwner.username}"?\n\n` +
                              `⚠️ WARNING: This action CANNOT be undone!\n\n` +
                              `After transfer:\n` +
                              `• ${newOwner.username} will become the group creator\n` +
                              `• You will become a regular member\n` +
                              `• Only they can manage the group\n\n` +
                              `Type "TRANSFER" to confirm:`;

        const confirmation = prompt(confirmMessage);
        
        if (confirmation !== 'TRANSFER') {
            if (confirmation !== null) {
                toast.error('You must type "TRANSFER" exactly to confirm');
            }
            return;
        }

        setActionLoading(prev => ({ ...prev, [`transfer_${newOwnerId}`]: true }));
        const loadingToast = toast.loading(`Transferring ownership to ${newOwner.username}...`);

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${group.id}/transfer-ownership/${newOwnerId}`,
                { method: 'POST' }
            );

            const data = await response.json();
            toast.dismiss(loadingToast);

            if (response.ok && data.success) {
                toast.success(`Group ownership transferred to ${newOwner.username}`);
                
                setShowTransferModal(false);
                
                // Notify parent component
                if (onGroupUpdate) {
                    onGroupUpdate('ownership_transferred', false, {
                        newCreatorId: newOwnerId,
                        newCreatorUsername: newOwner.username,
                        oldCreator: data.data?.old_creator,
                        newCreator: data.data?.new_creator
                    });
                }
                
                // Refresh page since user is no longer creator
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                toast.error(data.error || 'Failed to transfer ownership');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error transferring ownership:', error);
            toast.error('Network error occurred');
        } finally {
            setActionLoading(prev => ({ ...prev, [`transfer_${newOwnerId}`]: false }));
        }
    };

    // Handle copying invite link
    const copyInviteLink = async () => {
        const frontendUrl = window.location.origin;
        const shareLink = `${frontendUrl}/join/${group.invite_code}`;
        
        try {
            await navigator.clipboard.writeText(shareLink);
            toast.success('Invite link copied to clipboard!');
        } catch (err) {
            console.error("Failed to copy link:", err);
            toast.error("Could not copy the link.");
        }
    };

    // Get member role
    const getMemberRole = (member) => {
        if (member.id === group?.creator?.id) return 'Creator';
        return 'Member';
    };

    // Filter and sort members
    const getFilteredAndSortedMembers = () => {
        let filtered = members;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(member =>
                member.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.steam_username?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply connection filter
        switch (filter) {
            case 'steam':
                filtered = filtered.filter(m => m.steam_connected);
                break;
            case 'no-steam':
                filtered = filtered.filter(m => !m.steam_connected);
                break;
            default:
                // 'all' - no additional filtering
                break;
        }

        // Apply sorting
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'role':
                    const aRole = a.id === group?.creator?.id ? 0 : 1;
                    const bRole = b.id === group?.creator?.id ? 0 : 1;
                    return aRole - bRole;
                case 'joinDate':
                    return new Date(b.joined_at || b.created_at) - new Date(a.joined_at || a.created_at);
                case 'activity':
                    if (a.steam_connected !== b.steam_connected) {
                        return b.steam_connected - a.steam_connected;
                    }
                    return (b.total_games || 0) - (a.total_games || 0);
                case 'name':
                default:
                    return a.username.localeCompare(b.username);
            }
        });
    };

    const filteredMembers = getFilteredAndSortedMembers();

    // Loading state
    if (loading && members.length === 0) {
        return (
            <div className="space-y-6">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 border-4 border-coral-500/30 border-t-coral-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <h3 className="text-xl font-bold text-white mb-2">Loading Members</h3>
                    <p className="text-white/60">Fetching the latest member information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-coral-400">{members.length}</div>
                    <div className="text-white/70 text-sm">Total Members</div>
                </div>
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{steamConnectedCount}</div>
                    <div className="text-white/70 text-sm">Steam Connected</div>
                </div>
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">{Math.round(steamConnectedPercentage)}%</div>
                    <div className="text-white/70 text-sm">Steam Coverage</div>
                </div>
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">
                        {Math.round(members.reduce((sum, m) => sum + (m.total_games || 0), 0) / members.length) || 0}
                    </div>
                    <div className="text-white/70 text-sm">Avg Games</div>
                </div>
            </div>

            {/* 🔧 ENHANCED: Steam Connection Progress */}
            <SteamProgressBar />

            {/* Controls */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <span className="text-2xl mr-2">👥</span>
                            Squad Members ({filteredMembers.length})
                        </h3>
                        <p className="text-white/60 text-sm mt-1">
                            Manage your gaming squad members and permissions
                        </p>
                    </div>
                    
                    <div className="flex space-x-3">
                        <button
                            onClick={fetchMembers}
                            disabled={loading}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center space-x-2"
                        >
                            <span className={loading ? 'animate-spin' : ''}>🔄</span>
                            <span>Refresh</span>
                        </button>
                        
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center space-x-2"
                        >
                            <span>➕</span>
                            <span>Invite</span>
                        </button>
                        
                        {isCreator && members.length > 1 && (
                            <button
                                onClick={() => setShowTransferModal(true)}
                                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center space-x-2"
                            >
                                <span>👑</span>
                                <span>Transfer</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Search, Filter and Sort */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-white/70 text-sm mb-2">Search Members</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by username, email, or Steam..."
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 transition-colors"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-white/70 text-sm mb-2">Filter By</label>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-coral-500 transition-colors"
                        >
                            <option value="all">All Members ({members.length})</option>
                            <option value="steam">Steam Connected ({steamConnectedCount})</option>
                            <option value="no-steam">No Steam ({members.length - steamConnectedCount})</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-white/70 text-sm mb-2">Sort By</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-coral-500 transition-colors"
                        >
                            <option value="name">Name (A-Z)</option>
                            <option value="role">Role (Creator First)</option>
                            <option value="joinDate">Join Date (Newest)</option>
                            <option value="activity">Activity (Steam + Games)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Members List */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
                {filteredMembers.length > 0 ? (
                    <div className="divide-y divide-white/10">
                        {filteredMembers.map((member) => {
                            const role = getMemberRole(member);
                            const steamStatus = getSteamStatus(member);
                            const isCurrentUser = member.id === user.id;
                            const canKick = canManageMembers && !isCurrentUser && role !== 'Creator';
                            const canPromote = isCreator && role !== 'Creator' && !isCurrentUser;

                            return (
                                <div key={member.id} className="p-6 hover:bg-white/5 transition-colors duration-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            {/* Avatar */}
                                            <div className="relative">
                                                {member.steam_avatar_url ? (
                                                    <img 
                                                        src={member.steam_avatar_url} 
                                                        alt={member.username}
                                                        className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextElementSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div 
                                                    className={`${member.steam_avatar_url ? 'hidden' : 'flex'} w-16 h-16 border-2 border-white/20 rounded-full`}
                                                >
                                                    <Avatar name={member.username} size={60} className="border-none" />
                                                </div>
                                                
                                                {/* Role indicator */}
                                                {role === 'Creator' && (
                                                    <div className="absolute -top-1 -right-1 text-lg">👑</div>
                                                )}
                                                {isCurrentUser && (
                                                    <div className="absolute -bottom-1 -right-1 text-sm">🫵</div>
                                                )}
                                                
                                                {/* Status indicator */}
                                                <div className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full border-2 border-slate-800 ${
                                                    member.steam_connected ? 'bg-green-500' : 'bg-gray-500'
                                                }`}></div>
                                            </div>
                                            
                                            {/* Member Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <h4 className="text-white font-bold text-lg">{member.username}</h4>
                                                    
                                                    {/* Badges */}
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        role === 'Creator' 
                                                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                    }`}>
                                                        {role}
                                                    </span>
                                                    
                                                    {isCurrentUser && (
                                                        <span className="px-2 py-1 bg-coral-500/20 text-coral-300 border border-coral-500/30 rounded-full text-xs font-medium">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {/* 🔧 ENHANCED: Steam Info Display */}
                                                <div className="space-y-1">
                                                    {member.steam_username && (
                                                        <p className="text-white/60 text-sm">Steam: {member.steam_username}</p>
                                                    )}
                                                    
                                                    <div className="flex items-center space-x-4 text-sm">
                                                        {/* Steam Status */}
                                                        <div className={`flex items-center space-x-1 ${steamStatus.color}`}>
                                                            <span>{steamStatus.icon}</span>
                                                            <span>{steamStatus.status}</span>
                                                        </div>
                                                        
                                                        {/* Game Count */}
                                                        {member.total_games && (
                                                            <div className="text-white/60">
                                                                {member.total_games} games
                                                            </div>
                                                        )}
                                                        
                                                        {/* Join Date */}
                                                        <div className="text-white/50 text-xs">
                                                            Joined {new Date(member.joined_at || member.created_at || group.created_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Gaming Style */}
                                                {member.gaming_style && (
                                                    <div className="mt-1">
                                                        <span className="px-2 py-0.5 bg-white/10 text-white/70 rounded text-xs">
                                                            {member.gaming_style}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center space-x-2">
                                            {/* 🔧 ADD: Steam Status Component */}
                                            {member.steam_connected && (
                                                <div className="hidden sm:block">
                                                    <SteamManager 
                                                        variant="status-only" 
                                                        user={member}
                                                        className="text-xs"
                                                    />
                                                </div>
                                            )}
                                            
                                            <button
                                                onClick={() => toast.info('Profile view feature coming soon!')}
                                                className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white/70 rounded-lg text-sm transition-colors flex items-center space-x-1"
                                                title="View member profile"
                                            >
                                                <span>👤</span>
                                                <span className="hidden sm:inline">Profile</span>
                                            </button>
                                            
                                            {canPromote && (
                                                <button
                                                    onClick={() => handleTransferOwnership(member.id)}
                                                    disabled={actionLoading[`transfer_${member.id}`]}
                                                    className="px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center space-x-1"
                                                    title="Transfer group ownership"
                                                >
                                                    {actionLoading[`transfer_${member.id}`] ? (
                                                        <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></span>
                                                    ) : (
                                                        <>
                                                            <span>👑</span>
                                                            <span className="hidden sm:inline">Promote</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                            
                                            {canKick && (
                                                <button
                                                    onClick={() => handleKickMember(member.id, member.username)}
                                                    disabled={actionLoading[`kick_${member.id}`]}
                                                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center space-x-1"
                                                    title="Kick from group"
                                                >
                                                    {actionLoading[`kick_${member.id}`] ? (
                                                        <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></span>
                                                    ) : (
                                                        <>
                                                            <span>🚫</span>
                                                            <span className="hidden sm:inline">Kick</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            {searchTerm ? `No members match "${searchTerm}"` : 
                             filter === 'steam' ? 'No Steam Connected Members' : 
                             filter === 'no-steam' ? 'All Members Have Steam Connected' :
                             'No Members Found'}
                        </h3>
                        <p className="text-white/60 mb-6">
                            {searchTerm ? 'Try adjusting your search terms.' :
                             filter === 'steam' ? 'Encourage members to connect their Steam accounts.' :
                             filter === 'no-steam' ? 'Great! All members have Steam connected.' :
                             'This group appears to be empty.'}
                        </p>
                        {(searchTerm || filter !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilter('all');
                                }}
                                className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors duration-200"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Transfer Ownership Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div 
                        className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-2xl font-bold text-white mb-4">Transfer Group Ownership</h3>
                        <p className="text-white/70 mb-6">
                            Select a member to transfer ownership to. This action cannot be undone.
                        </p>
                        
                        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                            {members
                                .filter(member => member.id !== user.id && member.id !== group.creator?.id)
                                .map(member => (
                                    <button
                                        key={member.id}
                                        onClick={() => handleTransferOwnership(member.id)}
                                        disabled={actionLoading[`transfer_${member.id}`]}
                                        className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-left transition-colors disabled:opacity-50 flex items-center space-x-3"
                                    >
                                        <Avatar name={member.username} size={32} />
                                        <div className="flex-1">
                                            <div className="text-white font-medium">{member.username}</div>
                                            <div className="text-white/60 text-sm">
                                                {getSteamStatus(member).status}
                                            </div>
                                        </div>
                                        {actionLoading[`transfer_${member.id}`] && (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        )}
                                    </button>
                                ))
                            }
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowTransferModal(false)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div 
                        className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-2xl font-bold text-white mb-4">Invite Members</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-white/70 text-sm mb-2">Invite Code</label>
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="text" 
                                        value={group.invite_code} 
                                        readOnly 
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white font-mono text-center"
                                    />
                                    <button
                                        onClick={copyInviteLink}
                                        className="px-3 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-lg transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-white/70 text-sm mb-2">Quick Share</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            const text = `Join my SquadUp group "${group.name}"! ${window.location.origin}/join/${group.invite_code}`;
                                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                        }}
                                        className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-300 rounded-lg transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <span>📱</span>
                                        <span>WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            copyInviteLink();
                                            toast.success('Copied! Paste in Discord chat.');
                                        }}
                                        className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-600/30 text-indigo-300 rounded-lg transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <span>💬</span>
                                        <span>Discord</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupMembersTab;