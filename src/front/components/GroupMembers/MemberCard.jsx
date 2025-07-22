// 1. src/front/components/GroupMembers/MemberCard.jsx
// ============================================================================

import React from 'react';
import Avatar from '../Avatar';
import SteamManager from '../SteamManager';

const MemberCard = ({ 
    member, 
    currentUser, 
    isCreator, 
    onKick, 
    onTransferOwnership, 
    actionLoading = {} 
}) => {
    const isCurrentUser = member.id === currentUser?.id;
    const canKick = isCreator && !isCurrentUser && member.id !== member.creator_id;
    const canPromote = isCreator && !isCurrentUser;
    
    const getMemberRole = () => {
        if (member.is_creator || member.id === member.creator_id) return 'Creator';
        return 'Member';
    };
    
    const getSteamStatus = () => {
        if (!member.steam_connected) return { status: 'Not Connected', color: 'text-gray-400', icon: '⚫' };
        if (!member.total_games) return { status: 'Connected (No Games)', color: 'text-yellow-400', icon: '🎮' };
        return { status: 'Connected', color: 'text-green-400', icon: '✅' };
    };
    
    const role = getMemberRole();
    const steamStatus = getSteamStatus();
    
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all duration-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    {/* Avatar Section */}
                    <div className="relative">
                        {member.steam_avatar_url ? (
                            <img 
                                src={member.steam_avatar_url} 
                                alt={member.username}
                                className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className={`${member.steam_avatar_url ? 'hidden' : 'flex'} w-12 h-12`}>
                            <Avatar name={member.username} size={48} className="border-none" />
                        </div>
                        
                        {/* Role Badge */}
                        {role === 'Creator' && (
                            <div className="absolute -top-1 -right-1 text-lg">👑</div>
                        )}
                        {isCurrentUser && (
                            <div className="absolute -bottom-1 -right-1 text-sm">🫵</div>
                        )}
                        
                        {/* Steam Status */}
                        <div className={`absolute -bottom-1 -left-1 w-4 h-4 rounded-full border-2 border-slate-800 ${
                            member.steam_connected ? 'bg-green-500' : 'bg-gray-500'
                        }`}></div>
                    </div>
                    
                    {/* Member Info */}
                    <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-white font-bold">{member.username}</h4>
                            
                            {/* Role Badge */}
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
                        
                        {/* Steam Info */}
                        <div className="space-y-1">
                            {member.steam_username && (
                                <p className="text-white/60 text-sm">Steam: {member.steam_username}</p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-sm">
                                <div className={`flex items-center space-x-1 ${steamStatus.color}`}>
                                    <span>{steamStatus.icon}</span>
                                    <span>{steamStatus.status}</span>
                                </div>
                                
                                {member.total_games && (
                                    <div className="text-white/60">
                                        {member.total_games} games
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                    {/* Steam Status Component */}
                    {member.steam_connected && (
                        <div className="hidden sm:block">
                            <SteamManager 
                                variant="status-only" 
                                user={member}
                                className="text-xs"
                            />
                        </div>
                    )}
                    
                    {/* Profile Button */}
                    <button
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white/70 rounded-lg text-sm transition-colors flex items-center space-x-1"
                        title="View member profile"
                    >
                        <span>👤</span>
                        <span className="hidden sm:inline">Profile</span>
                    </button>
                    
                    {/* Transfer Ownership Button */}
                    {canPromote && onTransferOwnership && (
                        <button
                            onClick={() => onTransferOwnership(member.id)}
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
                    
                    {/* Kick Button */}
                    {canKick && onKick && (
                        <button
                            onClick={() => onKick(member.id, member.username)}
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
};

export default MemberCard;