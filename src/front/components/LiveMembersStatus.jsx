// src/front/components/LiveMemberStatus.jsx - Live member voting status like Kahoot

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import { useSSEManager } from '../services/sseManager';
import authService from '../store/authService';

const LiveMemberStatus = ({ 
    sessionId, 
    groupMembers = [],
    className = "",
    onMemberUpdate 
}) => {
    const [memberStatus, setMemberStatus] = useState({
        voted: [],
        pending: [],
        progress: { voted: 0, total: 0, percentage: 0 }
    });
    
    const [recentActivity, setRecentActivity] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    // SSE connection for real-time updates
    const endpoint = `/api/gaming/sessions/${sessionId}/member-status`;
    const token = authService.getAccessToken();
    
    const { manager, status } = useSSEManager(endpoint, {
        enableLogging: true,
        maxRetries: 3,
        retryDelay: 2000
    });

    useEffect(() => {
        if (!manager) return;

        const handleMessage = (data) => {
            if (data.type === 'member_status_update') {
                setMemberStatus({
                    voted: data.members?.filter(m => m.has_voted) || [],
                    pending: data.members?.filter(m => !m.has_voted) || [],
                    progress: data.summary || { voted: 0, total: 0, percentage: 0 }
                });

                // Track recent activity
                const newVoters = data.members?.filter(m => m.has_voted && m.vote_time) || [];
                const recentVoter = newVoters
                    .sort((a, b) => new Date(b.vote_time) - new Date(a.vote_time))[0];
                
                if (recentVoter) {
                    setRecentActivity(prev => [
                        {
                            id: Date.now(),
                            user: recentVoter,
                            action: 'voted',
                            timestamp: new Date(recentVoter.vote_time)
                        },
                        ...prev.slice(0, 4) // Keep last 5 activities
                    ]);
                }

                onMemberUpdate?.(data);
            }
        };

        const handleConnected = () => {
            console.log('✅ Live member status connected');
            setIsConnected(true);
        };

        const handleDisconnected = () => {
            console.log('❌ Live member status disconnected');
            setIsConnected(false);
        };

        const handleError = (error) => {
            console.error('❌ Live member status error:', error);
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
    }, [manager, onMemberUpdate]);

    // Initialize with group members if no live data yet
    useEffect(() => {
        if (groupMembers.length > 0 && memberStatus.voted.length === 0 && memberStatus.pending.length === 0) {
            setMemberStatus({
                voted: [],
                pending: groupMembers.map(member => ({
                    user_id: member.id,
                    username: member.username,
                    avatar_url: member.avatar_url,
                    has_voted: false
                })),
                progress: { voted: 0, total: groupMembers.length, percentage: 0 }
            });
        }
    }, [groupMembers, memberStatus]);

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

    const getConnectionStatus = () => {
        if (status.isConnected) return { color: 'text-green-400', icon: '🟢', text: 'Live' };
        if (status.isReconnecting) return { color: 'text-yellow-400', icon: '🟡', text: 'Connecting...' };
        return { color: 'text-red-400', icon: '🔴', text: 'Offline' };
    };

    const connectionStatus = getConnectionStatus();

    return (
        <div className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-bold text-white">Member Status</h3>
                    <div className={`flex items-center space-x-1 text-sm ${connectionStatus.color}`}>
                        <span>{connectionStatus.icon}</span>
                        <span>{connectionStatus.text}</span>
                    </div>
                </div>

                {/* Progress Ring */}
                <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                        <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="4"
                            fill="none"
                        />
                        <motion.circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="#10b981"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                            animate={{ 
                                strokeDashoffset: 2 * Math.PI * 28 * (1 - memberStatus.progress.percentage / 100)
                            }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                            {Math.round(memberStatus.progress.percentage)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                        {memberStatus.progress.voted}
                    </div>
                    <div className="text-sm text-white/70">Voted</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                        {memberStatus.progress.total - memberStatus.progress.voted}
                    </div>
                    <div className="text-sm text-white/70">Pending</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                        {memberStatus.progress.total}
                    </div>
                    <div className="text-sm text-white/70">Total</div>
                </div>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white/80 mb-3">Recent Activity</h4>
                    <div className="space-y-2">
                        <AnimatePresence>
                            {recentActivity.slice(0, 3).map((activity) => (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center space-x-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg"
                                >
                                    <Avatar 
                                        user={activity.user}
                                        size="sm"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium truncate">
                                            {activity.user.username} voted
                                        </p>
                                        <p className="text-xs text-green-400">
                                            {formatTimeAgo(activity.timestamp)}
                                        </p>
                                    </div>
                                    <div className="text-green-400">
                                        ✓
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Member Lists */}
            <div className="space-y-4">
                {/* Voted Members */}
                {memberStatus.voted.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center">
                            <span className="mr-2">✅</span>
                            Voted ({memberStatus.voted.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            <AnimatePresence>
                                {memberStatus.voted.map((member) => (
                                    <motion.div
                                        key={member.user_id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                                    >
                                        <Avatar 
                                            user={member}
                                            size="sm"
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
                                        <div className="flex items-center space-x-1">
                                            <span className="text-green-400 text-sm">
                                                {member.vote_count || 1} vote{(member.vote_count || 1) !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* Pending Members */}
                {memberStatus.pending.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center">
                            <span className="mr-2">⏳</span>
                            Waiting ({memberStatus.pending.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            <AnimatePresence>
                                {memberStatus.pending.map((member) => (
                                    <motion.div
                                        key={member.user_id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex items-center space-x-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                                    >
                                        <Avatar 
                                            user={member}
                                            size="sm"
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
                    </div>
                )}
            </div>

            {/* All Members Voted */}
            {memberStatus.progress.percentage >= 100 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-center"
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

            {/* Connection Status Footer */}
            {!status.isConnected && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-400 text-sm">
                        <span>⚠️</span>
                        <span>
                            {status.error || 'Connection lost. Trying to reconnect...'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveMemberStatus;