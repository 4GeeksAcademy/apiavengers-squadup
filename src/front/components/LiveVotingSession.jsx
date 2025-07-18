// src/front/components/LiveVotingSession.jsx - PHASE 5 IMPLEMENTATION: Enhanced with SSE Manager

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../store/authService';
import toast from 'react-hot-toast';
import GameImage from './GameImage';

// 🚀 PHASE 5: Import standardized components and enhanced SSE
import { VotingLoadingState, DataLoadingState } from './LoadingState';
import { NetworkErrorState, VotingErrorState } from './ErrorState';
import SSEManager from '../services/sseManager';

const LiveVotingSession = ({ groupId, session, onSessionUpdate }) => {
    const navigate = useNavigate();
    
    // Core state
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [commonGames, setCommonGames] = useState([]);
    const [selectedGames, setSelectedGames] = useState([]);
    const [hasVoted, setHasVoted] = useState(false);
    const [myVotes, setMyVotes] = useState([]);
    const [votingComplete, setVotingComplete] = useState(false);
    
    // Live voting state
    const [liveResults, setLiveResults] = useState([]);
    const [voterStats, setVoterStats] = useState({ voted: 0, total: 0, percentage: 0 });
    
    // 🚀 PHASE 5: Enhanced connection state
    const [connectionState, setConnectionState] = useState({
        isConnected: false,
        isReconnecting: false,
        retryCount: 0,
        lastUpdate: null,
        error: null,
        connectionId: null
    });
    
    // SSE Manager ref
    const sseManagerRef = useRef(null);

    useEffect(() => {
        if (session?.id) {
            initializeSession();
            setupEnhancedLiveUpdates();
        }
        
        return cleanup;
    }, [session?.id]);

    const initializeSession = async () => {
        try {
            setLoading(true);
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            // Get session details and votable games
            const [sessionResponse, myVotesResponse, votersResponse] = await Promise.all([
                authService.authenticatedFetch(`${backendUrl}/api/gaming/sessions/${session.id}`),
                authService.authenticatedFetch(`${backendUrl}/api/gaming/sessions/${session.id}/my-votes`),
                authService.authenticatedFetch(`${backendUrl}/api/gaming/sessions/${session.id}/voters`)
            ]);

            if (sessionResponse.ok) {
                const sessionData = await sessionResponse.json();
                setCommonGames(sessionData.votable_games || []);
            }

            if (myVotesResponse.ok) {
                const votesData = await myVotesResponse.json();
                setHasVoted(votesData.has_voted);
                if (votesData.has_voted) {
                    setMyVotes(votesData.votes || []);
                    setSelectedGames(votesData.votes?.map(v => v.game_id) || []);
                }
            }

            if (votersResponse.ok) {
                const votersData = await votersResponse.json();
                setVoterStats(votersData.progress || { voted: 0, total: 0, percentage: 0 });
            }

        } catch (error) {
            console.error('❌ Error initializing session:', error);
            toast.error('Failed to load voting session');
            setConnectionState(prev => ({ ...prev, error: error.message }));
        } finally {
            setLoading(false);
        }
    };

    const setupEnhancedLiveUpdates = () => {
        if (!session?.id) return;
        
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const endpoint = `${backendUrl}/api/gaming/sessions/${session.id}/live-results`;
        
        console.log('🚀 Setting up enhanced live voting updates...');
        
        // 🚀 PHASE 5: Create SSE Manager with enhanced options
        const sseManager = new SSEManager(endpoint, {
            maxRetries: 8,
            retryDelay: 3000,
            heartbeatTimeout: 45000,
            reconnectMultiplier: 1.3,
            maxReconnectDelay: 30000
        });
        
        sseManagerRef.current = sseManager;
        
        // Connection established
        sseManager.on('connected', (data) => {
            console.log('✅ Enhanced live voting updates connected');
            setConnectionState(prev => ({
                ...prev,
                isConnected: true,
                isReconnecting: false,
                error: null,
                connectionId: data.connectionId,
                retryCount: 0
            }));
            
            toast.success('🔴 Live updates active!', { 
                duration: 2000,
                icon: '📡'
            });
        });
        
        // Connection lost
        sseManager.on('disconnected', () => {
            console.log('📡 Live voting updates disconnected');
            setConnectionState(prev => ({
                ...prev,
                isConnected: false,
                isReconnecting: false
            }));
        });
        
        // Reconnection scheduled
        sseManager.on('reconnectScheduled', (data) => {
            console.log(`🔄 Reconnecting in ${data.delay}ms (attempt ${data.retryCount})`);
            setConnectionState(prev => ({
                ...prev,
                isReconnecting: true,
                retryCount: data.retryCount
            }));
            
            if (data.retryCount <= 3) {
                toast.loading(`Reconnecting... (${data.retryCount}/${data.maxRetries})`, {
                    duration: data.delay - 500
                });
            }
        });
        
        // Data message received
        sseManager.on('message', handleEnhancedLiveUpdate);
        
        // Heartbeat received
        sseManager.on('heartbeat', (data) => {
            setConnectionState(prev => ({
                ...prev,
                lastUpdate: new Date(data.timestamp).toISOString()
            }));
        });
        
        // Connection error
        sseManager.on('error', (data) => {
            console.error('❌ Live voting connection error:', data);
            setConnectionState(prev => ({
                ...prev,
                error: 'Connection error',
                retryCount: data.retryCount
            }));
        });
        
        // Max retries reached
        sseManager.on('maxRetriesReached', (data) => {
            console.log('❌ Max reconnection attempts reached');
            setConnectionState(prev => ({
                ...prev,
                isReconnecting: false,
                error: 'Unable to maintain live connection'
            }));
            
            toast.error('Lost live connection. Results may be delayed.', {
                duration: 5000,
                icon: '⚠️'
            });
            
            // Fallback to polling
            setupPollingFallback();
        });
        
        // Authentication error
        sseManager.on('authError', () => {
            console.error('🔐 Authentication error for live updates');
            toast.error('Authentication expired. Please refresh the page.');
            setConnectionState(prev => ({
                ...prev,
                error: 'Authentication required'
            }));
        });
        
        // Server error
        sseManager.on('serverError', (data) => {
            console.error('🔥 Server error:', data.message);
            setConnectionState(prev => ({
                ...prev,
                error: `Server error: ${data.message}`
            }));
        });
        
        // Start the connection
        sseManager.connect();
    };

    const handleEnhancedLiveUpdate = useCallback((data) => {
        console.log('📡 Enhanced live voting update:', data);
        
        setConnectionState(prev => ({
            ...prev,
            lastUpdate: new Date().toISOString()
        }));
        
        // Update live results
        if (data.results) {
            setLiveResults(prevResults => {
                // Show notification for significant changes
                if (prevResults.length > 0 && data.results.length > 0) {
                    const oldLeader = prevResults[0];
                    const newLeader = data.results[0];
                    
                    if (oldLeader && newLeader && oldLeader.game.id !== newLeader.game.id) {
                        toast.success(`🏆 New leader: ${newLeader.game.name}!`, {
                            duration: 4000,
                            icon: '👑'
                        });
                    }
                }
                
                return data.results;
            });
        }
        
        // Update voter statistics
        if (data.total_voters !== undefined) {
            setVoterStats(prevStats => {
                const newStats = {
                    voted: data.total_voters,
                    total: data.total_members || prevStats.total,
                    percentage: data.total_members > 0 ? (data.total_voters / data.total_members * 100) : 0
                };
                
                // Show notification for new votes
                if (prevStats.voted > 0 && newStats.voted > prevStats.voted) {
                    const newVotes = newStats.voted - prevStats.voted;
                    toast.success(
                        `🗳️ ${newVotes} new vote${newVotes !== 1 ? 's' : ''}! (${newStats.voted}/${newStats.total})`,
                        { 
                            duration: 3000,
                            icon: '📊'
                        }
                    );
                }
                
                return newStats;
            });
        }
        
        // Handle voting completion
        if (data.voting_complete && !votingComplete) {
            setVotingComplete(true);
            
            toast.success('🏁 Voting complete! Final results ready.', { 
                duration: 5000,
                icon: '🎉'
            });
            
            // Show winner if available
            if (data.winner) {
                setTimeout(() => {
                    toast.success(`🏆 Winner: ${data.winner.game.name}!`, {
                        duration: 6000,
                        icon: '👑'
                    });
                }, 1000);
            }
            
            // Notify parent component
            if (onSessionUpdate) {
                onSessionUpdate();
            }
            
            // Disconnect SSE since voting is complete
            setTimeout(() => {
                cleanup();
            }, 10000); // Keep connection for 10 more seconds for final updates
        }
        
        // Handle new voter data
        if (data.new_voter) {
            toast.success(`${data.new_voter.username} just voted!`, {
                duration: 3000,
                icon: '✅'
            });
        }
        
        // Handle voter left
        if (data.voter_left) {
            toast(`${data.voter_left.username} left the session`, {
                duration: 2000,
                icon: '👋'
            });
        }
    }, [votingComplete, onSessionUpdate]);

    const setupPollingFallback = () => {
        console.log('📊 Setting up polling fallback...');
        
        const pollInterval = setInterval(async () => {
            if (connectionState.isConnected || votingComplete) {
                clearInterval(pollInterval);
                return;
            }
            
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                const response = await authService.authenticatedFetch(
                    `${backendUrl}/api/gaming/sessions/${session.id}/results`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Update with polling data
                    if (data.results) setLiveResults(data.results);
                    if (data.total_voters !== undefined) {
                        setVoterStats({
                            voted: data.total_voters,
                            total: data.total_members || 0,
                            percentage: data.total_members > 0 ? (data.total_voters / data.total_members * 100) : 0
                        });
                    }
                    if (data.voting_complete) setVotingComplete(true);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 8000); // Poll every 8 seconds
        
        // Store interval for cleanup
        setTimeout(() => clearInterval(pollInterval), 300000); // Stop after 5 minutes
    };

    const toggleGameSelection = (gameId) => {
        if (hasVoted || submitting) return;
        
        setSelectedGames(prev => {
            if (prev.includes(gameId)) {
                return prev.filter(id => id !== gameId);
            } else if (prev.length < 3) {
                return [...prev, gameId];
            } else {
                toast.error('You can only select up to 3 games');
                return prev;
            }
        });
    };

    const submitVotes = async () => {
        if (selectedGames.length === 0) {
            toast.error('Please select at least one game');
            return;
        }

        setSubmitting(true);
        const loadingToast = toast.loading('Submitting your votes...');

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            const gameVotes = selectedGames.map((gameId, index) => ({
                game_id: gameId,
                priority: selectedGames.length - index // 3 points for 1st choice, 2 for 2nd, 1 for 3rd
            }));

            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/sessions/${session.id}/vote`,
                {
                    method: 'POST',
                    body: JSON.stringify({ game_votes: gameVotes })
                }
            );

            const data = await response.json();
            toast.dismiss(loadingToast);

            if (response.ok && data.success) {
                setHasVoted(true);
                setMyVotes(gameVotes);
                
                toast.success('🎉 Vote submitted successfully!', {
                    duration: 4000,
                    icon: '✅'
                });
                
                // Show vote summary
                setTimeout(() => {
                    const summary = selectedGames.map((gameId, index) => {
                        const game = commonGames.find(g => g.id === gameId);
                        return `${index + 1}. ${game?.name || 'Unknown'}`;
                    }).slice(0, 2).join(', ');
                    
                    toast.success(`Your votes: ${summary}${selectedGames.length > 2 ? '...' : ''}`, {
                        duration: 5000
                    });
                }, 1000);
                
                if (onSessionUpdate) {
                    onSessionUpdate();
                }
            } else {
                toast.error(data.error || 'Failed to submit vote');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Vote submission error:', error);
            toast.error('Network error submitting vote');
        } finally {
            setSubmitting(false);
        }
    };

    const forceReconnect = () => {
        if (sseManagerRef.current) {
            sseManagerRef.current.forceReconnect();
            toast.loading('Reconnecting...', { duration: 2000 });
        }
    };

    const cleanup = () => {
        if (sseManagerRef.current) {
            console.log('🧹 Cleaning up SSE Manager...');
            sseManagerRef.current.destroy();
            sseManagerRef.current = null;
        }
    };

    // Format time ago
    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffSecs = Math.floor(diffMs / 1000);
            
            if (diffSecs < 60) return 'just now';
            const diffMins = Math.floor(diffSecs / 60);
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHours = Math.floor(diffMins / 60);
            return `${diffHours}h ago`;
        } catch {
            return '';
        }
    };

    // 🚀 PHASE 5: Use standardized VotingLoadingState
    if (loading) {
        return <VotingLoadingState />;
    }

    // 🚀 PHASE 5: Handle connection errors with NetworkErrorState
    if (connectionState.error && !connectionState.isConnected && !votingComplete) {
        return <NetworkErrorState 
            error={connectionState.error}
            onRetry={forceReconnect}
            onRefresh={() => window.location.reload()}
            helpText="Live voting connection failed. You can still vote, but results may not update in real-time."
        />;
    }

    return (
        <div className="space-y-6">
            {/* Enhanced Live Status Header */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        🗳️ Enhanced Live Voting
                        <div className="ml-3 flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                connectionState.isConnected ? 'bg-green-400 animate-pulse' : 
                                connectionState.isReconnecting ? 'bg-yellow-400 animate-pulse' :
                                'bg-red-400'
                            }`}></div>
                            <span className={`text-sm font-medium ${
                                connectionState.isConnected ? 'text-green-300' :
                                connectionState.isReconnecting ? 'text-yellow-300' :
                                'text-red-300'
                            }`}>
                                {connectionState.isConnected ? 'Live' :
                                 connectionState.isReconnecting ? `Reconnecting (${connectionState.retryCount})` :
                                 'Offline'}
                            </span>
                        </div>
                    </h2>
                    
                    <div className="text-right">
                        <div className="text-2xl font-bold text-coral-400">
                            {voterStats.voted}/{voterStats.total}
                        </div>
                        <div className="text-white/60 text-sm">votes collected</div>
                        {connectionState.lastUpdate && (
                            <div className="text-white/40 text-xs mt-1">
                                Updated {formatTimeAgo(connectionState.lastUpdate)}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">{session.session_name}</h3>
                    <p className="text-white/70">{session.description}</p>
                </div>
                
                {/* Enhanced Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-3 mb-4">
                    <div 
                        className="bg-gradient-to-r from-coral-500 to-marine-500 h-3 rounded-full transition-all duration-500 flex items-center justify-center"
                        style={{ width: `${voterStats.percentage || 0}%` }}
                    >
                        {voterStats.percentage > 15 && (
                            <span className="text-white text-xs font-bold">
                                {Math.round(voterStats.percentage)}%
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Connection Status & Actions */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                        <span className="text-white/60">
                            Status: {connectionState.isConnected ? '✅ Real-time' : 
                                    connectionState.isReconnecting ? '🔄 Reconnecting...' : 
                                    '📊 Polling mode'}
                        </span>
                        
                        {connectionState.connectionId && (
                            <span className="text-white/40 text-xs font-mono">
                                {connectionState.connectionId.slice(0, 6)}
                            </span>
                        )}
                    </div>
                    
                    {connectionState.error && !connectionState.isConnected && (
                        <button
                            onClick={forceReconnect}
                            className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg transition-colors text-xs"
                        >
                            🔄 Reconnect
                        </button>
                    )}
                </div>
                
                {/* Error Display */}
                {connectionState.error && (
                    <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-300 text-sm">
                        ⚠️ {connectionState.error}
                    </div>
                )}
            </div>

            {/* Voting Interface */}
            {!hasVoted && !votingComplete ? (
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">
                        Cast Your Vote ({selectedGames.length}/3 selected)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {commonGames.map((game) => {
                            const isSelected = selectedGames.includes(game.id);
                            const selectionIndex = selectedGames.indexOf(game.id);
                            
                            return (
                                <div
                                    key={game.id}
                                    onClick={() => toggleGameSelection(game.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                                        isSelected 
                                            ? 'bg-coral-500/20 border-coral-500 shadow-lg shadow-coral-500/25' 
                                            : 'bg-white/5 border-white/20 hover:border-white/40'
                                    }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <GameImage
                                            src={game.header_image}
                                            alt={game.name}
                                            fallbackText={game.name}
                                            className="w-20 h-12 object-cover rounded"
                                        />
                                        <div className="flex-1">
                                            <h4 className="text-white font-medium">{game.name}</h4>
                                            <p className="text-white/60 text-sm">
                                                {game.short_description?.substring(0, 60) || 'No description'}...
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <div className="w-8 h-8 bg-coral-500 rounded-full flex items-center justify-center text-white font-bold">
                                                {selectionIndex + 1}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="text-white/70 text-sm">
                            <p>Select up to 3 games in order of preference</p>
                            <p>1st choice = 3 points, 2nd = 2 points, 3rd = 1 point</p>
                        </div>
                        
                        <button
                            onClick={submitVotes}
                            disabled={selectedGames.length === 0 || submitting}
                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Submitting...' : `Submit ${selectedGames.length} Vote${selectedGames.length !== 1 ? 's' : ''}`}
                        </button>
                    </div>
                </div>
            ) : (
                /* Already Voted Display */
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold text-white mb-4">
                        {votingComplete ? 'Voting Complete!' : 'Vote Submitted!'}
                    </h3>
                    <p className="text-white/70 mb-4">
                        {votingComplete 
                            ? 'All votes have been collected. Results are being calculated...'
                            : 'Thank you for voting! Watch the live progress above.'
                        }
                    </p>
                    
                    {/* Show what user voted for */}
                    {myVotes.length > 0 && (
                        <div className="mb-6 p-4 bg-white/5 rounded-lg">
                            <p className="text-white/60 text-sm mb-2">Your votes:</p>
                            {myVotes.map((vote, index) => (
                                <div key={vote.game_id || index} className="text-white/80 text-sm">
                                    {index + 1}. {vote.game?.name || commonGames.find(g => g.id === vote.game_id)?.name || 'Unknown'} ({vote.priority || (selectedGames.length - index)} points)
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={() => navigate(`/sessions/${session.id}/results`)}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
                        >
                            📊 View Results
                        </button>
                        
                        {votingComplete && (
                            <button
                                onClick={() => navigate(`/groups/${groupId}`)}
                                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors"
                            >
                                🎉 Back to Group
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Enhanced Live Results Preview */}
            {liveResults.length > 0 && (
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">🏆 Live Results Preview</h3>
                        <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs ${
                            connectionState.isConnected ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                        }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                                connectionState.isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                            }`}></div>
                            <span>Real-time</span>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        {liveResults.slice(0, 3).map((result, index) => (
                            <div key={result.game.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <span className="text-lg">
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                    </span>
                                    <span className="text-white font-medium">{result.game.name}</span>
                                    <span className="text-white/60 text-sm">({result.vote_count} votes)</span>
                                </div>
                                <span className="text-coral-400 font-bold">{result.total_points} pts</span>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-4 text-center">
                        <button
                            onClick={() => navigate(`/sessions/${session.id}/results`)}
                            className="px-4 py-2 bg-coral-500/20 text-coral-300 border border-coral-500/30 rounded-lg text-sm hover:bg-coral-500/30 transition-colors"
                        >
                            View Full Results
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveVotingSession;