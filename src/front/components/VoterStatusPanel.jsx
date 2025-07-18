// src/front/components/VoterStatusPanel.jsx - Enhanced with SSE Manager
import React, { useState, useEffect, useRef, useCallback } from 'react';
import authService from '../store/authService';
import Avatar from './Avatar';
import toast from 'react-hot-toast';
import SSEManager from '../services/sseManager';

const VoterStatusPanel = ({ 
    sessionId, 
    groupMembers = [], 
    onVoterUpdate = null,
    className = "",
    showDetailedView = true 
}) => {
    // State management
    const [voterStatuses, setVoterStatuses] = useState({});
    const [voterData, setVoterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Enhanced connection state
    const [connectionState, setConnectionState] = useState({
        isConnected: false,
        isReconnecting: false,
        retryCount: 0,
        error: null,
        lastUpdate: null,
        updateCount: 0
    });
    
    // SSE Manager ref
    const sseManagerRef = useRef(null);
    const pollIntervalRef = useRef(null);

    // Initialize component
    useEffect(() => {
        if (!sessionId) return;

        initializeVoterStatuses();
        fetchVoterStatus();
        setupEnhancedLiveConnection();
        setupFallbackPolling();

        return cleanup;
    }, [sessionId, groupMembers]);

    const initializeVoterStatuses = useCallback(() => {
        if (!groupMembers.length) return;

        console.log('🔄 Initializing enhanced voter statuses for', groupMembers.length, 'members');
        
        const initialStatuses = {};
        groupMembers.forEach(member => {
            initialStatuses[member.id] = {
                user: member,
                hasVoted: false,
                votedAt: null,
                voteCount: 0,
                isOnline: true,
                lastSeen: new Date().toISOString()
            };
        });
        
        setVoterStatuses(initialStatuses);
    }, [groupMembers]);

    const fetchVoterStatus = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/sessions/${sessionId}/voters`
            );
            
            if (response.ok) {
                const data = await response.json();
                setVoterData(data);
                updateVoterStatusesFromData(data);
                setError(null);
                
                console.log('📊 Voter status loaded:', data);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load voter status');
            }
        } catch (error) {
            console.error('❌ Error fetching voter status:', error);
            setError(error.message || 'Network error loading voter status');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const setupEnhancedLiveConnection = () => {
        if (!sessionId) return;
        
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const endpoint = `${backendUrl}/api/gaming/sessions/${sessionId}/voter-status-stream`;
        
        console.log('🔌 Setting up enhanced voter status live connection...');
        
        // Create SSE Manager for voter status
        const sseManager = new SSEManager(endpoint, {
            maxRetries: 5,
            retryDelay: 3000,
            heartbeatTimeout: 45000,
            reconnectMultiplier: 1.4,
            maxReconnectDelay: 25000
        });
        
        sseManagerRef.current = sseManager;
        
        // Connection established
        sseManager.on('connected', (data) => {
            console.log('✅ Enhanced voter status live updates connected');
            setConnectionState(prev => ({
                ...prev,
                isConnected: true,
                isReconnecting: false,
                error: null,
                retryCount: 0
            }));
            
            if (connectionState.retryCount > 0) {
                toast.success('📊 Voter status live updates restored!', { duration: 2000 });
            }
        });
        
        // Connection lost
        sseManager.on('disconnected', () => {
            console.log('📡 Voter status live updates disconnected');
            setConnectionState(prev => ({
                ...prev,
                isConnected: false,
                isReconnecting: false
            }));
        });
        
        // Reconnection scheduled
        sseManager.on('reconnectScheduled', (data) => {
            console.log(`🔄 Reconnecting voter status in ${data.delay}ms (attempt ${data.retryCount})`);
            setConnectionState(prev => ({
                ...prev,
                isReconnecting: true,
                retryCount: data.retryCount
            }));
        });
        
        // Data message received
        sseManager.on('message', handleEnhancedVoterUpdate);
        
        // Heartbeat received
        sseManager.on('heartbeat', (data) => {
            setConnectionState(prev => ({
                ...prev,
                lastUpdate: new Date(data.timestamp).toISOString()
            }));
        });
        
        // Connection error
        sseManager.on('error', (data) => {
            console.error('❌ Voter status connection error:', data);
            setConnectionState(prev => ({
                ...prev,
                error: 'Connection error',
                retryCount: data.retryCount
            }));
        });
        
        // Max retries reached
        sseManager.on('maxRetriesReached', (data) => {
            console.log('❌ Max reconnection attempts reached for voter status');
            setConnectionState(prev => ({
                ...prev,
                isReconnecting: false,
                error: 'Live updates unavailable'
            }));
            
            toast.error('Voter status live updates unavailable. Using polling.', {
                duration: 4000,
                icon: '⚠️'
            });
        });
        
        // Start the connection
        sseManager.connect();
    };

    const handleEnhancedVoterUpdate = useCallback((data) => {
        console.log('👥 Enhanced voter status update:', data);
        
        setConnectionState(prev => ({
            ...prev,
            lastUpdate: new Date().toISOString(),
            updateCount: prev.updateCount + 1
        }));
        
        // Update aggregate voter data
        setVoterData(prevData => {
            const newData = {
                ...prevData,
                progress: data.progress || prevData?.progress,
                pending_voters: data.pending_voters || prevData?.pending_voters || [],
                recent_voters: data.recent_voters || prevData?.recent_voters || [],
                voting_complete: data.voting_complete !== undefined ? data.voting_complete : prevData?.voting_complete,
                total_voters: data.total_voters !== undefined ? data.total_voters : prevData?.total_voters
            };

            // Show notification for new votes with enhanced details
            if (prevData?.progress && data.progress?.voted > prevData.progress.voted) {
                const newVotes = data.progress.voted - prevData.progress.voted;
                
                // Try to identify who voted if we have recent voter data
                if (data.recent_voters && data.recent_voters.length > 0) {
                    const latestVoter = data.recent_voters[data.recent_voters.length - 1];
                    toast.success(`✅ ${latestVoter.username} just voted! (${data.progress.voted}/${data.progress.total})`, { 
                        duration: 3000,
                        icon: '🗳️'
                    });
                } else {
                    toast.success(`🗳️ ${newVotes} new vote${newVotes !== 1 ? 's' : ''}! (${data.progress.voted}/${data.progress.total})`, { 
                        duration: 2000
                    });
                }
            }

            // Check for voting completion
            if (!prevData?.voting_complete && data.voting_complete) {
                toast.success('🎉 All members have voted!', { 
                    duration: 4000,
                    icon: '🏁'
                });
            }

            return newData;
        });

        // Update individual voter statuses if we have detailed results
        if (data.voter_details || data.results || data.voters) {
            updateVoterStatusesFromData(data);
        }
        
        // Handle specific voter events
        if (data.event_type) {
            handleVoterEvent(data);
        }
        
        // Notify parent component
        if (onVoterUpdate) {
            onVoterUpdate(data);
        }
    }, [onVoterUpdate]);

    const handleVoterEvent = (eventData) => {
        switch (eventData.event_type) {
            case 'voter_joined':
                toast(`👋 ${eventData.voter.username} joined the session`, {
                    duration: 2000,
                    icon: '🔵'
                });
                break;
            
            case 'voter_left':
                toast(`👋 ${eventData.voter.username} left the session`, {
                    duration: 2000,
                    icon: '🔴'
                });
                break;
            
            case 'vote_submitted':
                // This is handled in the general update logic
                break;
            
            case 'vote_changed':
                toast(`🔄 ${eventData.voter.username} updated their vote`, {
                    duration: 2000,
                    icon: '✏️'
                });
                break;
                
            default:
                console.log('Unknown voter event:', eventData.event_type);
        }
    };

    const setupFallbackPolling = () => {
        // Clear any existing interval
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }

        // Setup polling as fallback
        const interval = setInterval(() => {
            if (connectionState.isConnected || voterData?.voting_complete) {
                return; // Don't poll if connected or voting is complete
            }
            
            console.log('📊 Polling fallback - fetching voter status');
            fetchVoterStatus(true);
        }, 15000); // Poll every 15 seconds
        
        pollIntervalRef.current = interval;
    };

    const updateVoterStatusesFromData = (data) => {
        if (!groupMembers.length) return;

        const votedUserIds = new Set();
        const voteDetails = {};
        
        // Process results data
        if (data.results && Array.isArray(data.results)) {
            data.results.forEach(result => {
                if (result.game?.voters) {
                    result.game.voters.forEach(voter => {
                        votedUserIds.add(voter.user_id);
                        if (!voteDetails[voter.user_id]) {
                            voteDetails[voter.user_id] = {
                                totalVotes: 0,
                                lastVotedAt: voter.voted_at || new Date().toISOString()
                            };
                        }
                        voteDetails[voter.user_id].totalVotes += 1;
                    });
                }
            });
        }

        // Process recent voters data
        if (data.recent_voters) {
            data.recent_voters.forEach(voter => {
                votedUserIds.add(voter.id);
                if (!voteDetails[voter.id]) {
                    voteDetails[voter.id] = {
                        totalVotes: 1,
                        lastVotedAt: voter.voted_at || new Date().toISOString()
                    };
                }
            });
        }
        
        // Process voter details if available
        if (data.voter_details) {
            Object.keys(data.voter_details).forEach(userId => {
                const details = data.voter_details[userId];
                votedUserIds.add(parseInt(userId));
                voteDetails[userId] = {
                    totalVotes: details.vote_count || 1,
                    lastVotedAt: details.voted_at || new Date().toISOString()
                };
            });
        }
        
        // Update voter statuses
        setVoterStatuses(prevStatuses => {
            const newStatuses = { ...prevStatuses };
            
            Object.keys(newStatuses).forEach(userId => {
                const userIdNum = parseInt(userId);
                const hasVoted = votedUserIds.has(userIdNum);
                const voteInfo = voteDetails[userIdNum];
                
                newStatuses[userId] = {
                    ...newStatuses[userId],
                    hasVoted,
                    voteCount: voteInfo?.totalVotes || 0,
                    votedAt: hasVoted ? (voteInfo?.lastVotedAt || new Date().toISOString()) : null,
                    lastSeen: new Date().toISOString(),
                    isOnline: true // Assume online if we're getting updates
                };
            });
            
            return newStatuses;
        });
    };

    const cleanup = () => {
        if (sseManagerRef.current) {
            console.log('🧹 Cleaning up enhanced voter status SSE Manager...');
            sseManagerRef.current.destroy();
            sseManagerRef.current = null;
        }
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    const handleRetry = () => {
        setError(null);
        setLoading(true);
        fetchVoterStatus();
        
        if (sseManagerRef.current) {
            sseManagerRef.current.forceReconnect();
        } else {
            setupEnhancedLiveConnection();
        }
    };

    const forceReconnect = () => {
        if (sseManagerRef.current) {
            sseManagerRef.current.forceReconnect();
            toast.loading('Reconnecting voter status...', { duration: 2000 });
        }
    };

    const getVotingProgress = () => {
        if (voterData?.progress) {
            return voterData.progress;
        }
        
        // Fallback to calculated progress from voter statuses
        const totalMembers = groupMembers.length;
        const votedCount = Object.values(voterStatuses).filter(status => status.hasVoted).length;
        return {
            voted: votedCount,
            total: totalMembers,
            percentage: totalMembers > 0 ? (votedCount / totalMembers) * 100 : 0
        };
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            
            return 'yesterday';
        } catch (error) {
            return '';
        }
    };

    const getStatusColor = (status) => {
        if (status.hasVoted) return 'text-green-400';
        if (status.isOnline) return 'text-yellow-400';
        return 'text-gray-400';
    };

    const getStatusIcon = (status) => {
        if (status.hasVoted) return '✅';
        if (status.isOnline) return '⏳';
        return '💤';
    };

    // Early returns for edge cases
    if (!sessionId) return null;

    if (loading && !voterData) {
        return (
            <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 ${className}`}>
                <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    <span className="text-white/70 text-sm">Loading enhanced voter status...</span>
                </div>
            </div>
        );
    }

    if (error && !voterData) {
        return (
            <div className={`backdrop-blur-xl bg-white/10 border border-red-500/30 rounded-2xl p-6 ${className}`}>
                <h3 className="text-lg font-bold text-white mb-2">Enhanced Voter Status</h3>
                <div className="text-red-300 text-sm mb-3">{error}</div>
                <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
                >
                    🔄 Retry
                </button>
            </div>
        );
    }

    const progress = getVotingProgress();
    const { pending_voters = [], recent_voters = [], voting_complete } = voterData || {};
    const sortedStatuses = Object.values(voterStatuses).sort((a, b) => {
        if (a.hasVoted !== b.hasVoted) return b.hasVoted - a.hasVoted;
        if (a.isOnline !== b.isOnline) return b.isOnline - a.isOnline;
        return a.user.username.localeCompare(b.user.username);
    });

    return (
        <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 ${className}`}>
            {/* Enhanced Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center">
                    <span className="text-xl mr-2">👥</span>
                    Enhanced Voter Status
                </h3>
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                        connectionState.isConnected ? 'bg-green-400 animate-pulse' : 
                        connectionState.isReconnecting ? 'bg-yellow-400 animate-pulse' :
                        'bg-gray-400'
                    }`} title={
                        connectionState.isConnected ? 'Live updates' : 
                        connectionState.isReconnecting ? 'Reconnecting' :
                        'Polling mode'
                    }></div>
                    <span className="text-white/60 text-xs">
                        {connectionState.isConnected ? 'Live' : 
                         connectionState.isReconnecting ? 'Reconnecting' :
                         'Polling'}
                    </span>
                    {voting_complete && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full text-xs">
                            ✅ Complete
                        </span>
                    )}
                </div>
            </div>

            {/* Enhanced Progress Overview */}
            <div className="mb-6">
                <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-coral-400 mb-1">
                        {progress.voted || 0}/{progress.total || 0}
                    </div>
                    <div className="text-white/60 text-sm">Votes Collected</div>
                    {connectionState.updateCount > 0 && (
                        <div className="text-white/40 text-xs mt-1">
                            {connectionState.updateCount} live updates
                        </div>
                    )}
                </div>
                
                <div className="w-full bg-white/10 rounded-full h-3 mb-2">
                    <div 
                        className="bg-gradient-to-r from-coral-500 to-marine-500 h-3 rounded-full transition-all duration-500 flex items-center justify-center"
                        style={{ width: `${progress.percentage || 0}%` }}
                    >
                        {(progress.percentage || 0) > 20 && (
                            <span className="text-white text-xs font-bold">
                                {Math.round(progress.percentage || 0)}%
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="text-center">
                    {voting_complete ? (
                        <span className="text-green-400 text-sm font-medium">
                            🎉 Voting Complete!
                        </span>
                    ) : progress.percentage === 100 ? (
                        <span className="text-yellow-400 text-sm font-medium">
                            ⏳ Finalizing results...
                        </span>
                    ) : (
                        <span className="text-white/60 text-sm">
                            Waiting for {(progress.total || 0) - (progress.voted || 0)} more vote{(progress.total || 0) - (progress.voted || 0) !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>

            {/* Conditional detailed view */}
            {showDetailedView && sortedStatuses.length > 0 ? (
                /* Enhanced Detailed Individual Voter View */
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                    {sortedStatuses.map((status) => (
                        <div 
                            key={status.user.id}
                            className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                                status.hasVoted 
                                    ? 'bg-green-500/10 border border-green-500/20' 
                                    : 'bg-white/5 hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="relative">
                                    <Avatar 
                                        name={status.user.username} 
                                        size={32}
                                        className={`transition-all duration-300 ${
                                            status.hasVoted ? 'ring-2 ring-green-400' : ''
                                        }`}
                                    />
                                    <div className="absolute -bottom-1 -right-1 text-lg">
                                        {getStatusIcon(status)}
                                    </div>
                                </div>
                                
                                <div>
                                    <div className={`font-medium ${getStatusColor(status)}`}>
                                        {status.user.username}
                                    </div>
                                    <div className="text-white/60 text-xs">
                                        {status.hasVoted ? `Voted (${status.voteCount} games)` : 
                                         status.isOnline ? 'Thinking...' : 'Offline'}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                {status.hasVoted && (
                                    <div className="text-green-400 text-sm font-medium">
                                        {status.voteCount} game{status.voteCount !== 1 ? 's' : ''}
                                    </div>
                                )}
                                {status.votedAt && (
                                    <div className="text-white/50 text-xs">
                                        {formatTimeAgo(status.votedAt)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Simplified Aggregate View */
                <div className="space-y-4">
                    {recent_voters.length > 0 && (
                        <div>
                            <p className="text-white/70 text-sm mb-2 flex items-center">
                                <span className="text-green-400 mr-1">✅</span>
                                Recent votes:
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {recent_voters.slice(0, 4).map(voter => (
                                    <div key={voter.id} className="flex items-center space-x-1">
                                        <Avatar name={voter.username} size={20} />
                                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                                            {voter.username}
                                        </span>
                                    </div>
                                ))}
                                {recent_voters.length > 4 && (
                                    <span className="px-2 py-1 bg-white/10 text-white/60 rounded text-xs">
                                        +{recent_voters.length - 4} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {pending_voters.length > 0 && !voting_complete && (
                        <div>
                            <p className="text-white/70 text-sm mb-2 flex items-center">
                                <span className="text-yellow-400 mr-1">⏳</span>
                                Waiting for:
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {pending_voters.slice(0, 5).map(voter => (
                                    <div key={voter.id} className="flex items-center space-x-1">
                                        <Avatar name={voter.username} size={20} />
                                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs">
                                            {voter.username}
                                        </span>
                                    </div>
                                ))}
                                {pending_voters.length > 5 && (
                                    <span className="px-2 py-1 bg-white/10 text-white/60 rounded text-xs">
                                        +{pending_voters.length - 5} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Enhanced Connection Status & Actions */}
            {connectionState.error && !connectionState.isConnected && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="text-yellow-300 text-sm mb-2">
                        ⚠️ {connectionState.error}
                    </div>
                    <button
                        onClick={forceReconnect}
                        className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 rounded text-xs transition-colors"
                    >
                        🔄 Reconnect
                    </button>
                </div>
            )}

            {/* Action Buttons */}
            {voting_complete && (
                <div className="mt-4 pt-3 border-t border-white/10">
                    <button
                        onClick={() => window.open(`/sessions/${sessionId}/results`, '_blank')}
                        className="w-full px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                        🏆 View Final Results
                    </button>
                </div>
            )}

            {/* Enhanced Footer Info */}
            {(connectionState.lastUpdate || connectionState.retryCount > 0 || connectionState.updateCount > 0) && (
                <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-white/50">
                        <div className="flex items-center space-x-2">
                            {connectionState.lastUpdate && (
                                <span>Updated: {formatTimeAgo(connectionState.lastUpdate)}</span>
                            )}
                            {connectionState.updateCount > 0 && (
                                <span className="text-green-400">
                                    {connectionState.updateCount} updates
                                </span>
                            )}
                        </div>
                        {connectionState.retryCount > 0 && (
                            <span className="text-yellow-400">
                                Retried {connectionState.retryCount}x
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {sortedStatuses.length === 0 && !voterData && (
                <div className="text-center py-8">
                    <div className="text-4xl mb-2">👥</div>
                    <p className="text-white/60">No group members found</p>
                </div>
            )}
        </div>
    );
};

export default VoterStatusPanel;