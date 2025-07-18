// src/front/components/QuickVote.jsx - ULTIMATE Enhanced with Live Components + Event Broadcasting
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../store/authService';
import GameImage from './GameImage';
import VoterStatusPanel from './VoterStatusPanel';
import VotingReminders from './VotingReminders';
import LiveMemberStatus from './LiveMemberStatus';

const QuickVote = ({ groupId }) => {
    const navigate = useNavigate();
    
    // Core voting state
    const [votableGames, setVotableGames] = useState([]);
    const [selectedGames, setSelectedGames] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [error, setError] = useState(null);
    
    // Enhanced live voting state
    const [groupMembers, setGroupMembers] = useState([]);
    const [liveVotingData, setLiveVotingData] = useState({
        totalVoters: 0,
        totalMembers: 0,
        votingComplete: false,
        results: [],
        pendingVoterIds: []
    });
    
    // User and permissions state
    const [currentUser, setCurrentUser] = useState(null);
    const [isGroupCreator, setIsGroupCreator] = useState(false);
    
    // Enhanced retry and connection state
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);
    const [connectionState, setConnectionState] = useState({
        isLiveConnected: false,
        reconnectAttempts: 0,
        lastHeartbeat: null
    });
    
    // Live features state
    const [showLiveStatus, setShowLiveStatus] = useState(false);
    const [liveEvents, setLiveEvents] = useState([]);
    const [enableEventBroadcasting, setEnableEventBroadcasting] = useState(true);
    
    // Real-time connection refs
    const eventSourceRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // Initialize component
    useEffect(() => {
        initializeVotingSession();
        return cleanup;
    }, [groupId]);

    // Heartbeat for connection monitoring
    useEffect(() => {
        if (connectionState.isLiveConnected) {
            startHeartbeat();
        } else {
            stopHeartbeat();
        }
        
        return stopHeartbeat;
    }, [connectionState.isLiveConnected]);

    const initializeVotingSession = async () => {
        try {
            setLoading(true);
            
            // Get current user
            const user = authService.getCurrentUser();
            setCurrentUser(user);
            
            // Initialize all data concurrently
            await Promise.all([
                fetchGroupData(),
                checkExistingSession()
            ]);
            
        } catch (error) {
            console.error('❌ Failed to initialize voting session:', error);
            setError('Failed to initialize voting session');
        } finally {
            setLoading(false);
        }
    };

    const fetchGroupData = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${groupId}`);
            
            if (response.ok) {
                const data = await response.json();
                setGroupMembers(data.group.members || []);
                
                const user = authService.getCurrentUser();
                setIsGroupCreator(data.group.creator?.id === user?.id);
                
                console.log('📊 Group data loaded:', {
                    members: data.group.members?.length,
                    isCreator: data.group.creator?.id === user?.id
                });
            }
        } catch (error) {
            console.error('❌ Failed to fetch group data:', error);
        }
    };

    const checkExistingSession = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${groupId}/active-session`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.session) {
                    setSessionId(data.session.id);
                    setSessionStarted(true);
                    setVotableGames(data.votable_games || []);
                    setShowLiveStatus(true);
                    
                    // Check user vote status and setup connections
                    await Promise.all([
                        checkUserVoteStatus(data.session.id),
                        setupLiveConnections(data.session.id)
                    ]);
                    
                    toast.info('📡 Joined active voting session!');
                } else {
                    console.log('🔍 No existing voting session found');
                }
            }
        } catch (error) {
            console.error('❌ Error checking existing session:', error);
            setError('Failed to check for existing voting session');
        }
    };

    const checkUserVoteStatus = async (sessionId) => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/sessions/${sessionId}/results`);
            
            if (response.ok) {
                const data = await response.json();
                const voteResults = data.session?.vote_results || '{}';
                
                try {
                    const results = JSON.parse(voteResults);
                    const currentUserId = authService.getCurrentUser()?.id;
                    
                    if (results.voters && currentUserId && results.voters[currentUserId.toString()]) {
                        setSubmitted(true);
                        
                        // Restore user's previous votes
                        const userVotes = results.voters[currentUserId.toString()].votes || [];
                        const gameIds = userVotes.map(vote => parseInt(vote.game_id));
                        setSelectedGames(gameIds);
                        
                        toast.info('✅ You have already voted in this session');
                    }
                } catch (parseError) {
                    console.error('❌ Error parsing vote results:', parseError);
                }
            }
        } catch (error) {
            console.error('❌ Error checking vote status:', error);
        }
    };

    const setupLiveConnections = async (sessionId) => {
        // Setup main live voting connection
        setupLiveVotingConnection(sessionId);
        
        // Setup event broadcasting if enabled
        if (enableEventBroadcasting) {
            setupEventListener(sessionId);
        }
    };

    const setupLiveVotingConnection = (sessionId) => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = authService.getAccessToken();
            
            if (!token) {
                console.warn('No auth token for live connection');
                return;
            }

            // Use token-based SSE for better auth
            const sseUrl = `${backendUrl}/api/gaming/sessions/${sessionId}/live-results?token=${encodeURIComponent(token)}`;
            
            console.log('🔌 Setting up enhanced live voting connection...');
            
            const eventSource = new EventSource(sseUrl);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('✅ Live voting connection established');
                setConnectionState(prev => ({
                    ...prev,
                    isLiveConnected: true,
                    reconnectAttempts: 0,
                    lastHeartbeat: new Date().toISOString()
                }));
                setError(null);
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 Live voting update:', data);
                    
                    // Handle heartbeat
                    if (data.heartbeat) {
                        setConnectionState(prev => ({
                            ...prev,
                            lastHeartbeat: new Date().toISOString()
                        }));
                        return;
                    }
                    
                    if (data.error) {
                        console.error('❌ SSE Error:', data.error);
                        setError(data.error);
                        return;
                    }

                    // Update live voting data with enhanced tracking
                    updateLiveVotingData(data);

                } catch (parseError) {
                    console.error('❌ Error parsing live voting data:', parseError);
                }
            };

            eventSource.onerror = (error) => {
                console.error('❌ Live voting connection error:', error);
                setConnectionState(prev => ({
                    ...prev,
                    isLiveConnected: false,
                    reconnectAttempts: prev.reconnectAttempts + 1
                }));
                
                eventSource.close();
                
                // Attempt reconnection with exponential backoff
                const maxReconnectAttempts = 5;
                if (connectionState.reconnectAttempts < maxReconnectAttempts) {
                    const delay = Math.pow(2, connectionState.reconnectAttempts) * 2000;
                    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${connectionState.reconnectAttempts + 1}/${maxReconnectAttempts})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        setupLiveVotingConnection(sessionId);
                    }, delay);
                } else {
                    console.log('❌ Max reconnection attempts reached');
                    toast.error('Lost connection to live updates', { duration: 5000 });
                }
            };

        } catch (error) {
            console.error('❌ Failed to setup live voting connection:', error);
            setConnectionState(prev => ({ ...prev, isLiveConnected: false }));
        }
    };

    const setupEventListener = (sessionId) => {
        // This would setup additional event listening for broadcasting
        // Implementation depends on your event system architecture
        console.log('🎯 Setting up event broadcasting for session:', sessionId);
    };

    const updateLiveVotingData = useCallback((data) => {
        setLiveVotingData(prevData => {
            const newData = {
                totalVoters: data.total_voters || 0,
                totalMembers: data.total_members || 0,
                votingComplete: data.voting_complete || false,
                results: data.results || [],
                pendingVoterIds: data.pending_voter_ids || []
            };

            // Show notifications for new votes
            if (prevData.totalVoters > 0 && newData.totalVoters > prevData.totalVoters) {
                const newVotes = newData.totalVoters - prevData.totalVoters;
                toast.success(
                    `🗳️ ${newVotes} new vote${newVotes !== 1 ? 's' : ''}! (${newData.totalVoters}/${newData.totalMembers})`,
                    { duration: 3000 }
                );
            }

            // Check for voting completion
            if (!prevData.votingComplete && newData.votingComplete) {
                handleVotingComplete();
            }

            return newData;
        });
    }, []);

    const handleVotingComplete = () => {
        toast.success('🏁 All members have voted! Checking results...', { duration: 5000 });
        
        // Broadcast completion event
        if (enableEventBroadcasting && sessionId) {
            broadcastEvent(sessionId, 'voting_completed', {
                final_voter_count: liveVotingData.totalVoters,
                completion_time: new Date().toISOString()
            });
        }
        
        // Auto-redirect with delay
        setTimeout(() => {
            navigate(`/sessions/${sessionId}/results`);
        }, 3000);
    };

    const startHeartbeat = () => {
        if (heartbeatIntervalRef.current) return;
        
        heartbeatIntervalRef.current = setInterval(() => {
            const lastHeartbeat = new Date(connectionState.lastHeartbeat || 0);
            const now = new Date();
            const timeSinceHeartbeat = now - lastHeartbeat;
            
            // If no heartbeat for more than 30 seconds, consider connection lost
            if (timeSinceHeartbeat > 30000) {
                console.warn('⚠️ Heartbeat timeout, connection may be lost');
                setConnectionState(prev => ({ ...prev, isLiveConnected: false }));
            }
        }, 10000); // Check every 10 seconds
    };

    const stopHeartbeat = () => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    };

    const startVotingSession = async () => {
        if (sessionStarted && sessionId) {
            toast.info('Voting session already active!');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${groupId}/start-vote`, {
                method: 'POST',
                body: JSON.stringify({
                    session_name: `Live Vote Session - ${new Date().toLocaleString()}`,
                    description: '🔴 Enhanced live voting! Real-time updates, smart reminders, and instant results.'
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('🎬 Enhanced live voting session started:', data);
                
                setSessionId(data.session.id);
                setVotableGames(data.common_games || []);
                setSessionStarted(true);
                setShowLiveStatus(true);
                
                // Setup all live connections
                await setupLiveConnections(data.session.id);
                
                // Broadcast session start event
                if (enableEventBroadcasting) {
                    await broadcastEvent(data.session.id, 'session_started', {
                        session_name: data.session.session_name,
                        game_count: data.common_games?.length || 0,
                        member_count: groupMembers.length,
                        features: ['live_updates', 'smart_reminders', 'event_broadcasting']
                    });
                }
                
                toast.success('🎬 Enhanced live voting started! Select up to 3 games and watch real-time updates.');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to start voting session');
                toast.error(errorData.error || 'Failed to start voting session.');
            }
        } catch (error) {
            console.error('❌ Error starting enhanced live vote:', error);
            setError('Network error occurred while starting voting session');
            toast.error('A network error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const toggleGameSelection = (gameId) => {
        setSelectedGames(prev => {
            if (prev.includes(gameId)) {
                return prev.filter(id => id !== gameId);
            } else if (prev.length < 3) {
                return [...prev, gameId];
            } else {
                toast.error('You can only select up to 3 games.');
                return prev;
            }
        });
    };

    const submitVotesWithRetry = async (maxRetries = 3) => {
        if (selectedGames.length === 0) {
            toast.error('Please select at least one game.');
            return;
        }

        if (!sessionId) {
            toast.error('No active voting session.');
            return;
        }

        const votesSummary = selectedGames.map((gameId, index) => {
            const game = votableGames.find(g => g.id === gameId);
            return `${index + 1}. ${game?.name || 'Unknown'} (${selectedGames.length - index} pts)`;
        });
        
        console.log('🗳️ Submitting enhanced votes:', votesSummary.join(', '));

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                setLoading(true);
                setIsRetrying(attempt > 1);
                setRetryCount(attempt);
                setError(null);
                
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                
                const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/sessions/${sessionId}/vote`, {
                    method: 'POST',
                    body: JSON.stringify({ 
                        game_votes: selectedGames.map((gameId, index) => ({
                            game_id: gameId,
                            priority: selectedGames.length - index // 3, 2, 1 for 1st, 2nd, 3rd
                        }))
                    })
                });

                const data = await response.json();
                
                if (response.ok && data.success) {
                    setSubmitted(true);
                    setIsRetrying(false);
                    
                    // Enhanced success broadcasting
                    if (enableEventBroadcasting) {
                        await broadcastEvent(sessionId, 'vote_cast', {
                            voter_id: currentUser?.id,
                            voter_name: currentUser?.username,
                            vote_count: selectedGames.length,
                            games: selectedGames.map((gameId, index) => {
                                const game = votableGames.find(g => g.id === gameId);
                                return {
                                    game_id: gameId,
                                    game_name: game?.name || 'Unknown',
                                    priority: selectedGames.length - index,
                                    points: selectedGames.length - index
                                };
                            }),
                            timestamp: new Date().toISOString()
                        });
                    }
                    
                    // Enhanced success feedback
                    toast.success('🎉 Votes submitted! Watch live results update.', { duration: 4000 });
                    
                    setTimeout(() => {
                        const summaryText = votesSummary.slice(0, 2).join(', ') + 
                                          (votesSummary.length > 2 ? `, +${votesSummary.length - 2} more` : '');
                        toast.success(`Your votes: ${summaryText}`, { duration: 4000 });
                    }, 500);
                    
                    return; // Success - exit retry loop
                    
                } else {
                    const errorMessage = data.error || 'Vote submission failed';
                    
                    // Check for non-retryable errors
                    if (errorMessage.includes('already voted') || 
                        errorMessage.includes('not active') ||
                        errorMessage.includes('not a member')) {
                        throw new Error(`${errorMessage} (No retry needed)`);
                    }
                    
                    throw new Error(errorMessage);
                }
                
            } catch (error) {
                console.error(`Enhanced vote submission attempt ${attempt} failed:`, error);
                
                // Handle non-retryable errors
                if (error.message.includes('No retry needed')) {
                    setError(error.message.replace(' (No retry needed)', ''));
                    toast.error(error.message.replace(' (No retry needed)', ''));
                    setLoading(false);
                    setIsRetrying(false);
                    return;
                }
                
                if (attempt === maxRetries) {
                    // Final attempt failed
                    setError(`Failed to submit votes after ${maxRetries} attempts: ${error.message}`);
                    toast.error(`❌ Failed after ${maxRetries} attempts: ${error.message}`, { duration: 5000 });
                    setLoading(false);
                    setIsRetrying(false);
                    return;
                } else {
                    // Retry with exponential backoff
                    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                    const isNetworkError = error.message.includes('Network') || error.message.includes('fetch');
                    
                    toast.error(
                        `⚠️ ${isNetworkError ? 'Network error' : 'Vote failed'}, retrying in ${delay/1000}s... (${attempt}/${maxRetries})`,
                        { duration: delay - 200 }
                    );
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        setLoading(false);
        setIsRetrying(false);
    };

    // Enhanced event broadcasting
    const broadcastEvent = async (sessionId, eventType, eventData = {}) => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            await authService.authenticatedFetch(`${backendUrl}/api/live-events/sessions/${sessionId}/broadcast`, {
                method: 'POST',
                body: JSON.stringify({
                    type: eventType,
                    data: {
                        ...eventData,
                        sender_id: currentUser?.id,
                        sender_name: currentUser?.username,
                        timestamp: new Date().toISOString(),
                        session_id: sessionId
                    }
                })
            });
            console.log(`📡 Broadcasted ${eventType} event for session ${sessionId}`);
            
            // Add to local events for debugging
            setLiveEvents(prev => [...prev.slice(-9), {
                id: Date.now(),
                type: eventType,
                data: eventData,
                timestamp: new Date().toISOString()
            }]);
            
        } catch (error) {
            console.error('Failed to broadcast event:', error);
            // Don't fail the main operation if broadcasting fails
        }
    };

    // Enhanced callback handlers
    const handleLiveVoterUpdate = useCallback((data) => {
        console.log('👥 Enhanced voter status updated:', data);
        
        // Update pending voters if we have the data
        if (data.pending_voter_ids) {
            setLiveVotingData(prev => ({
                ...prev,
                pendingVoterIds: data.pending_voter_ids
            }));
        }
    }, []);

    const handleReminderSent = useCallback((reminder) => {
        console.log('📢 Enhanced reminder sent:', reminder);
        
        // Broadcast reminder event
        if (enableEventBroadcasting && sessionId) {
            broadcastEvent(sessionId, 'reminder_sent', {
                reminder_type: reminder.type,
                target_count: reminder.targetUsers.length,
                message: reminder.message
            });
        }
        
        toast.success(`📢 Reminder sent to ${reminder.targetUsers.length} member${reminder.targetUsers.length !== 1 ? 's' : ''}`);
    }, [sessionId, enableEventBroadcasting]);

    const handleAllVoted = useCallback(() => {
        console.log('🎉 All members have voted!');
        handleVotingComplete();
    }, []);

    const cleanup = () => {
        if (eventSourceRef.current) {
            console.log('🔌 Closing enhanced live connections...');
            eventSourceRef.current.close();
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        stopHeartbeat();
    };

    // Show error state
    if (error && !sessionStarted) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
                    <p className="text-white/70 mb-6">{error}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => {
                                setError(null);
                                initializeVotingSession();
                            }}
                            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // If no session started yet, show enhanced start interface
    if (!sessionStarted && !loading) {
        return (
            <div className="space-y-6">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">🚀 Ready for Enhanced Live Voting?</h2>
                    <p className="text-white/70 mb-6">
                        Start an advanced live voting session with real-time updates, smart reminders, and instant results!
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/5 rounded-xl p-4">
                            <div className="text-2xl mb-2">⚡</div>
                            <div className="text-white font-medium text-sm">Real-time Updates</div>
                            <div className="text-white/60 text-xs">See votes instantly</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <div className="text-2xl mb-2">👥</div>
                            <div className="text-white font-medium text-sm">Live Status</div>
                            <div className="text-white/60 text-xs">Track all members</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <div className="text-2xl mb-2">📢</div>
                            <div className="text-white font-medium text-sm">Smart Reminders</div>
                            <div className="text-white/60 text-xs">Auto notifications</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <div className="text-2xl mb-2">🎯</div>
                            <div className="text-white font-medium text-sm">Event Broadcasting</div>
                            <div className="text-white/60 text-xs">Live notifications</div>
                        </div>
                    </div>
                    
                    <button
                        onClick={startVotingSession}
                        disabled={loading}
                        className="px-8 py-4 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                Starting Enhanced Session...
                            </div>
                        ) : (
                            '🚀 Start Enhanced Live Voting'
                        )}
                    </button>
                </div>
                
                {/* Enhanced group member preview */}
                {groupMembers.length > 0 && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center">
                            <span className="text-xl mr-2">👥</span>
                            Squad Members ({groupMembers.length})
                            {isGroupCreator && <span className="ml-2 text-xs bg-coral-500/20 text-coral-300 px-2 py-1 rounded">Creator</span>}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {groupMembers.map(member => (
                                <div key={member.id} className="flex items-center space-x-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                                    <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        {member.username?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white/80 text-sm truncate">{member.username}</div>
                                        <div className="flex items-center space-x-1 text-xs">
                                            {member.steam_connected && <span className="text-green-400">🎮</span>}
                                            {member.id === currentUser?.id && <span className="text-blue-400">👤</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Show enhanced success message after submission
    if (submitted) {
        return (
            <div className="space-y-6">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Votes Submitted Successfully!</h2>
                    <p className="text-white/70 mb-2">Thank you for voting! Watch the enhanced live results below.</p>
                    
                    {/* Enhanced vote summary */}
                    <div className="mb-6 p-4 bg-white/5 rounded-xl">
                        <p className="text-white/60 text-sm mb-3">Your votes:</p>
                        {selectedGames.map((gameId, index) => {
                            const game = votableGames.find(g => g.id === gameId);
                            return (
                                <div key={gameId} className="flex items-center justify-between text-white/80 text-sm py-1">
                                    <span>{index + 1}. {game?.name || 'Unknown'}</span>
                                    <span className="text-coral-400 font-bold">{selectedGames.length - index} pts</span>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-6 text-sm">
                            <div className={`flex items-center space-x-2 ${connectionState.isLiveConnected ? 'text-green-400' : 'text-red-400'}`}>
                                <div className={`w-2 h-2 rounded-full ${connectionState.isLiveConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                                <span>{connectionState.isLiveConnected ? 'Live Updates Active' : 'Reconnecting...'}</span>
                            </div>
                            <div className="text-white/60">
                                {liveVotingData.totalVoters}/{liveVotingData.totalMembers} voted
                            </div>
                            {enableEventBroadcasting && (
                                <div className="text-blue-400">
                                    <span>📡 Broadcasting</span>
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => navigate(`/sessions/${sessionId}/results`)}
                            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                        >
                            🏆 View Enhanced Live Results
                        </button>
                    </div>
                </div>

                {/* Enhanced Live Status Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Enhanced Voter Status Panel */}
                    <VoterStatusPanel 
                        sessionId={sessionId}
                        groupMembers={groupMembers}
                        onVoterUpdate={handleLiveVoterUpdate}
                        showDetailedView={true}
                    />
                    
                    {/* Show different panels based on user role */}
                    {isGroupCreator ? (
                        <VotingReminders 
                            sessionId={sessionId}
                            groupMembers={groupMembers}
                            currentUserId={currentUser?.id}
                            isCreator={isGroupCreator}
                            votingComplete={liveVotingData.votingComplete}
                            pendingVoterIds={liveVotingData.pendingVoterIds}
                            onSendReminder={handleReminderSent}
                        />
                    ) : (
                        <LiveMemberStatus 
                            sessionId={sessionId} 
                            groupId={groupId}
                            onAllVoted={handleAllVoted}
                        />
                    )}
                </div>

                {/* Event Broadcasting Debug Panel (development only) */}
                {import.meta.env.DEV && enableEventBroadcasting && liveEvents.length > 0 && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                        <h4 className="text-white font-semibold mb-3">📡 Live Events (Debug)</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto text-xs">
                            {liveEvents.slice(-5).reverse().map(event => (
                                <div key={event.id} className="bg-white/5 p-2 rounded text-white/70">
                                    <div className="flex justify-between">
                                        <span className="font-mono">{event.type}</span>
                                        <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Show enhanced loading state
    if (loading) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/70">
                    {isRetrying ? `Retrying enhanced vote submission... (attempt ${retryCount})` : 'Loading enhanced live voting session...'}
                </p>
                {isRetrying && (
                    <p className="text-white/50 text-sm mt-2">
                        Enhanced retry system active - we'll keep trying...
                    </p>
                )}
            </div>
        );
    }

    // Main enhanced live voting interface
    return (
        <div className="space-y-6">
            {/* Enhanced Live Status Panels - Always show when session is active */}
            {showLiveStatus && sessionId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <VoterStatusPanel 
                        sessionId={sessionId}
                        groupMembers={groupMembers}
                        onVoterUpdate={handleLiveVoterUpdate}
                        showDetailedView={true}
                    />
                    
                    {isGroupCreator ? (
                        <VotingReminders 
                            sessionId={sessionId}
                            groupMembers={groupMembers}
                            currentUserId={currentUser?.id}
                            isCreator={isGroupCreator}
                            votingComplete={liveVotingData.votingComplete}
                            pendingVoterIds={liveVotingData.pendingVoterIds}
                            onSendReminder={handleReminderSent}
                        />
                    ) : (
                        <LiveMemberStatus 
                            sessionId={sessionId} 
                            groupId={groupId}
                            onAllVoted={handleAllVoted}
                        />
                    )}
                </div>
            )}

            {/* Enhanced Main Voting Panel */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-white">🚀 Enhanced Live Voting</h2>
                        <div className="flex items-center space-x-3">
                            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
                                connectionState.isLiveConnected 
                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                                <div className={`w-2 h-2 rounded-full ${connectionState.isLiveConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                                <span>{connectionState.isLiveConnected ? 'Live' : 'Offline'}</span>
                            </div>
                            <div className="text-white/60 text-sm">
                                {liveVotingData.totalVoters}/{liveVotingData.totalMembers} voted
                            </div>
                            {enableEventBroadcasting && (
                                <div className="text-blue-400 text-xs">📡</div>
                            )}
                        </div>
                    </div>
                    
                    <p className="text-white/70">
                        Select up to 3 games you'd like to play ({selectedGames.length}/3 selected)
                    </p>
                    <p className="text-white/60 text-sm mt-1">
                        Your 1st choice gets 3 points, 2nd gets 2 points, 3rd gets 1 point
                    </p>
                    
                    {/* Enhanced Live Progress Bar */}
                    <div className="mt-4">
                        <div className="w-full bg-white/10 rounded-full h-3">
                            <div 
                                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500 flex items-center justify-center"
                                style={{ width: `${liveVotingData.totalMembers > 0 ? (liveVotingData.totalVoters / liveVotingData.totalMembers) * 100 : 0}%` }}
                            >
                                {liveVotingData.totalMembers > 0 && (liveVotingData.totalVoters / liveVotingData.totalMembers) * 100 > 20 && (
                                    <span className="text-white text-xs font-bold">
                                        {Math.round((liveVotingData.totalVoters / liveVotingData.totalMembers) * 100)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced error banner with retry option */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => submitVotesWithRetry()}
                                    className="px-3 py-1 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-xs transition-colors"
                                >
                                    🔄 Retry
                                </button>
                                <button
                                    onClick={() => setError(null)}
                                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
                                >
                                    ✕ Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* No games available */}
                {votableGames.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-4">🎮</div>
                        <h3 className="text-xl font-bold text-white mb-2">No Common Games Found</h3>
                        <p className="text-white/70 mb-4">
                            Your squad doesn't seem to have any games in common yet.
                        </p>
                        <p className="text-white/60 text-sm">
                            Make sure everyone has connected their Steam accounts and has some multiplayer games.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={checkExistingSession}
                                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200"
                            >
                                🔄 Refresh Games
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Enhanced games grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto mb-6 custom-scrollbar">
                            {votableGames.map((game) => {
                                const isSelected = selectedGames.includes(game.id);
                                const selectionIndex = selectedGames.indexOf(game.id);
                                
                                return (
                                    <div
                                        key={game.id}
                                        onClick={() => toggleGameSelection(game.id)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                                            isSelected 
                                                ? 'bg-coral-500/20 border-coral-500 shadow-lg shadow-coral-500/25' 
                                                : 'bg-white/5 border-white/20 hover:border-white/40 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <GameImage
                                                src={game.header_image}
                                                alt={game.name}
                                                fallbackText={game.name}
                                                className="w-20 h-12 object-cover rounded flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-medium truncate">{game.name}</h3>
                                                <p className="text-white/60 text-sm">
                                                    {game.ownership_stats?.coverage_percentage || 0}% of squad owns this
                                                </p>
                                                {game.genres && game.genres.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {game.genres.slice(0, 2).map(genre => (
                                                            <span key={genre} className="px-2 py-0.5 bg-white/20 rounded text-xs text-white/80">
                                                                {genre}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <div className="flex-shrink-0">
                                                    <div className="w-8 h-8 bg-coral-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                                                        {selectionIndex + 1}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Enhanced submit section */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="text-white/60 text-sm">
                                <p>🏆 Games are ranked by preference</p>
                                <p>📊 Results update live with enhanced features</p>
                                <p>📡 Events broadcast to all members instantly</p>
                                {selectedGames.length > 0 && (
                                    <p className="text-coral-300 mt-1">
                                        ✨ Ready to submit {selectedGames.length} enhanced vote{selectedGames.length !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => submitVotesWithRetry()}
                                disabled={selectedGames.length === 0 || loading}
                                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 disabled:hover:transform-none"
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                        {isRetrying ? `Enhanced Retry... (${retryCount})` : 'Submitting...'}
                                    </div>
                                ) : (
                                    `🚀 Submit ${selectedGames.length} Enhanced Vote${selectedGames.length !== 1 ? 's' : ''}`
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Enhanced Help Text */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <h4 className="text-white font-semibold mb-4 text-center">🚀 Enhanced Live Voting Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-white/70">
                    <div className="text-center">
                        <div className="text-2xl mb-2">⚡</div>
                        <div className="font-semibold text-white mb-1">Real-time Updates</div>
                        <div>Instant vote tracking with heartbeat monitoring</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl mb-2">👥</div>
                        <div className="font-semibold text-white mb-1">Enhanced Status</div>
                        <div>Detailed member tracking with retry logic</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl mb-2">📢</div>
                        <div className="font-semibold text-white mb-1">Smart Reminders</div>
                        <div>AI-powered notification system</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl mb-2">🎯</div>
                        <div className="font-semibold text-white mb-1">Event Broadcasting</div>
                        <div>Live event notifications to all members</div>
                    </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
                    <div className="flex items-start space-x-2">
                        <span className="text-blue-400 mt-0.5">🚀</span>
                        <div>
                            <strong>Enhanced Live Voting Experience:</strong>
                            <ul className="mt-2 space-y-1">
                                <li>• Real-time vote tracking with instant member status updates</li>
                                <li>• Smart reminder system for creators with auto-notifications</li>
                                <li>• Enhanced retry system with exponential backoff for reliable voting</li>
                                <li>• Event broadcasting - all actions notify squad members instantly</li>
                                <li>• Heartbeat monitoring ensures connection reliability</li>
                                <li>• 🔥 <strong>New:</strong> Advanced error recovery and connection management</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickVote;