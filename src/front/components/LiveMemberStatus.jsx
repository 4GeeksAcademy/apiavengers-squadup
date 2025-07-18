// src/front/components/LiveMemberStatus.jsx - Simplified Live Member Status Component
import React, { useState, useEffect } from 'react';
import authService from '../store/authService';
import Avatar from './Avatar';

const LiveMemberStatus = ({ 
    groupId, 
    sessionId = null, 
    showOnlineStatus = false,
    compact = true,
    maxVisible = 8
}) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [voterStatus, setVoterStatus] = useState({});

    useEffect(() => {
        if (groupId) {
            fetchMemberStatus();
        }
    }, [groupId, sessionId]);

    const fetchMemberStatus = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            // Get group members
            const groupResponse = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}/members`
            );
            
            if (groupResponse.ok) {
                const groupData = await groupResponse.json();
                setMembers(groupData.members || []);
            }
            
            // If we have a session, get basic voter status
            if (sessionId) {
                const voterResponse = await authService.authenticatedFetch(
                    `${backendUrl}/api/gaming/sessions/${sessionId}/voters`
                );
                
                if (voterResponse.ok) {
                    const voterData = await voterResponse.json();
                    setVoterStatus(voterData.voters || {});
                }
            }
            
        } catch (error) {
            console.error('Error fetching member status:', error);
        } finally {
            setLoading(false);
        }
    };

    const getMemberVotingStatus = (memberId) => {
        if (!sessionId) return null;
        return !!voterStatus[memberId.toString()];
    };

    const getStatusIcon = (member) => {
        if (sessionId) {
            return getMemberVotingStatus(member.id) ? '✅' : '⏳';
        }
        return member.steam_connected ? '🎮' : '⚫';
    };

    const getStatusColor = (member) => {
        if (sessionId) {
            return getMemberVotingStatus(member.id) ? 'text-green-400' : 'text-yellow-400';
        }
        return member.steam_connected ? 'text-green-400' : 'text-gray-400';
    };

    if (loading) {
        return (
            <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-white/60 text-xs">Loading...</span>
            </div>
        );
    }

    const visibleMembers = members.slice(0, maxVisible);
    const hiddenCount = Math.max(0, members.length - maxVisible);
    const votedCount = sessionId ? members.filter(m => getMemberVotingStatus(m.id)).length : 0;

    if (compact) {
        return (
            <div className="flex items-center space-x-2">
                {/* Compact Avatar Row */}
                <div className="flex -space-x-1">
                    {visibleMembers.map((member) => {
                        const statusIcon = getStatusIcon(member);
                        const statusColor = getStatusColor(member);
                        
                        return (
                            <div key={member.id} className="relative" title={member.username}>
                                <Avatar 
                                    src={member.steam_avatar_url}
                                    name={member.username} 
                                    size={24}
                                    className="border-2 border-slate-800"
                                />
                                <div className={`absolute -bottom-1 -right-1 text-xs ${statusColor}`}>
                                    {statusIcon}
                                </div>
                            </div>
                        );
                    })}
                    
                    {hiddenCount > 0 && (
                        <div className="w-6 h-6 bg-white/10 border-2 border-slate-800 rounded-full flex items-center justify-center text-white/60 text-xs">
                            +{hiddenCount}
                        </div>
                    )}
                </div>

                {/* Status Summary */}
                <div className="text-white/70 text-xs">
                    {sessionId ? (
                        <span>{votedCount}/{members.length} voted</span>
                    ) : (
                        <span>{members.filter(m => m.steam_connected).length} connected</span>
                    )}
                </div>
            </div>
        );
    }

    // Full view for when not compact
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-white/80 text-sm font-medium">
                    {sessionId ? 'Voting Status' : 'Member Status'}
                </span>
                {sessionId && (
                    <span className="text-white/60 text-xs">
                        {votedCount}/{members.length}
                    </span>
                )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                {members.map((member) => {
                    const statusIcon = getStatusIcon(member);
                    const statusColor = getStatusColor(member);
                    
                    return (
                        <div key={member.id} className="flex items-center space-x-2 p-1 rounded">
                            <Avatar 
                                src={member.steam_avatar_url}
                                name={member.username} 
                                size={20}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-white text-xs truncate">{member.username}</div>
                            </div>
                            <div className={`text-xs ${statusColor}`}>
                                {statusIcon}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LiveMemberStatus;