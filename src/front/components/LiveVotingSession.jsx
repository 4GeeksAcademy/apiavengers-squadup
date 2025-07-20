// src/front/components/LiveVotingSession.jsx - Complete Live Voting Flow with Performance Monitoring

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import authService from '../store/authService';
import { apiUrl } from '../config/environment.js';

const LiveVotingSession = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    
    // Session state
    const [sessionState, setSessionState] = useState('loading');
    const [sessionData, setSessionData] = useState(null);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    
    // Voting state
    const [selectedGames, setSelectedGames] = useState([]);
    const [isSubmittingVote, setIsSubmittingVote] = useState(false);
    const [maxChoices, setMaxChoices] = useState(3);
    
    // SSE connection
    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const maxReconnectAttempts = 5;
    
    // ADD: Performance monitoring state
    const [performanceMetrics, setPerformanceMetrics] = useState({
        connectionTime: null,
        latency: null,
        lastHeartbeat: null,
        messageCount: 0,
        reconnectCount: 0,
        lastConnected: null
    });
    
    // Connect to SSE stream
    const connectToLiveStream = useCallback(() => {
        if (!isAuthenticated || !sessionId) return;
        
        const token = authService.getAccessToken();
        if (!token) {
            setError('Authentication required');
            return;
        }
        
        try {
            const connectStart = performance.now(); // ADD: Track connection start time
            const url = `${apiUrl}/api/live-voting/sessions/${sessionId}/live-stream?token=${encodeURIComponent(token)}`;
            
            console.log('🔗 Connecting to live voting stream:', url);
            
            const eventSource = new EventSource(url);
            eventSourceRef.current = eventSource;
            
            eventSource.onopen = () => {
                const connectTime = performance.now() - connectStart; // ADD: Calculate connection time
                console.log(`✅ Live voting stream connected in ${connectTime.toFixed(2)}ms`);
                setIsConnected(true);
                setConnectionAttempts(0);
                setError(null);
                
                // ADD: Track connection performance
                setPerformanceMetrics(prev => ({
                    ...prev,
                    connectionTime: connectTime,
                    lastConnected: new Date().toISOString(),
                    reconnectCount: connectionAttempts
                }));
            };
            
            eventSource.onmessage = (event) => {
                const messageStart = performance.now(); // ADD: Track message processing start
                
                try {
                    const data = JSON.parse(event.data);
                    
                    // ADD: Track message count
                    setPerformanceMetrics(prev => ({
                        ...prev,
                        messageCount: prev.messageCount + 1
                    }));
                    
                    // ADD: Handle heartbeat performance tracking
                    if (data.type === 'heartbeat') {
                        const serverTime = data.timestamp * 1000; // Convert to milliseconds
                        const latency = Math.abs(performance.now() - serverTime);
                        setPerformanceMetrics(prev => ({
                            ...prev,
                            latency: latency,
                            lastHeartbeat: new Date().toISOString()
                        }));
                        // Don't call handleLiveEvent for heartbeats to avoid unnecessary processing
                        return;
                    }
                    
                    handleLiveEvent(data);
                    
                    // ADD: Track message processing time
                    const processTime = performance.now() - messageStart;
                    if (processTime > 50) {
                        console.log(`🐌 Slow SSE message processing: ${processTime.toFixed(2)}ms for ${data.type}`);
                    }
                    
                } catch (error) {
                    console.error('Error parsing SSE message:', error);
                }
            };

            eventSource.onerror = (error) => {
                console.error('❌ Live voting stream error:', error);
                setIsConnected(false);
                
                // ADD: Track reconnection attempts
                setPerformanceMetrics(prev => ({
                    ...prev,
                    reconnectCount: prev.reconnectCount + 1
                }));
                
                if (connectionAttempts < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
                    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${connectionAttempts + 1})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        setConnectionAttempts(prev => prev + 1);
                        connectToLiveStream();
                    }, delay);
                } else {
                    setError('Connection lost. Please refresh the page.');
                }
            };
            
        } catch (error) {
            console.error('Failed to create EventSource:', error);
            setError('Failed to connect to live session');
        }
    }, [isAuthenticated, sessionId, connectionAttempts]);
    
    // Handle live events from SSE
    const handleLiveEvent = (data) => {
        console.log('📡 Live event received:', data);
        
        switch (data.type) {
            case 'session_state':
                setSessionData(data);
                setSessionState(data.state || 'unknown');
                if (data.voting_settings) {
                    setMaxChoices(data.voting_settings.max_choices || 3);
                }
                break;
                
            case 'state_change':
                setSessionState(data.new_state);
                break;
                
            case 'voting_started':
                setSessionState('voting');
                setSessionData(prev => ({
                    ...prev,
                    state: 'voting',
                    votable_games: data.votable_games,
                    voting_settings: data.voting_settings
                }));
                if (data.voting_settings) {
                    setMaxChoices(data.voting_settings.max_choices || 3);
                }
                break;
                
            case 'vote_submitted':
                if (sessionData && sessionData.members_status) {
                    setSessionData(prev => ({
                        ...prev,
                        progress: data.progress,
                        members_status: prev.members_status.map(member =>
                            member.id === data.user_id
                                ? { ...member, has_voted: true, status: 'voted' }
                                : member
                        )
                    }));
                }
                break;
                
            case 'voting_completed':
                setSessionState('results');
                setSessionData(prev => ({
                    ...prev,
                    state: 'results',
                    results: data.final_results,
                    winner: data.winner
                }));
                break;
                
            case 'user_connected':
            case 'user_disconnected':
                // Update connection count in UI
                break;
                
            case 'error':
                setError(data.error || 'An error occurred');
                break;
                
            default:
                console.log('Unknown event type:', data.type);
        }
    };
    
    // Initialize connection
    useEffect(() => {
        if (isAuthenticated && sessionId) {
            connectToLiveStream();
        }
        
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [isAuthenticated, sessionId, connectToLiveStream]);
    
    // Start voting phase
    const startVoting = async () => {
        const startTime = performance.now(); // ADD: Track start voting time
        
        try {
            const response = await authService.authenticatedFetch(
                `/api/live-voting/sessions/${sessionId}/start-voting`,
                { method: 'POST' }
            );
            
            const responseTime = performance.now() - startTime; // ADD: Calculate response time
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start voting');
            }
            
            // ADD: Log performance
            console.log(`⚡ Voting started in ${responseTime.toFixed(2)}ms`);
            
            // ADD: Log server performance headers
            const serverResponseTime = response.headers.get('X-Response-Time');
            if (serverResponseTime) {
                console.log(`📊 Server start voting time: ${serverResponseTime}`);
            }
            
            console.log('✅ Voting started successfully');
        } catch (error) {
            const responseTime = performance.now() - startTime;
            console.error(`❌ Failed to start voting after ${responseTime.toFixed(2)}ms:`, error);
            setError(error.message);
        }
    };
    
    // Submit vote
    const submitVote = async () => {
        if (selectedGames.length === 0) {
            setError('Please select at least one game');
            return;
        }
        
        if (selectedGames.length > maxChoices) {
            setError(`Please select no more than ${maxChoices} games`);
            return;
        }
        
        setIsSubmittingVote(true);
        setError(null);
        
        const voteStart = performance.now(); // ADD: Track vote submission start
        
        try {
            // Convert selected games to vote format
            const gameVotes = selectedGames.map((game, index) => ({
                game_id: game.id,
                priority: selectedGames.length - index  // Higher priority for earlier selections
            }));
            
            const response = await authService.authenticatedFetch(
                `/api/live-voting/sessions/${sessionId}/submit-vote`,
                {
                    method: 'POST',
                    body: JSON.stringify({ game_votes: gameVotes })
                }
            );
            
            const voteTime = performance.now() - voteStart; // ADD: Calculate vote time
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit vote');
            }
            
            const result = await response.json();
            
            // ADD: Log vote performance
            console.log(`⚡ Vote submitted in ${voteTime.toFixed(2)}ms`);
            
            // ADD: Log server performance if available
            const serverResponseTime = response.headers.get('X-Response-Time');
            const serverHealth = response.headers.get('X-Server-Health');
            
            if (serverResponseTime) {
                console.log(`📊 Server processing time: ${serverResponseTime}`);
            }
            
            if (serverHealth && serverHealth !== 'healthy') {
                console.warn(`⚠️ Server health status: ${serverHealth}`);
            }
            
            // ADD: Log performance data from response
            if (result.performance) {
                console.log('📈 Vote processing performance:', result.performance);
            }
            
            console.log('✅ Vote submitted successfully:', result);
            
            // Clear selected games
            setSelectedGames([]);
            
        } catch (error) {
            const voteTime = performance.now() - voteStart; // ADD: Track failed vote time
            console.error(`❌ Vote submission failed after ${voteTime.toFixed(2)}ms:`, error);
            setError(error.message);
        } finally {
            setIsSubmittingVote(false);
        }
    };
    
    // Toggle game selection
    const toggleGameSelection = (game) => {
        setSelectedGames(prev => {
            const isSelected = prev.find(g => g.id === game.id);
            
            if (isSelected) {
                return prev.filter(g => g.id !== game.id);
            } else if (prev.length < maxChoices) {
                return [...prev, game];
            } else {
                setError(`You can only select ${maxChoices} games`);
                return prev;
            }
        });
    };
    
    // Complete voting manually
    const completeVoting = async () => {
        try {
            const response = await authService.authenticatedFetch(
                `/api/live-voting/sessions/${sessionId}/complete-voting`,
                { method: 'POST' }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to complete voting');
            }
            
            console.log('✅ Voting completed successfully');
        } catch (error) {
            console.error('❌ Failed to complete voting:', error);
            setError(error.message);
        }
    };
    
    // Render loading state
    if (sessionState === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold text-white mb-2">Loading Live Session...</h2>
                    <p className="text-white/70">
                        {isConnected ? 'Connected to live stream' : 'Connecting...'}
                    </p>
                </div>
            </div>
        );
    }
    
    // Render error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="text-red-400 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Connection Error</h2>
                    <p className="text-white/70 mb-6">{error}</p>
                    <div className="space-x-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                        >
                            Reload Page
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    // Render lobby state
    if (sessionState === 'lobby' || sessionState === 'planning') {
        return (
            <LobbyView
                sessionData={sessionData}
                user={user}
                onStartVoting={startVoting}
                isConnected={isConnected}
                performanceMetrics={performanceMetrics}
            />
        );
    }
    
    // Render voting state
    if (sessionState === 'voting') {
        return (
            <VotingView
                sessionData={sessionData}
                user={user}
                selectedGames={selectedGames}
                maxChoices={maxChoices}
                onToggleGame={toggleGameSelection}
                onSubmitVote={submitVote}
                onCompleteVoting={completeVoting}
                isSubmittingVote={isSubmittingVote}
                isConnected={isConnected}
                performanceMetrics={performanceMetrics}
            />
        );
    }
    
    // Render results state
    if (sessionState === 'results' || sessionState === 'completed') {
        return (
            <ResultsView
                sessionData={sessionData}
                user={user}
                onBackToDashboard={() => navigate('/dashboard')}
                isConnected={isConnected}
                performanceMetrics={performanceMetrics}
            />
        );
    }
    
    // Unknown state
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Unknown Session State</h2>
                <p className="text-white/70 mb-6">Session state: {sessionState}</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                    Back to Dashboard
                </button>
            </div>
            {/* ADD: Debug panel */}
            <PerformanceDebugPanel 
                performanceMetrics={performanceMetrics} 
                sessionState={sessionState} 
            />
        </div>
    );
};

// Lobby View Component
const LobbyView = ({ sessionData, user, onStartVoting, isConnected, performanceMetrics }) => {
    const canStartVoting = sessionData?.can_start_voting && 
                          sessionData?.session?.creator_id === user?.id;
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* UPDATED Header with performance metrics */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        🎮 {sessionData?.session?.session_name || 'Gaming Session'}
                    </h1>
                    <div className="flex items-center justify-center space-x-2 text-white/70 flex-wrap">
                        <span>Preparing to vote on games</span>
                        <span>•</span>
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span>{isConnected ? '🟢 Live' : '🔴 Disconnected'}</span>
                        </div>
                        {/* Performance metrics */}
                        {performanceMetrics.latency && performanceMetrics.latency < 1000 && (
                            <>
                                <span>•</span>
                                <span className="text-xs">
                                    {Math.round(performanceMetrics.latency)}ms
                                </span>
                            </>
                        )}
                        {performanceMetrics.messageCount > 0 && (
                            <>
                                <span>•</span>
                                <span className="text-xs">
                                    {performanceMetrics.messageCount} events
                                </span>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Members */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                        👥 Group Members ({sessionData?.members?.length || 0})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sessionData?.members?.map(member => (
                            <div key={member.id} className="bg-white/5 rounded-lg p-4 flex items-center space-x-3">
                                <img
                                    src={member.avatar_url || '/default-avatar.png'}
                                    alt={member.username}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div className="flex-1">
                                    <p className="text-white font-semibold">{member.username}</p>
                                    <div className="flex items-center space-x-2 text-sm">
                                        {member.steam_connected ? (
                                            <span className="text-green-400">🎮 Steam Connected</span>
                                        ) : (
                                            <span className="text-red-400">❌ Steam Not Connected</span>
                                        )}
                                        <span className="text-white/60">
                                            {member.total_games} games
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Common Games Preview */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                        🎯 Common Multiplayer Games ({sessionData?.total_common_games || 0})
                    </h2>
                    {sessionData?.common_games?.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {sessionData.common_games.slice(0, 12).map(game => (
                                <div key={game.id} className="bg-white/5 rounded-lg p-3 text-center">
                                    <img
                                        src={game.header_image || '/game-placeholder.jpg'}
                                        alt={game.name}
                                        className="w-full h-20 object-cover rounded mb-2"
                                    />
                                    <p className="text-white text-sm font-medium truncate">
                                        {game.name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-white/70 text-lg mb-4">
                                No common multiplayer games found
                            </p>
                            <p className="text-white/50">
                                Make sure group members have connected Steam accounts with public profiles
                            </p>
                        </div>
                    )}
                </div>
                
                {/* Action Buttons */}
                <div className="text-center">
                    {canStartVoting ? (
                        <button
                            onClick={onStartVoting}
                            disabled={!sessionData?.can_start_voting}
                            className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-xl font-bold text-lg transition-colors"
                        >
                            🚀 Start Voting
                        </button>
                    ) : (
                        <div className="text-white/70">
                            Waiting for session creator to start voting...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Voting View Component
const VotingView = ({ sessionData, user, selectedGames, maxChoices, onToggleGame, onSubmitVote, onCompleteVoting, isSubmittingVote, isConnected, performanceMetrics }) => {
    const userHasVoted = sessionData?.user_has_voted;
    const canCompleteVoting = sessionData?.session?.creator_id === user?.id;
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* UPDATED Header with performance metrics */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        🗳️ Vote for Your Favorite Games
                    </h1>
                    <div className="flex items-center justify-center space-x-2 text-white/70 flex-wrap">
                        <span>Select up to {maxChoices} games</span>
                        <span>•</span>
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span>{isConnected ? '🟢 Live' : '🔴 Disconnected'}</span>
                        </div>
                        {/* Performance metrics */}
                        {performanceMetrics.latency && performanceMetrics.latency < 1000 && (
                            <>
                                <span>•</span>
                                <span className="text-xs">
                                    {Math.round(performanceMetrics.latency)}ms
                                </span>
                            </>
                        )}
                        {performanceMetrics.reconnectCount > 0 && (
                            <>
                                <span>•</span>
                                <span className="text-xs text-yellow-400">
                                    {performanceMetrics.reconnectCount} reconnects
                                </span>
                            </>
                        )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4 max-w-md mx-auto">
                        <div className="bg-white/20 rounded-full h-3">
                            <div
                                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${sessionData?.progress?.percentage || 0}%` }}
                            />
                        </div>
                        <p className="text-white/70 text-sm mt-2">
                            {sessionData?.progress?.voted || 0} of {sessionData?.progress?.total || 0} members voted
                        </p>
                    </div>
                </div>
                
                {/* User's Vote Status */}
                {userHasVoted && (
                    <div className="bg-green-600/20 border border-green-500 rounded-xl p-6 mb-8">
                        <h2 className="text-xl font-bold text-green-400 mb-4">✅ Your Vote Submitted</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {sessionData?.user_votes?.map((vote, index) => (
                                <div key={vote.game.id} className="bg-white/10 rounded-lg p-4 flex items-center space-x-3">
                                    <div className="text-2xl font-bold text-green-400">
                                        #{index + 1}
                                    </div>
                                    <img
                                        src={vote.game.header_image || '/game-placeholder.jpg'}
                                        alt={vote.game.name}
                                        className="w-12 h-12 object-cover rounded"
                                    />
                                    <div>
                                        <p className="text-white font-semibold">{vote.game.name}</p>
                                        <p className="text-white/60 text-sm">{vote.priority} points</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Voting Interface */}
                {!userHasVoted && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">
                            Select Your Games ({selectedGames.length}/{maxChoices})
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                            {sessionData?.votable_games?.map(game => {
                                const isSelected = selectedGames.find(g => g.id === game.id);
                                const selectionIndex = selectedGames.findIndex(g => g.id === game.id);
                                
                                return (
                                    <div
                                        key={game.id}
                                        onClick={() => onToggleGame(game)}
                                        className={`relative cursor-pointer transition-all duration-200 rounded-lg overflow-hidden ${
                                            isSelected 
                                                ? 'ring-4 ring-blue-500 scale-105' 
                                                : 'hover:scale-102 hover:ring-2 hover:ring-blue-300'
                                        }`}
                                    >
                                        <img
                                            src={game.header_image || '/game-placeholder.jpg'}
                                            alt={game.name}
                                            className="w-full h-32 object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <div className="absolute bottom-2 left-2 right-2">
                                            <p className="text-white font-semibold text-sm truncate">
                                                {game.name}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                                                {selectionIndex + 1}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="text-center">
                            <button
                                onClick={onSubmitVote}
                                disabled={selectedGames.length === 0 || isSubmittingVote}
                                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-xl font-bold text-lg transition-colors"
                            >
                                {isSubmittingVote ? (
                                    <>
                                        <span className="animate-spin mr-2">⏳</span>
                                        Submitting Vote...
                                    </>
                                ) : (
                                    `🗳️ Submit Vote (${selectedGames.length} games)`
                                )}
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Member Status */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-4">👥 Voting Status</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {sessionData?.members_status?.map(member => (
                            <div key={member.id} className="bg-white/5 rounded-lg p-4 text-center">
                                <img
                                    src={member.avatar_url || '/default-avatar.png'}
                                    alt={member.username}
                                    className="w-12 h-12 rounded-full mx-auto mb-2"
                                />
                                <p className="text-white font-semibold text-sm">{member.username}</p>
                                <div className="mt-2">
                                    {member.has_voted ? (
                                        <span className="text-green-400 text-xs">✅ Voted</span>
                                    ) : (
                                        <span className="text-yellow-400 text-xs">⏳ Voting...</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Admin Controls */}
                {canCompleteVoting && (
                    <div className="text-center">
                        <button
                            onClick={onCompleteVoting}
                            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold"
                        >
                            🏁 Complete Voting Early
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Results View Component
const ResultsView = ({ sessionData, user, onBackToDashboard, isConnected, performanceMetrics }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* UPDATED Header with performance metrics */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        🏆 Voting Results
                    </h1>
                    <div className="flex items-center justify-center space-x-2 text-white/70 flex-wrap">
                        <span>The votes are in!</span>
                        <span>•</span>
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span>{isConnected ? '🟢 Live' : '🔴 Disconnected'}</span>
                        </div>
                        {/* Session completion time */}
                        {sessionData?.session_completed_at && (
                            <>
                                <span>•</span>
                                <span className="text-xs">
                                    Completed {new Date(sessionData.session_completed_at).toLocaleTimeString()}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Winner */}
                {sessionData?.winner && (
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500 rounded-xl p-8 mb-8 text-center">
                        <div className="text-6xl mb-4">🥇</div>
                        <h2 className="text-3xl font-bold text-yellow-400 mb-2">Winner!</h2>
                        <img
                            src={sessionData.winner.game.header_image || '/game-placeholder.jpg'}
                            alt={sessionData.winner.game.name}
                            className="w-64 h-32 object-cover rounded-lg mx-auto mb-4"
                        />
                        <h3 className="text-2xl font-bold text-white mb-2">
                            {sessionData.winner.game.name}
                        </h3>
                        <p className="text-white/70">
                            {sessionData.winner.total_points} points • {sessionData.winner.vote_count} votes
                        </p>
                    </div>
                )}
                
                {/* Full Results */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">📊 Complete Results</h2>
                    <div className="space-y-4">
                        {sessionData?.results?.map((result, index) => (
                            <div key={result.game.id} className="bg-white/5 rounded-lg p-4 flex items-center space-x-4">
                                <div className="text-2xl font-bold text-white">
                                    #{index + 1}
                                </div>
                                <img
                                    src={result.game.header_image || '/game-placeholder.jpg'}
                                    alt={result.game.name}
                                    className="w-16 h-16 object-cover rounded"
                                />
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">{result.game.name}</h3>
                                    <p className="text-white/60">
                                        {result.total_points} points • {result.vote_count} votes • 
                                        {result.average_score.toFixed(1)} avg
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                        {result.total_points} pts
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Statistics */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-4">📈 Session Statistics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-400">
                                {sessionData?.statistics?.total_voters || 0}
                            </div>
                            <div className="text-white/60">Voters</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-400">
                                {Math.round(sessionData?.statistics?.participation_rate || 0)}%
                            </div>
                            <div className="text-white/60">Participation</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-400">
                                {sessionData?.statistics?.total_votes_cast || 0}
                            </div>
                            <div className="text-white/60">Total Votes</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-yellow-400">
                                {sessionData?.results?.length || 0}
                            </div>
                            <div className="text-white/60">Games Voted</div>
                        </div>
                    </div>
                </div>
                
                {/* Action Buttons */}
                <div className="text-center space-x-4">
                    <button
                        onClick={onBackToDashboard}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors"
                    >
                        🏠 Back to Dashboard
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold text-lg transition-colors"
                    >
                        🖨️ Print Results
                    </button>
                </div>
            </div>
        </div>
    );
};

// ADD: Performance Debug Panel Component
const PerformanceDebugPanel = ({ performanceMetrics, sessionState, className = "" }) => {
    // Only show in development or when explicitly enabled
    const showDebug = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('debug_performance') === 'true';
    
    if (!showDebug) return null;
    
    return (
        <div className={`fixed bottom-4 right-4 bg-black/90 backdrop-blur-sm text-white p-3 rounded-lg text-xs max-w-xs border border-gray-600 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-yellow-400">🔧 Performance</h4>
                <button
                    onClick={() => localStorage.removeItem('debug_performance')}
                    className="text-gray-400 hover:text-white text-xs"
                >
                    ✕
                </button>
            </div>
            <div className="space-y-1 text-gray-300">
                <div className="flex justify-between">
                    <span>State:</span>
                    <span className="text-blue-400">{sessionState}</span>
                </div>
                {performanceMetrics.connectionTime && (
                    <div className="flex justify-between">
                        <span>Connect:</span>
                        <span>{performanceMetrics.connectionTime.toFixed(0)}ms</span>
                    </div>
                )}
                {performanceMetrics.latency && (
                    <div className="flex justify-between">
                        <span>Latency:</span>
                        <span className={performanceMetrics.latency > 500 ? 'text-red-400' : 'text-green-400'}>
                            {performanceMetrics.latency.toFixed(0)}ms
                        </span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span>Events:</span>
                    <span>{performanceMetrics.messageCount}</span>
                </div>
                {performanceMetrics.reconnectCount > 0 && (
                    <div className="flex justify-between">
                        <span>Reconnects:</span>
                        <span className="text-yellow-400">{performanceMetrics.reconnectCount}</span>
                    </div>
                )}
                {performanceMetrics.lastHeartbeat && (
                    <div className="text-xs text-gray-400 mt-1">
                        Last HB: {new Date(performanceMetrics.lastHeartbeat).toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveVotingSession;