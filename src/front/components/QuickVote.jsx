// src/front/components/QuickVote.jsx - ENHANCED with live broadcasting, adapted to your architecture
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../store/authService';

const QuickVote = ({ groupId, onSessionCreated }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [hasActiveSession, setHasActiveSession] = useState(false);
    const [activeSession, setActiveSession] = useState(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);
    
    // 🚀 NEW: Live session monitoring
    const [liveStats, setLiveStats] = useState({
        total_voters: 0,
        total_members: 0,
        games_count: 0,
        voting_complete: false
    });
    const [isMonitoring, setIsMonitoring] = useState(false);

    useEffect(() => {
        checkForActiveSession();
    }, [groupId]);

    // 🚀 NEW: Monitor active session for live updates
    useEffect(() => {
        if (hasActiveSession && activeSession && !isMonitoring) {
            startLiveMonitoring();
        }
        
        return () => {
            if (isMonitoring) {
                setIsMonitoring(false);
            }
        };
    }, [hasActiveSession, activeSession]);

    const checkForActiveSession = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}/active-session`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.session && data.session.status === 'voting') {
                    setHasActiveSession(true);
                    setActiveSession(data.session);
                    
                    // 🚀 NEW: Set initial live stats
                    setLiveStats({
                        total_voters: data.session.vote_count || 0,
                        total_members: data.session.total_members || 0,
                        games_count: data.votable_games?.length || 0,
                        voting_complete: data.session.status === 'completed'
                    });
                } else {
                    setHasActiveSession(false);
                    setActiveSession(null);
                }
            }
        } catch (error) {
            console.error('Error checking active session:', error);
        }
    };

    // 🚀 NEW: Live monitoring using your member status API
    const startLiveMonitoring = async () => {
        if (!activeSession || isMonitoring) return;
        
        setIsMonitoring(true);
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem('squadup_access_token') || sessionStorage.getItem('squadup_access_token');
            
            const url = `${backendUrl}/api/member-status/sessions/${activeSession.id}/member-status?token=${token}`;
            
            const eventSource = new EventSource(url);
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.error) {
                        console.error('❌ Live monitoring error:', data.error);
                        return;
                    }

                    // Update live stats
                    if (data.summary) {
                        setLiveStats(prev => ({
                            ...prev,
                            total_voters: data.summary.voted_count || 0,
                            total_members: data.summary.total_members || 0,
                            voting_complete: data.summary.all_voted || false
                        }));
                        
                        // 🎉 Show notification when voting completes
                        if (data.summary.all_voted && !liveStats.voting_complete) {
                            toast.success('🎉 All members have voted! Check the results!');
                        }
                    }
                    
                } catch (error) {
                    console.error('❌ Error parsing live monitoring data:', error);
                }
            };

            eventSource.onerror = (error) => {
                console.error('❌ Live monitoring SSE error:', error);
                eventSource.close();
                setIsMonitoring(false);
                
                // Try to reconnect after delay
                setTimeout(() => {
                    if (hasActiveSession && activeSession) {
                        startLiveMonitoring();
                    }
                }, 5000);
            };
            
            // Store reference for cleanup
            window.liveMonitoringEventSource = eventSource;
            
        } catch (error) {
            console.error('❌ Failed to start live monitoring:', error);
            setIsMonitoring(false);
        }
    };

    const createVotingSession = async () => {
        if (hasActiveSession) {
            toast.error('There is already an active voting session');
            return;
        }

        setCreating(true);
        setError(null);

        const loadingToast = toast.loading('Creating voting session...');
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}/start-vote`, 
                {
                    method: 'POST',
                    body: JSON.stringify({
                        session_name: `Squad Vote - ${new Date().toLocaleDateString()}`,
                        description: 'Vote for the next game to play together!',
                        auto_complete_threshold: 0.8 // Auto-complete when 80% have voted
                    })
                }
            );

            toast.dismiss(loadingToast);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Voting session created:', data);
                
                setActiveSession(data.session);
                setHasActiveSession(true);
                
                // 🚀 NEW: Broadcast session creation event
                await broadcastEvent(data.session.id, 'session_started', {
                    session_name: data.session.session_name,
                    game_count: data.common_games?.length || 0
                });
                
                toast.success('🗳️ Voting session started! Choose your games.');
                
                // Notify parent component if callback provided
                if (onSessionCreated) {
                    onSessionCreated(data.session);
                }
                
                // Small delay to show success message
                setTimeout(() => {
                    // The LiveVotingSession component should now take over
                    window.location.reload(); // Force refresh to show LiveVotingSession
                }, 1000);
                
            } else {
                const errorData = await response.json();
                const errorMessage = errorData.error || 'Failed to create voting session';
                setError(errorMessage);
                toast.error(errorMessage);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error creating voting session:', error);
            const errorMessage = 'Network error occurred while creating session';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setCreating(false);
        }
    };

    // 🚀 NEW: Event broadcasting helper
    const broadcastEvent = async (sessionId, eventType, eventData = {}) => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            await authService.authenticatedFetch(`${backendUrl}/api/live-events/sessions/${sessionId}/broadcast`, {
                method: 'POST',
                body: JSON.stringify({
                    type: eventType,
                    data: eventData
                })
            });
            console.log(`📡 Broadcasted ${eventType} event for session ${sessionId}`);
        } catch (error) {
            console.error('Failed to broadcast event:', error);
            // Don't fail the main operation if broadcasting fails
        }
    };

    const joinActiveSession = () => {
        if (activeSession) {
            // 🚀 NEW: Broadcast user joining session
            broadcastEvent(activeSession.id, 'user_joined_session', {
                timestamp: new Date().toISOString()
            });
            
            // Refresh to show LiveVotingSession component
            window.location.reload();
        }
    };

    const viewResults = () => {
        if (activeSession) {
            navigate(`/sessions/${activeSession.id}/results`);
        }
    };

    // 🚀 NEW: Calculate voting progress percentage
    const getVotingProgress = () => {
        if (liveStats.total_members === 0) return 0;
        return Math.round((liveStats.total_voters / liveStats.total_members) * 100);
    };

    // If there's an active session, show session management instead of create button
    if (hasActiveSession && activeSession) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="text-center">
                    <div className="text-6xl mb-4">🗳️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">
                        Active Voting Session
                    </h2>
                    <p className="text-white/70 mb-2">{activeSession.session_name}</p>
                    <p className="text-white/60 text-sm mb-6">
                        Created {new Date(activeSession.created_at).toLocaleString()}
                    </p>
                    
                    {/* 🚀 ENHANCED: Live Progress Bar */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-white/70 text-sm">Voting Progress</span>
                            <span className="text-white/70 text-sm">
                                {liveStats.total_voters}/{liveStats.total_members} voted
                            </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-coral-500 to-coral-400 transition-all duration-1000 ease-out"
                                style={{ width: `${getVotingProgress()}%` }}
                            >
                                <div className="h-full bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="text-right text-white/60 text-xs mt-1">
                            {getVotingProgress()}% complete
                        </div>
                    </div>
                    
                    {/* 🚀 ENHANCED: Live Session Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="text-blue-400 font-bold text-lg flex items-center justify-center">
                                {liveStats.total_voters}
                                {isMonitoring && (
                                    <span className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                )}
                            </div>
                            <div className="text-white/60 text-sm">Votes Cast</div>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="text-green-400 font-bold text-lg">
                                {liveStats.games_count || activeSession.games_count || 0}
                            </div>
                            <div className="text-white/60 text-sm">Games Available</div>
                        </div>
                    </div>
                    
                    {/* 🚀 NEW: Voting Complete Banner */}
                    {liveStats.voting_complete && (
                        <div className="mb-6 p-4 bg-green-500/20 border border-green-400/30 rounded-xl">
                            <div className="flex items-center justify-center space-x-2 text-green-300">
                                <span className="text-2xl">🎉</span>
                                <span className="font-semibold">All members have voted!</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={joinActiveSession}
                            disabled={liveStats.voting_complete}
                            className="px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                        >
                            {liveStats.voting_complete ? '✅ Voting Complete' : '🗳️ Join Voting'}
                        </button>
                        
                        <button
                            onClick={viewResults}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200"
                        >
                            📊 View Live Results
                        </button>
                    </div>
                    
                    {/* 🚀 ENHANCED: Live Status with Connection Indicator */}
                    <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <div className="flex items-center justify-center space-x-2 text-blue-300 text-sm">
                            <span className={`animate-pulse ${isMonitoring ? 'text-green-400' : 'text-red-400'}`}>●</span>
                            <span>
                                {isMonitoring ? 'Live voting session active' : 'Connecting to live updates...'}
                            </span>
                        </div>
                        {isMonitoring && getVotingProgress() > 0 && (
                            <div className="mt-2 text-xs text-blue-400">
                                🚀 Real-time updates enabled
                            </div>
                        )}
                    </div>
                    
                    {/* Refresh Note */}
                    <p className="mt-4 text-white/50 text-xs">
                        Note: Page will refresh to show the live voting interface
                    </p>
                </div>
            </div>
        );
    }

    // Show create new session interface
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
            <div className="text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold text-white mb-4">Ready to Vote?</h2>
                <p className="text-white/70 mb-6">
                    Start a new voting session to decide what game to play with your squad!
                </p>
                
                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        <div className="flex items-center space-x-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    </div>
                )}
                
                {/* 🚀 ENHANCED: Features List with Live Voting Highlights */}
                <div className="mb-8 space-y-3 text-left max-w-md mx-auto">
                    <div className="flex items-center space-x-3 text-white/80">
                        <span className="text-coral-400">🔴</span>
                        <span className="text-sm"><strong>Real-time voting</strong> with live updates</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white/80">
                        <span className="text-coral-400">🏆</span>
                        <span className="text-sm">Ranked choice voting (1st, 2nd, 3rd)</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white/80">
                        <span className="text-coral-400">🎮</span>
                        <span className="text-sm">Only shows multiplayer games you all own</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white/80">
                        <span className="text-coral-400">⚡</span>
                        <span className="text-sm"><strong>Instant results</strong> and winner announcement</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white/80">
                        <span className="text-coral-400">👥</span>
                        <span className="text-sm"><strong>Live member status</strong> - see who voted</span>
                    </div>
                </div>
                
                {/* Create Button */}
                <button
                    onClick={createVotingSession}
                    disabled={creating || loading}
                    className="px-8 py-4 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                >
                    {creating ? (
                        <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            Creating Session...
                        </div>
                    ) : (
                        '🗳️ Start Live Voting Session'
                    )}
                </button>

                {/* 🚀 ENHANCED: Info Box with Live Features */}
                <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
                    <div className="flex items-start space-x-2">
                        <span className="text-blue-400 mt-0.5">💡</span>
                        <div className="text-left">
                            <strong>How live voting works:</strong>
                            <ol className="mt-2 space-y-1 text-xs">
                                <li>1. We'll find games everyone in your squad owns</li>
                                <li>2. Each member votes for their top 3 choices</li>
                                <li>3. <strong>See live updates</strong> as votes come in</li>
                                <li>4. <strong>Real-time notifications</strong> when members vote</li>
                                <li>5. The game with the most points wins!</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Requirements Check */}
                <div className="mt-6 text-xs text-white/50">
                    <p>💡 Make sure squad members have connected Steam for best results</p>
                    <p className="mt-1">🔴 Live features require modern browser with SSE support</p>
                </div>
            </div>
        </div>
    );
};

export default QuickVote;