// src/front/components/VoterStatusPanel.jsx - Enhanced Version
import React, { useState, useEffect, useRef, useCallback } from 'react';
import authService from '../store/authService';
import Avatar from './Avatar';
import toast from 'react-hot-toast';

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
    const [isLiveConnected, setIsLiveConnected] = useState(false);
    const [connectionRetries, setConnectionRetries] = useState(0);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Refs for cleanup
    const eventSourceRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    
    // Constants
    const maxRetries = 3;
    const pollInterval = 15000; // 15 seconds
    const reconnectDelay = 5000; // 5 seconds

    // Initialize component
    useEffect(() => {
        if (!sessionId) return;

        initializeVoterStatuses();
        fetchVoterStatus();
        setupLiveConnection();
        setupFallbackPolling();

        return cleanup;
    }, [sessionId, groupMembers]);

    const initializeVoterStatuses = useCallback(() => {
        if (!groupMembers.length) return;

        console.log('🔄 Initializing voter statuses for', groupMembers.length, 'members');
        
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

    const fetchVoterStatus = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/sessions/${sessionId}/voters`
            );
            
            if (response.ok) {
                const data = await response.json();
                setVoterData(data);
                updateVoterStatusesFromData(data);
                setError(null);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load voter status');
            }
        } catch (error) {
            console.error('Error fetching voter status:', error);
            setError(error.message || 'Network error loading voter status');
        } finally {
            setLoading(false);
        }
    };

    const setupLiveConnection = () => {
        if (!sessionId) return;
        
        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = authService.getAccessToken();
            
            if (!token) {
                console.warn('No auth token for SSE connection');
                setIsLiveConnected(false);
                return;
            }

            // Use token-based authentication for SSE
            const sseUrl = `${backendUrl}/api/gaming/sessions/${sessionId}/voter-status-stream?token=${encodeURIComponent(token)}`;
            const eventSource = new EventSource(sseUrl);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('✅ Voter status SSE connected');
                setIsLiveConnected(true);
                setConnectionRetries(0);
                setError(null);
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 Voter status update:', data);
                    
                    // Handle heartbeat messages
                    if (data.heartbeat) {
                        console.log('💓 SSE heartbeat received');
                        return;
                    }
                    
                    if (data.error) {
                        console.error('❌ SSE error from server:', data.error);
                        setError(data.error);
                        return;
                    }

                    // Update data and notify parent
                    updateVoterData(data);
                    setLastUpdate(new Date().toISOString());
                    
                    if (onVoterUpdate) {
                        onVoterUpdate(data);
                    }

                } catch (parseError) {
                    console.error('❌ Error parsing voter status data:', parseError);
                }
            };

            eventSource.onerror = (error) => {
                console.error('❌ Voter status SSE error:', error);
                setIsLiveConnected(false);
                eventSource.close();
                
                // Retry with exponential backoff
                if (connectionRetries < maxRetries) {
                    const delay = Math.pow(2, connectionRetries) * 2000;
                    console.log(`🔄 Retrying SSE connection in ${delay}ms (attempt ${connectionRetries + 1}/${maxRetries})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        setConnectionRetries(prev => prev + 1);
                        setupLiveConnection();
                    }, delay);
                } else {
                    console.log('❌ Max retries reached, relying on polling fallback');
                }
            };

        } catch (error) {
            console.error('❌ Failed to setup SSE connection:', error);
            setIsLiveConnected(false);
        }
    };

    const setupFallbackPolling = () => {
        // Clear existing interval
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }

        // Setup polling fallback
        const interval = setInterval(() => {
            if (!isLiveConnected) {
                console.log('📊 Polling fallback - fetching voter status');
                fetchVoterStatus();
            }
        }, pollInterval);
        
        pollIntervalRef.current = interval;
    };

    const updateVoterData = (data) => {
        // Update aggregate voter data
        setVoterData(prevData => {
            const newData = {
                ...prevData,
                progress: data.progress,
                pending_voters: data.pending_voters || [],
                recent_voters: data.recent_voters || [],
                voting_complete: data.voting_complete,
                total_voters: data.total_voters
            };

            // Show notification for new votes
            if (prevData?.progress && data.progress?.voted > prevData.progress.voted) {
                const newVotes = data.progress.voted - prevData.progress.voted;
                toast.success(`🗳️ ${newVotes} new vote${newVotes !== 1 ? 's' : ''}!`, { 
                    duration: 2000,
                    position: 'top-right'
                });
            }

            return newData;
        });

        // Update individual voter statuses if we have detailed results
        if (data.results || data.voters) {
            updateVoterStatusesFromData(data);
        }
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
                        lastVotedAt: new Date().toISOString()
                    };
                }
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
                    isOnline: true
                };
            });
            
            return newStatuses;
        });
    };

    const cleanup = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
    };

    const handleRetry = () => {
        setError(null);
        setLoading(true);
        setConnectionRetries(0);
        fetchVoterStatus();
        setupLiveConnection();
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
                    <span className="text-white/70 text-sm">Loading voter status...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`backdrop-blur-xl bg-white/10 border border-red-500/30 rounded-2xl p-6 ${className}`}>
                <h3 className="text-lg font-bold text-white mb-2">Voter Status</h3>
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
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center">
                    <span className="text-xl mr-2">👥</span>
                    Voter Status
                </h3>
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                        isLiveConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                    }`} title={isLiveConnected ? 'Live updates' : 'Polling mode'}></div>
                    <span className="text-white/60 text-xs">
                        {isLiveConnected ? 'Live' : 'Polling'}
                    </span>
                    {voting_complete && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full text-xs">
                            ✅ Complete
                        </span>
                    )}
                </div>
            </div>

            {/* Progress Overview */}
            <div className="mb-6">
                <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-coral-400 mb-1">
                        {progress.voted || 0}/{progress.total || 0}
                    </div>
                    <div className="text-white/60 text-sm">Votes Collected</div>
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
                /* Detailed Individual Voter View */
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
                                {recent_voters.slice(0, 3).map(voter => (
                                    <div key={voter.id} className="flex items-center space-x-1">
                                        <Avatar name={voter.username} size={20} />
                                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                                            {voter.username}
                                        </span>
                                    </div>
                                ))}
                                {recent_voters.length > 3 && (
                                    <span className="px-2 py-1 bg-white/10 text-white/60 rounded text-xs">
                                        +{recent_voters.length - 3} more
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
                                {pending_voters.slice(0, 4).map(voter => (
                                    <div key={voter.id} className="flex items-center space-x-1">
                                        <Avatar name={voter.username} size={20} />
                                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs">
                                            {voter.username}
                                        </span>
                                    </div>
                                ))}
                                {pending_voters.length > 4 && (
                                    <span className="px-2 py-1 bg-white/10 text-white/60 rounded text-xs">
                                        +{pending_voters.length - 4} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
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

            {/* Footer Info */}
            {(lastUpdate || connectionRetries > 0) && (
                <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-white/50">
                        {lastUpdate && (
                            <span>Last update: {formatTimeAgo(lastUpdate)}</span>
                        )}
                        {connectionRetries > 0 && (
                            <span className="text-yellow-400">
                                Retried {connectionRetries}x
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