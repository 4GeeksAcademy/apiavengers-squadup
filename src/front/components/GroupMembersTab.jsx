// src/front/components/GroupMembersTab.jsx - Complete Member Management Component
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import authService from '../store/authService';
import Avatar from './Avatar';
import { transferGroupOwnership, fetchGroupMembers, kickGroupMember } from '../store/actions.js';
import { useGlobalReducer } from '../hooks/useGlobalReducer.jsx';

const GroupMembersTab = ({ group, user, onGroupUpdate }) => {
    const [members, setMembers] = useState(group?.members || []);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({});
    const [filter, setFilter] = useState('all'); // 'all', 'steam', 'no-steam'
    const [inviteModalOpen, setInviteModalOpen] = useState(false);

    // Update members when group changes
    useEffect(() => {
        if (group?.members) {
            setMembers(group.members);
        }
    }, [group?.members]);

    const isCreator = group?.creator?.id === user?.id;

    const handleKickMember = async (memberId, memberUsername) => {
        if (!isCreator) {
            toast.error('Only the group creator can kick members');
            return;
        }

        if (memberId === user.id) {
            toast.error("You can't kick yourself. Use leave or delete instead.");
            return;
        }

        const confirmMessage = `Are you sure you want to kick ${memberUsername} from the group?\n\nThis action cannot be undone.`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [`kick_${memberId}`]: true }));
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${group.id}/kick/${memberId}`,
                { method: 'POST' }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                // Remove member from local state
                setMembers(prev => prev.filter(m => m.id !== memberId));
                
                toast.success(`${memberUsername} has been kicked from the group`);
                
                // Notify parent component
                if (onGroupUpdate) {
                    onGroupUpdate('member_kicked', false, { kickedMemberId: memberId });
                }
            } else {
                toast.error(data.error || 'Failed to kick member');
            }
        } catch (error) {
            console.error('Error kicking member:', error);
            toast.error('Network error occurred');
        } finally {
            setActionLoading(prev => ({ ...prev, [`kick_${memberId}`]: false }));
        }
    };

    const handlePromoteToCreator = async (memberId, memberUsername) => {
        if (!isCreator) {
            toast.error('Only the group creator can transfer ownership');
            return;
        }

        const confirmMessage = `Transfer group ownership to ${memberUsername}?\n\n⚠️ You will no longer be the creator and cannot undo this action.`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [`promote_${memberId}`]: true }));
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${group.id}/transfer-ownership/${memberId}`,
                { method: 'POST' }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success(`Ownership transferred to ${memberUsername}`);
                
                // Update local group data
                if (onGroupUpdate) {
                    onGroupUpdate('ownership_transferred', false, { 
                        newCreatorId: memberId,
                        newCreatorUsername: memberUsername 
                    });
                }
                
                // Refresh the page or redirect since user is no longer creator
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                toast.error(data.error || 'Failed to transfer ownership');
            }
        } catch (error) {
            console.error('Error transferring ownership:', error);
            toast.error('Network error occurred');
        } finally {
            setActionLoading(prev => ({ ...prev, [`promote_${memberId}`]: false }));
        }
    };

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

    const getFilteredMembers = () => {
        switch (filter) {
            case 'steam':
                return members.filter(m => m.steam_connected);
            case 'no-steam':
                return members.filter(m => !m.steam_connected);
            default:
                return members;
        }
    };

    const filteredMembers = getFilteredMembers();
    const steamConnectedCount = members.filter(m => m.steam_connected).length;
    const steamConnectedPercentage = members.length > 0 ? (steamConnectedCount / members.length) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            {/* Steam Connection Progress */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Steam Integration Progress</span>
                    <span className="text-white/60 text-sm">{steamConnectedCount}/{members.length} connected</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3">
                    <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${steamConnectedPercentage}%` }}
                    ></div>
                </div>
                <p className="text-white/60 text-xs mt-2">
                    {steamConnectedPercentage >= 75 ? 
                        '🎉 Great! Most members have Steam connected for better game matching.' :
                        steamConnectedPercentage >= 50 ?
                        '👍 Good progress! Encourage more members to connect Steam.' :
                        '⚠️ Low Steam connectivity. Members should connect Steam to find common games.'
                    }
                </p>
            </div>

            {/* Filter and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-2">
                    <span className="text-white/70 text-sm">Filter:</span>
                    <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
                        {[
                            { id: 'all', label: 'All Members', count: members.length },
                            { id: 'steam', label: 'Steam Connected', count: steamConnectedCount },
                            { id: 'no-steam', label: 'No Steam', count: members.length - steamConnectedCount }
                        ].map(filterOption => (
                            <button
                                key={filterOption.id}
                                onClick={() => setFilter(filterOption.id)}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                                    filter === filterOption.id
                                        ? 'bg-coral-500 text-white shadow-md'
                                        : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {filterOption.label} ({filterOption.count})
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={copyInviteLink}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center space-x-2"
                    >
                        <span>🔗</span>
                        <span>Copy Invite</span>
                    </button>
                    
                    {isCreator && (
                        <button
                            onClick={() => setInviteModalOpen(true)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg text-sm transition-colors duration-200 flex items-center space-x-2"
                        >
                            <span>➕</span>
                            <span>Invite Options</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Members List */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <span className="text-2xl mr-2">👥</span>
                        Squad Members ({filteredMembers.length})
                    </h3>
                </div>

                {filteredMembers.length > 0 ? (
                    <div className="divide-y divide-white/10">
                        {filteredMembers.map((member) => {
                            const isMemberCreator = member.id === group.creator?.id;
                            const isCurrentUser = member.id === user.id;
                            const canKick = isCreator && !isMemberCreator && !isCurrentUser;
                            const canPromote = isCreator && !isMemberCreator && !isCurrentUser;

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
                                                
                                                {/* Status indicator */}
                                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800 ${
                                                    member.steam_connected ? 'bg-green-500' : 'bg-gray-500'
                                                }`}></div>
                                            </div>
                                            
                                            {/* Member Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <h4 className="text-white font-bold text-lg">{member.username}</h4>
                                                    
                                                    {/* Badges */}
                                                    {isMemberCreator && (
                                                        <span className="px-2 py-1 bg-coral-500/20 text-coral-300 border border-coral-500/30 rounded-full text-xs font-medium">
                                                            👑 Creator
                                                        </span>
                                                    )}
                                                    
                                                    {isCurrentUser && (
                                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-medium">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {member.steam_username && (
                                                    <p className="text-white/60 text-sm">Steam: {member.steam_username}</p>
                                                )}
                                                
                                                <div className="flex items-center space-x-4 mt-2 text-sm">
                                                    {/* Steam Status */}
                                                    <div className="flex items-center space-x-1">
                                                        <span className={`w-2 h-2 rounded-full ${
                                                            member.steam_connected ? 'bg-green-400' : 'bg-gray-400'
                                                        }`}></span>
                                                        <span className={member.steam_connected ? 'text-green-300' : 'text-gray-400'}>
                                                            {member.steam_connected ? 'Steam Connected' : 'No Steam'}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Game Count */}
                                                    {member.steam_connected && member.total_games && (
                                                        <span className="text-white/60">
                                                            {member.total_games} games
                                                        </span>
                                                    )}
                                                    
                                                    {/* Gaming Style */}
                                                    {member.gaming_style && (
                                                        <span className="px-2 py-1 bg-white/10 text-white/70 rounded text-xs">
                                                            {member.gaming_style}
                                                        </span>
                                                    )}
                                                    
                                                    {/* Member since */}
                                                    <span className="text-white/50 text-xs">
                                                        Joined {new Date(member.joined_at || group.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center space-x-2">
                                            {canPromote && (
                                                <button
                                                    onClick={() => handlePromoteToCreator(member.id, member.username)}
                                                    disabled={actionLoading[`promote_${member.id}`]}
                                                    className="px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center space-x-1"
                                                    title="Transfer group ownership"
                                                >
                                                    {actionLoading[`promote_${member.id}`] ? (
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
                                                            <span>👢</span>
                                                            <span className="hidden sm:inline">Kick</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                            
                                            {/* View Profile Button */}
                                            <button
                                                onClick={() => toast.info('Profile view feature coming soon!')}
                                                className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white/70 rounded-lg text-sm transition-colors flex items-center space-x-1"
                                                title="View member profile"
                                            >
                                                <span>👤</span>
                                                <span className="hidden sm:inline">Profile</span>
                                            </button>
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
                            {filter === 'all' ? 'No Members Found' : 
                             filter === 'steam' ? 'No Steam Connected Members' : 'All Members Have Steam Connected'}
                        </h3>
                        <p className="text-white/60 mb-6">
                            {filter === 'all' ? 'This group appears to be empty.' :
                             filter === 'steam' ? 'Encourage members to connect their Steam accounts.' :
                             'Great! All members have Steam connected.'}
                        </p>
                        {filter !== 'all' && (
                            <button
                                onClick={() => setFilter('all')}
                                className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors duration-200"
                            >
                                Show All Members
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Invite Options Modal */}
            {inviteModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">Invite Members</h3>
                        
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
                                onClick={() => setInviteModalOpen(false)}
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