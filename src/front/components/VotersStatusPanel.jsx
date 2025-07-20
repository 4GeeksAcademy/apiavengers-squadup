// src/front/components/VoterStatusPanel.jsx - Voter status panel for voting sessions

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import { useSSEManager } from '../services/sseManager';
import authService from '../store/authService';

const VoterStatusPanel = ({ 
    sessionId, 
    className = "",
    showProgress = true,
    showRecentActivity = true,
    maxRecentItems = 5,
    onStatusUpdate 
}) => {
    const [voterStatus, setVoterStatus] = useState({
        progress: { voted: 0, total: 0, percentage: 0 },
        recent_voters: [],
        pending_voters: [],
        voting_complete: false,
        session_status: 'voting'
    });

    const [recentActivity, setRecentActivity] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    // SSE connection for real-time voter status updates
    const endpoint = `/api/gaming/sessions/${sessionId}/voter-status-stream`;
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
            if (data.type === 'heartbeat') {
                // Just acknowledge heartbeat
                return;
            }

            // Handle voter status updates
            if (data.progress || data.recent_voters || data.pending_voters) {
                setVoterStatus(prevStatus => ({
                    ...prevStatus,
                    ...data
                }));

                // Track recent voting activity
                if (data.recent_voters && data.recent_voters.length > 0) {
                    const newVoters = data.recent_voters.filter(voter => 
                        !recentActivity.some(activity => activity.user_id === voter.user_id)
                    );

                    if (newVoters.length > 0) {
                        setRecentActivity(prev => [
                            ...newVoters.map(voter => ({
                                id: `${voter.user_id}-${Date.now()}`,
                                user_id: voter.user_id,
                                username: voter.username,
                                avatar_url: voter.avatar_url,
                                action: 'voted',
                                timestamp: new Date()
                            })),
                            ...prev
                        ].slice(0, maxRecentItems));
                    }
                }

                onStatusUpdate?.(data);
            }
        };

        const handleConnected = () => {
            console.log('✅ Voter status panel connected');
            setIsConnected(true);
        };

        const handleDisconnected = () => {
            console.log('❌ Voter status panel disconnected');
            setIsConnected(false);
        };

        const handleError = (error) => {
            console.error('❌ Voter status panel error:', error);
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
    }, [manager, onStatusUpdate, maxRecentItems, recentActivity]);

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const diffMs = now - new Date(timestamp);
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);

        if (diffSecs < 30) return 'just now';
        if (diffSecs < 60) return `${diffSecs}s ago`;
        if (diffMins < 60) return `${diffMins}m ago`;
        return 'earlier';
    };

    const getConnectionIndicator = () => {
        if (isConnected) {
            return { color: 'text-green-400', icon: '🟢', text: 'Live Updates' };
        } else if (status.isReconnecting) {
            return { color: 'text-yellow-400', icon: '🟡', text: 'Reconnecting...' };
        } else {
            return { color: 'text-red-400', icon: '🔴', text: 'Offline' };
        }
    };

    const connectionIndicator = getConnectionIndicator();

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

                    {/* Progress Bar */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-white/70">
                                {voterStatus.progress.voted} of {voterStatus.progress.total} members voted
                            </span>
                            <span className="text-white font-medium">
                                {Math.round(voterStatus.progress.percentage || 0)}%
                            </span>
                        </div>
                        
                        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${voterStatus.progress.percentage || 0}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                        </div>

                        {/* Status Message */}
                        <div className="text-center">
                            {voterStatus.voting_complete ? (
                                <span className="text-green-400 font-medium">
                                    ✅ Voting Complete!
                                </span>
                            ) : voterStatus.progress.voted === 0 ? (
                                <span className="text-yellow-400">
                                    ⏳ Waiting for votes...
                                </span>
                            ) : (
                                <span className="text-blue-400">
                                    🗳️ Voting in progress...
                                </span>
                            )}
                        </div>
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
                            {recentActivity.map((activity) => (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                                >
                                    <Avatar 
                                        user={activity}
                                        size="sm"
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

            {/* Current Status Summary */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4"
            >
                <div className="grid grid-cols-2 gap-4">
                    {/* Voted Count */}
                    <div className="text-center">
                        <motion.div 
                            className="text-2xl font-bold text-green-400 mb-1"
                            key={voterStatus.progress.voted}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            {voterStatus.progress.voted || 0}
                        </motion.div>
                        <div className="text-sm text-white/70">Voted</div>
                    </div>

                    {/* Pending Count */}
                    <div className="text-center">
                        <motion.div 
                            className="text-2xl font-bold text-yellow-400 mb-1"
                            key={voterStatus.progress.total - voterStatus.progress.voted}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            {(voterStatus.progress.total || 0) - (voterStatus.progress.voted || 0)}
                        </motion.div>
                        <div className="text-sm text-white/70">Pending</div>
                    </div>
                </div>
            </motion.div>

            {/* Pending Voters List (if not too many) */}
            {voterStatus.pending_voters && voterStatus.pending_voters.length > 0 && voterStatus.pending_voters.length <= 5 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4"
                >
                    <h4 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center">
                        <span className="mr-2">⏳</span>
                        Waiting for ({voterStatus.pending_voters.length})
                    </h4>
                    
                    <div className="space-y-2">
                        {voterStatus.pending_voters.map((voter) => (
                            <div
                                key={voter.user_id}
                                className="flex items-center space-x-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                            >
                                <Avatar 
                                    user={voter}
                                    size="xs"
                                />
                                <span className="text-sm text-white/80 truncate">
                                    {voter.username}
                                </span>
                            </div>
                        ))}
                    </div>
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

export default VoterStatusPanel;