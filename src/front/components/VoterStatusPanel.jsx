// src/front/components/VoterStatusPanel.jsx - NEW COMPONENT
import React from 'react';
import Avatar from './Avatar';
import { fetchSessionVoters, createLiveResultsStream } from '../store/actions.js';

const VoterStatusPanel = ({ session, groupMembers, className = "" }) => {
    const voteResults = JSON.parse(session?.vote_results || '{}');
    const voters = voteResults.voters || {};
    
    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'Just now';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            
            return `${Math.floor(diffHours / 24)}d ago`;
        } catch (error) {
            return 'Recently';
        }
    };

    const votedMembers = groupMembers.filter(member => voters[member.id.toString()]);
    const pendingMembers = groupMembers.filter(member => !voters[member.id.toString()]);

    return (
        <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-semibold flex items-center">
                    <span className="text-xl mr-2">📊</span>
                    Voting Progress
                </h4>
                <div className="text-white/60 text-sm">
                    {votedMembers.length} / {groupMembers.length} voted
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-2 mb-6">
                <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${groupMembers.length > 0 ? (votedMembers.length / groupMembers.length) * 100 : 0}%` }}
                ></div>
            </div>

            {/* Voted Members */}
            {votedMembers.length > 0 && (
                <div className="mb-6">
                    <h5 className="text-green-300 font-medium mb-3 text-sm">
                        ✅ Voted ({votedMembers.length})
                    </h5>
                    <div className="space-y-2">
                        {votedMembers.map(member => {
                            const voteData = voters[member.id.toString()];
                            return (
                                <div 
                                    key={member.id} 
                                    className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                                >
                                    <Avatar name={member.username} size={32} />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-white font-medium">{member.username}</span>
                                        <div className="text-green-300 text-xs">
                                            Voted {formatTimeAgo(voteData.voted_at)}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <span className="text-green-400 text-lg">✅</span>
                                        <span className="text-green-300 text-xs">
                                            {voteData.votes?.length || 0} choices
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Pending Members */}
            {pendingMembers.length > 0 && (
                <div>
                    <h5 className="text-yellow-300 font-medium mb-3 text-sm">
                        ⏳ Pending ({pendingMembers.length})
                    </h5>
                    <div className="space-y-2">
                        {pendingMembers.map(member => (
                            <div 
                                key={member.id} 
                                className="flex items-center space-x-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                            >
                                <Avatar name={member.username} size={32} />
                                <div className="flex-1 min-w-0">
                                    <span className="text-white font-medium">{member.username}</span>
                                    <div className="text-yellow-300 text-xs">
                                        Waiting for vote...
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <span className="text-yellow-400 text-lg">⏳</span>
                                    <span className="text-yellow-300 text-xs animate-pulse">
                                        Pending
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Done State */}
            {pendingMembers.length === 0 && votedMembers.length > 0 && (
                <div className="text-center p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                    <div className="text-2xl mb-2">🎉</div>
                    <p className="text-green-300 font-semibold">All members have voted!</p>
                    <p className="text-green-200 text-sm">Check the results to see the winner.</p>
                </div>
            )}

            {/* Empty State */}
            {groupMembers.length === 0 && (
                <div className="text-center p-4 bg-white/5 rounded-xl">
                    <div className="text-2xl mb-2">👥</div>
                    <p className="text-white/70">No group members found</p>
                </div>
            )}
        </div>
    );
};

export default VoterStatusPanel;