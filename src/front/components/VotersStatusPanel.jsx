// src/front/components/VotingStatusPanel.jsx - UNIFIED VERSION
// Merges VotersStatusPanel.jsx and LiveMembersStatus.jsx into single component

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import { useSSEManager } from '../services/sseManager';
import authService from '../store/authService';

const VotingStatusPanel = ({ 
    sessionId, 
    groupMembers = [],
    variant = 'full', // 'full', 'compact', 'minimal'
    showProgress = true,
    showRecentActivity = true,
    showMemberList = true,
    maxRecentItems = 5,
    onStatusUpdate,
    onMemberUpdate,
    className = ""
}) => {
    const [votingStatus, setVotingStatus] = useState({
        progress: { voted: 0, total: 0, percentage: 0 },
        voted_members: [],
        pending_members: [],
        recent_voters: [],
        voting_complete: false,
        session_status: 'voting'
    });

    const [recentActivity, setRecentActivity] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    // SSE connection for real-time updates
    const endpoint = `/api/gaming/sessions/${sessionId}/voting-status-stream`;
    const token = authService.getAccessToken();
    
    const { manager, status } = useSSEManager(endpoint, {
        enableLogging: true,
        maxRetries: 5,
        retryDelay: 3000,
        heartbeatTimeout: 45000
    });

    useEffect(() => {
        if (!manager) return;

        const handleMessage = (data) => {
            // Skip heartbeat messages
            if (data.type === 'heartbeat') return;

            // Handle unified voting status updates
            if (data.type === 'voting_status_update' || data.type === 'member_status_update') {
                const newStatus = {
                    progress: data.progress || data.summary || votingStatus.progress,
                    voted_members: data.voted_members || data.members?.filter(m => m.has_voted) || [],
                    pending_members: data.pending_members || data.members?.filter(m => !m.has_voted) || [],
                    recent_voters: data.recent_voters || [],
                    voting_complete: data.voting_complete || data.progress?.percentage >= 100,
                    session_status: data.session_status || 'voting'
                };

                setVotingStatus(newStatus);

                // Track recent activity for new voters
                const newVoters = newStatus.voted_members.filter(voter => 
                    !recentActivity.some(activity => activity.user_id === voter.user_id || voter.id)
                );

                if (newVoters.length > 0) {
                    const newActivities = newVoters.map(voter => ({
                        id: `${voter.user_id || voter.id}-${Date.now()}`,
                        user_id: voter.user_id || voter.id,
                        username: voter.username,
                        avatar_url: voter.avatar_url,
                        action: 'voted',
                        timestamp: new Date(voter.vote_time || Date.now())
                    }));

                    setRecentActivity(prev => [
                        ...newActivities,
                        ...prev
                    ].slice(0, maxRecentItems));
                }

                // Notify parent components
                onStatusUpdate?.(newStatus);
                onMemberUpdate?.(newStatus);
            }
        };

        const handleConnected = () => {
            console.log('✅ Voting status panel connected');
            setIsConnected(true);
        };

        const handleDisconnected = () => {
            console.log('❌ Voting status panel disconnected');
            setIsConnected(false);
        };

        const handleError = (error) => {
            console.error('❌ Voting status panel error:', error);
            setIsConnected(false);
        };

        // Set up event listeners
        const unsubscribers = [
            manager.on('message', handleMessage),
            manager.on('connected', handleConnected),
            manager.on('disconnected', handleDisconnected),
            manager.on('error', handleError)
        ];

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [manager, onStatusUpdate, onMemberUpdate, maxRecentItems, recentActivity, votingStatus.progress]);

    // Initialize with group members if no live data yet
    useEffect(() => {
        if (groupMembers.length > 0 && votingStatus.voted_members.length === 0 && votingStatus.pending_members.length === 0) {
            setVotingStatus(prev => ({
                ...prev,
                pending_members: groupMembers.map(member => ({
                    user_id: member.id,
                    username: member.username,
                    avatar_url: member.avatar_url,
                    has_voted: false
                })),
                progress: { voted: 0, total: groupMembers.length, percentage: 0 }
            }));
        }
    }, [groupMembers, votingStatus]);

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const diffMs = now - new Date(timestamp);
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);

        if (diffSecs < 10) return 'just now';
        if (diffSecs < 60) return `${diffSecs}s ago`;
        if (diffMins < 60) return `${diffMins}m ago`;
        return 'earlier';
    };

    const getConnectionIndicator = () => {
        if (isConnected) return { color: 'text-green-400', icon: '🟢', text: 'Live' };
        if (status.isReconnecting) return { color: 'text-yellow-400', icon: '🟡', text: 'Connecting...' };
        return { color: 'text-red-400', icon: '🔴', text: 'Offline' };
    };

    const connectionIndicator = getConnectionIndicator();

    // Render different variants
    if (variant === 'minimal') {
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-white/70 text-sm">
                    {votingStatus.progress.voted}/{votingStatus.progress.total} voted
                </span>
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <div className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 ${className}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">Voting Progress</span>
                    <div className={`flex items-center space-x-1 text-xs ${connectionIndicator.color}`}>
                        <span>{connectionIndicator.icon}</span>
                        <span>{connectionIndicator.text}</span>
                    </div>
                </div>
                
                <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                    <motion.div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${votingStatus.progress.percentage || 0}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
                
                <div className="flex justify-between text-xs text-white/70">
                    <span>{votingStatus.progress.voted} voted</span>
                    <span>{Math.round(votingStatus.progress.percentage || 0)}%</span>
                </div>
            </div>
        );
    }

    // Full variant (default)
    return (
        <div className={`space-y-4 ${className}`}>
            {/* Progress Section */}
            {showProgress && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Voting Progress</h3>
                        <div className={`flex items-center space-x-1 text-xs ${connectionIndicator.color}`}>
                            <span>{connectionIndicator.icon}</span>
                            <span>{connectionIndicator.text}</span>
                        </div>
                    </div>

                    {/* Progress Ring for larger screens */}
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="relative w-16 h-16">
                            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                                <circle
                                    cx="32" cy="32" r="28"
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth="4" fill="none"
                                />
                                <motion.circle
                                    cx="32" cy="32" r="28"
                                    stroke="#10b981" strokeWidth="4" fill="none"
                                    strokeDasharray={`${2 * Math.PI * 28}`}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                                    animate={{ 
                                        strokeDashoffset: 2 * Math.PI * 28 * (1 - (votingStatus.progress.percentage || 0) / 100)
                                    }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">
                                    {Math.round(votingStatus.progress.percentage || 0)}%
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex-1">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-white/70">
                                    {votingStatus.progress.voted} of {votingStatus.progress.total} members voted
                                </span>
                            </div>
                            
                            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${votingStatus.progress.percentage || 0}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status Message */}
                    <div className="text-center">
                        {votingStatus.voting_complete ? (
                            <span className="text-green-400 font-medium">✅ Voting Complete!</span>
                        ) : votingStatus.progress.voted === 0 ? (
                            <span className="text-yellow-400">⏳ Waiting for votes...</span>
                        ) : (
                            <span className="text-blue-400">🗳️ Voting in progress...</span>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Recent Activity */}
            {showRecentActivity && recentActivity.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4"
                >
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <span className="mr-2">⚡</span>
                        Recent Activity
                    </h4>
                    
                    <div className="space-y-2">
                        <AnimatePresence>
                            {recentActivity.slice(0, maxRecentItems).map((activity) => (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                                >
                                    <Avatar 
                                        name={activity.username}
                                        src={activity.avatar_url}
                                        size={32}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium truncate">
                                            {activity.username}
                                        </p>
                                        <p className="text-xs text-green-400">
                                            Just voted • {formatTimeAgo(activity.timestamp)}
                                        </p>
                                    </div>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-green-400"
                                    >
                                        ✓
                                    </motion.div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}

            {/* Member Lists */}
            {showMemberList && (
                <div className="space-y-4">
                    {/* Voted Members */}
                    {votingStatus.voted_members.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4"
                        >
                            <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center">
                                <span className="mr-2">✅</span>
                                Voted ({votingStatus.voted_members.length})
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                <AnimatePresence>
                                    {votingStatus.voted_members.map((member) => (
                                        <motion.div
                                            key={member.user_id || member.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                                        >
                                            <Avatar 
                                                name={member.username}
                                                src={member.avatar_url}
                                                size={32}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white font-medium truncate">
                                                    {member.username}
                                                </p>
                                                {member.vote_time && (
                                                    <p className="text-xs text-green-400">
                                                        {formatTimeAgo(member.vote_time)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-green-400 text-sm">
                                                {member.vote_count || 1} vote{(member.vote_count || 1) !== 1 ? 's' : ''}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}

                    {/* Pending Members */}
                    {votingStatus.pending_members.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4"
                        >
                            <h4 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center">
                                <span className="mr-2">⏳</span>
                                Waiting ({votingStatus.pending_members.length})
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                <AnimatePresence>
                                    {votingStatus.pending_members.map((member) => (
                                        <motion.div
                                            key={member.user_id || member.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="flex items-center space-x-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                                        >
                                            <Avatar 
                                                name={member.username}
                                                src={member.avatar_url}
                                                size={32}
                                                className="opacity-60"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white/80 font-medium truncate">
                                                    {member.username}
                                                </p>
                                                <p className="text-xs text-yellow-400">
                                                    Hasn't voted yet
                                                </p>
                                            </div>
                                            <div className="text-yellow-400">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* All Members Voted */}
            {votingStatus.voting_complete && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-center"
                >
                    <div className="text-2xl mb-2">🎉</div>
                    <h4 className="text-lg font-bold text-white mb-1">
                        All Members Have Voted!
                    </h4>
                    <p className="text-green-400 text-sm">
                        Voting session is complete
                    </p>
                </motion.div>
            )}

            {/* Connection Error */}
            {!isConnected && !status.isReconnecting && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"
                >
                    <div className="flex items-center space-x-2 text-red-400 text-sm">
                        <span>⚠️</span>
                        <span>
                            Live updates unavailable. {status.error || 'Refresh to reconnect.'}
                        </span>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default VotingStatusPanel;