// src/front/components/VoterStatusPanel.jsx - FIXED for Token-based SSE Authentication
import React, { useState, useEffect, useRef } from 'react';
import authService from '../store/authService';
import Avatar from './Avatar';
import toast from 'react-hot-toast';

const VoterStatusPanel = ({ sessionId, groupId }) => {
    const [voterData, setVoterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLiveConnected, setIsLiveConnected] = useState(false);
    const eventSourceRef = useRef(null);
    const pollIntervalRef = useRef(null);

    useEffect(() => {
        if (sessionId) {
            fetchVoterStatus();
            setupLiveVoterUpdates();
            
            // Fallback polling every 15 seconds
            const interval = setInterval(() => {
                if (!isLiveConnected) {
                    fetchVoterStatus();
                }
            }, 15000);
            pollIntervalRef.current = interval;
            
            return () => {
                clearInterval(interval);
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                }
            };
        }
    }, [sessionId]);

    const setupLiveVoterUpdates = () => {
        if (!sessionId) return;
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = authService.getAccessToken();
            
            if (!token) {
                console.warn('No auth token for voter status SSE');
                setIsLiveConnected(false);
                return;
            }

            // 🔧 FIX: Use token-based authentication for SSE
            const sseUrl = `${backendUrl}/api/gaming/sessions/${sessionId}/voter-status-stream?token=${encodeURIComponent(token)}`;
            const eventSource = new EventSource(sseUrl);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('✅ Voter status SSE connected');
                setIsLiveConnected(true);
                setError(null);
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 Voter status update:', data);
                    
                    // 🔧 FIX: Handle heartbeat messages
                    if (data.heartbeat) {
                        console.log('💓 Voter status heartbeat received');
                        return;
                    }
                    
                    if (data.error) {
                        console.error('❌ SSE error from server:', data.error);
                        setError(data.error);
                        return;
                    }

                    // Update voter data in real-time
                    setVoterData(prevData => {
                        const newData = {
                            ...prevData,
                            progress: data.progress,
                            pending_voters: data.pending_voters || [],
                            recent_voters: data.recent_voters || [],
                            voting_complete: data.voting_complete
                        };

                        // Show notification for new votes
                        if (prevData && data.progress?.voted > (prevData.progress?.voted || 0)) {
                            const newVotes = data.progress.voted - (prevData.progress?.voted || 0);
                            // Only show toast if it's not the first load
                            if (prevData.progress) {
                                toast.success(`🗳️ ${newVotes} new vote${newVotes !== 1 ? 's' : ''}!`, { duration: 2000 });
                            }
                        }

                        return newData;
                    });

                    setLoading(false);

                } catch (parseError) {
                    console.error('❌ Error parsing voter status data:', parseError);
                }
            };

            eventSource.onerror = (error) => {
                console.error('❌ Voter status SSE error:', error);
                setIsLiveConnected(false);
                
                // Close the connection and attempt reconnect after delay
                eventSource.close();
                
                setTimeout(() => {
                    console.log('🔄 Attempting voter status SSE reconnect...');
                    setupLiveVoterUpdates();
                }, 5000);
            };

        } catch (error) {
            console.error('❌ Failed to setup voter status SSE:', error);
            setIsLiveConnected(false);
        }
    };

    const fetchVoterStatus = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/sessions/${sessionId}/voters`
            );
            
            if (response.ok) {
                const data = await response.json();
                setVoterData(data);
                setError(null);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to load voter status');
            }
        } catch (error) {
            console.error('Error fetching voter status:', error);
            setError('Network error loading voter status');
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        setError(null);
        setLoading(true);
        fetchVoterStatus();
        
        // Try to reconnect SSE
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        setupLiveVoterUpdates();
    };

    if (!sessionId) return null;

    if (loading && !voterData) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    <span className="text-white/70 text-sm">Loading voter status...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-red-500/30 rounded-2xl p-6">
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

    if (!voterData) return null;

    const { progress, pending_voters = [], recent_voters = [], voting_complete } = voterData;

    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Voting Status</h3>
                <div className="flex items-center space-x-2">
                    {/* Live connection indicator */}
                    <div className={`w-2 h-2 rounded-full ${
                        isLiveConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                    }`} title={isLiveConnected ? 'Live updates' : 'Polling mode'}></div>
                    
                    {voting_complete && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full text-xs">
                            ✅ Complete
                        </span>
                    )}
                </div>
            </div>
            
            {progress && (
                <div className="space-y-4">
                    {/* Progress Overview */}
                    <div className="text-center">
                        <div className="text-3xl font-bold text-coral-400 mb-1">
                            {progress.voted || 0}/{progress.total || 0}
                        </div>
                        <div className="text-white/60 text-sm">Votes Collected</div>
                        <div className="text-white/50 text-xs mt-1">
                            {Math.round(progress.percentage || 0)}% complete
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-white/10 rounded-full h-3">
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
                    
                    {/* Recent Voters */}
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
                    
                    {/* Pending Voters */}
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

                    {/* Status Message */}
                    <div className="text-center">
                        {voting_complete ? (
                            <div className="text-green-300 text-sm">
                                🎉 All votes collected! Check results.
                            </div>
                        ) : progress.voted === 0 ? (
                            <div className="text-white/60 text-sm">
                                🗳️ Waiting for first votes...
                            </div>
                        ) : (
                            <div className="text-white/60 text-sm">
                                🔴 Live voting in progress...
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {voting_complete && (
                        <div className="pt-2">
                            <button
                                onClick={() => window.open(`/sessions/${sessionId}/results`, '_blank')}
                                className="w-full px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors duration-200"
                            >
                                🏆 View Final Results
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Debug Info (development only) */}
            {import.meta.env.DEV && (
                <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/50">
                    <div>Session: {sessionId}</div>
                    <div>Live: {isLiveConnected ? '✅' : '❌'}</div>
                    <div>Pending: {pending_voters.length}</div>
                    <div>Recent: {recent_voters.length}</div>
                    <div>Token: {authService.getAccessToken() ? '✅' : '❌'}</div>
                </div>
            )}
        </div>
    );
};

export default VoterStatusPanel;