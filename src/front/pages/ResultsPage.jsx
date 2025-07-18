// src/front/pages/ResultsPage.jsx - PHASE 5 IMPLEMENTATION: Enhanced with SSE Manager

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import authService from '../store/authService';
import toast from 'react-hot-toast';
import GameImage from '../components/GameImage';
import VoterStatusPanel from '../components/VoterStatusPanel';

// 🚀 PHASE 5: Import standardized components and enhanced SSE
import { PageLoadingState, DataLoadingState } from '../components/LoadingState';
import { 
    PageErrorState, 
    NetworkErrorState, 
    NotFoundErrorState,
    PermissionErrorState 
} from '../components/ErrorState';
import SSEManager from '../services/sseManager';

const ResultsPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    
    // Core state
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);
    
    // 🚀 PHASE 5: Enhanced connection state
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

    useEffect(() => {
        console.log('🏆 Enhanced ResultsPage: Component mounted for session:', sessionId);
        console.log('🏆 User:', authService.getCurrentUser()?.username);
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;

        initializeResults();
        
        return cleanup;
    }, [sessionId]);

    const initializeResults = async () => {
        await fetchResults();
        setupEnhancedLiveUpdates();
        setupPollingFallback();
    };

    const fetchResults = async (silent = false) => {
        if (!silent) setLoading(true);
        if (silent) setRefreshing(true);
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/sessions/${sessionId}/results`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Results data:', data);
                setResults(data);
                setError(null);
                
                if (data.session?.group_id) {
                    fetchGroupMembers(data.session.group_id);
                }
                
                // If voting is complete, we can stop live updates after a delay
                if (data.voting_complete) {
                    setTimeout(() => {
                        cleanup();
                        console.log('🏁 Voting complete, stopped live updates');
                    }, 30000); // Keep live for 30 seconds after completion
                }
                
            } else if (response.status === 404) {
                setError('Session not found');
                if (!silent) toast.error('Voting session not found');
            } else if (response.status === 403) {
                setError('Access denied');
                if (!silent) toast.error('Access denied');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to load results');
                if (!silent) toast.error(errorData.error || 'Failed to load results');
            }
        } catch (error) {
            console.error("❌ Error fetching results:", error);
            setError('Network error. Please check your connection.');
            if (!silent) {
                toast.error('Network error. Please try again.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const setupEnhancedLiveUpdates = () => {
        if (!sessionId) return;
        
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const endpoint = `${backendUrl}/api/gaming/sessions/${sessionId}/live-results`;
        
        console.log('🔌 Setting up enhanced live results updates...');
        
        // 🚀 PHASE 5: Create SSE Manager with enhanced options for results page
        const sseManager = new SSEManager(endpoint, {
            maxRetries: 6,
            retryDelay: 5000,
            heartbeatTimeout: 60000, // Longer timeout for results page
            reconnectMultiplier: 1.2,
            maxReconnectDelay: 45000
        });
        
        sseManagerRef.current = sseManager;
        
        // Connection established
        sseManager.on('connected', (data) => {
            console.log('✅ Enhanced results live updates connected');
            setConnectionState(prev => ({
                ...prev,
                isConnected: true,
                isReconnecting: false,
                error: null,
                retryCount: 0
            }));
            
            toast.success('🔴 Live results active!', { 
                duration: 2000,
                icon: '📊'
            });
        });
        
        // Connection lost
        sseManager.on('disconnected', () => {
            console.log('📡 Live results updates disconnected');
            setConnectionState(prev => ({
                ...prev,
                isConnected: false,
                isReconnecting: false
            }));
        });
        
        // Reconnection scheduled
        sseManager.on('reconnectScheduled', (data) => {
            console.log(`🔄 Reconnecting results in ${data.delay}ms (attempt ${data.retryCount})`);
            setConnectionState(prev => ({
                ...prev,
                isReconnecting: true,
                retryCount: data.retryCount
            }));
            
            if (data.retryCount <= 2) {
                toast.loading(`Reconnecting live results... (${data.retryCount}/${data.maxRetries})`, {
                    duration: Math.min(data.delay - 500, 5000)
                });
            }
        });
        
        // Data message received
        sseManager.on('message', handleEnhancedResultsUpdate);
        
        // Heartbeat received
        sseManager.on('heartbeat', (data) => {
            setConnectionState(prev => ({
                ...prev,
                lastUpdate: new Date(data.timestamp).toISOString()
            }));
        });
        
        // Connection error
        sseManager.on('error', (data) => {
            console.error('❌ Live results connection error:', data);
            setConnectionState(prev => ({
                ...prev,
                error: 'Connection error',
                retryCount: data.retryCount
            }));
        });
        
        // Max retries reached
        sseManager.on('maxRetriesReached', (data) => {
            console.log('❌ Max reconnection attempts reached for results');
            setConnectionState(prev => ({
                ...prev,
                isReconnecting: false,
                error: 'Live updates unavailable'
            }));
            
            toast.error('Live updates unavailable. Using manual refresh.', {
                duration: 5000,
                icon: '⚠️'
            });
        });
        
        // Authentication error
        sseManager.on('authError', () => {
            console.error('🔐 Authentication error for live results');
            toast.error('Authentication expired. Please refresh the page.');
            setConnectionState(prev => ({
                ...prev,
                error: 'Authentication required'
            }));
        });
        
        // Start the connection
        sseManager.connect();
    };

    const handleEnhancedResultsUpdate = (data) => {
        console.log('📊 Enhanced results update:', data);
        
        setConnectionState(prev => ({
            ...prev,
            lastUpdate: new Date().toISOString(),
            updateCount: prev.updateCount + 1
        }));
        
        setResults(prevResults => {
            if (!prevResults) return prevResults;
            
            const newResults = {
                ...prevResults,
                results: data.results || prevResults.results,
                total_voters: data.total_voters !== undefined ? data.total_voters : prevResults.total_voters,
                total_members: data.total_members !== undefined ? data.total_members : prevResults.total_members,
                voting_complete: data.voting_complete !== undefined ? data.voting_complete : prevResults.voting_complete
            };

            // Show notifications for significant changes
            if (prevResults.results && data.results) {
                // Check for new votes
                if (data.total_voters > (prevResults.total_voters || 0)) {
                    const newVotes = data.total_voters - (prevResults.total_voters || 0);
                    toast.success(
                        `🗳️ ${newVotes} new vote${newVotes !== 1 ? 's' : ''}! (${data.total_voters}/${data.total_members})`, 
                        { duration: 3000 }
                    );
                }
                
                // Check for leader changes
                const oldLeader = prevResults.results[0];
                const newLeader = data.results[0];
                
                if (oldLeader && newLeader && oldLeader.game.id !== newLeader.game.id) {
                    toast.success(`🏆 New leader: ${newLeader.game.name}!`, {
                        duration: 4000,
                        icon: '👑'
                    });
                }
            }

            // Handle voting completion
            if (!prevResults.voting_complete && data.voting_complete) {
                toast.success('🏁 Voting completed! Final results ready.', { 
                    duration: 5000,
                    icon: '🎉'
                });
                
                // Show winner
                if (data.winner || (data.results && data.results[0])) {
                    const winner = data.winner || data.results[0];
                    setTimeout(() => {
                        toast.success(`🏆 Winner: ${winner.game.name}!`, {
                            duration: 6000,
                            icon: '🥇'
                        });
                    }, 1500);
                }
            }

            return newResults;
        });
    };

    const setupPollingFallback = () => {
        // Clear any existing interval
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }

        // Setup polling as fallback
        const interval = setInterval(() => {
            if (connectionState.isConnected || results?.voting_complete) {
                return; // Don't poll if connected or voting is complete
            }
            
            console.log('📊 Polling fallback - fetching results');
            fetchResults(true);
        }, 10000); // Poll every 10 seconds
        
        pollIntervalRef.current = interval;
    };

    const fetchGroupMembers = async (groupId) => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${groupId}`);
            
            if (response.ok) {
                const data = await response.json();
                setGroupMembers(data.group?.members || []);
            }
        } catch (error) {
            console.error('Error fetching group members:', error);
        }
    };

    const handleBackToGroup = () => {
        if (results?.session?.group_id) {
            navigate(`/groups/${results.session.group_id}`);
        } else {
            navigate('/dashboard');
        }
    };

    const handleManualRefresh = () => {
        fetchResults();
        toast.success('Results refreshed!', { duration: 2000 });
    };

    const handleReconnectLive = () => {
        if (sseManagerRef.current) {
            sseManagerRef.current.forceReconnect();
            toast.loading('Reconnecting live updates...', { duration: 2000 });
        } else {
            setupEnhancedLiveUpdates();
        }
    };

    const cleanup = () => {
        if (sseManagerRef.current) {
            console.log('🧹 Cleaning up enhanced SSE Manager...');
            sseManagerRef.current.destroy();
            sseManagerRef.current = null;
        }
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    const getPlaceEmoji = (index) => {
        switch (index) {
            case 0: return '🥇';
            case 1: return '🥈';
            case 2: return '🥉';
            default: return `${index + 1}.`;
        }
    };

    const getPlaceColor = (index) => {
        switch (index) {
            case 0: return 'from-yellow-400 to-yellow-600';
            case 1: return 'from-gray-300 to-gray-500';
            case 2: return 'from-amber-600 to-amber-800';
            default: return 'from-slate-400 to-slate-600';
        }
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'Recently';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d ago`;
        } catch (error) {
            return 'Recently';
        }
    };

    // 🚀 PHASE 5: Use standardized PageLoadingState
    if (loading) {
        return <PageLoadingState 
            message="Loading enhanced results..." 
            subMessage="Setting up live updates..." 
        />;
    }

    // 🚀 PHASE 5: Enhanced error handling with specific error states
    if (error) {
        if (error.includes('not found') || error.includes('Session not found')) {
            return <NotFoundErrorState 
                title="Session Not Found"
                message="This voting session may have been deleted or you don't have access to it."
                onGoBack={handleBackToGroup}
                onGoHome={() => navigate('/dashboard')}
            />;
        }
        
        if (error.includes('Access denied') || error.includes('permission')) {
            return <PermissionErrorState 
                onGoBack={handleBackToGroup}
                onGoHome={() => navigate('/dashboard')}
            />;
        }
        
        // Generic network/server error
        return <PageErrorState 
            title="Unable to Load Results"
            message={error}
            onRetry={() => fetchResults()}
            onGoHome={handleBackToGroup}
        />;
    }

    if (!results || !results.results || results.results.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                                <div className="text-6xl mb-4">🗳️</div>
                                <h2 className="text-2xl font-bold text-white mb-4">No Votes Yet</h2>
                                <p className="text-white/70 mb-6">
                                    {results?.voting_complete ? 
                                        'The voting session completed but no votes were cast.' :
                                        'Waiting for squad members to submit their votes...'
                                    }
                                </p>
                                
                                {/* Enhanced connection status */}
                                <div className="mb-4 flex items-center justify-center space-x-4">
                                    <div className="text-white/60 text-sm">
                                        {results?.total_voters || 0} of {results?.total_members || 0} members have voted
                                    </div>
                                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                                        connectionState.isConnected ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                                    }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            connectionState.isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                                        }`}></div>
                                        <span>{connectionState.isConnected ? 'Live' : 'Polling'}</span>
                                    </div>
                                </div>
                                
                                {results && results.total_members > 0 && (
                                    <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                                        <div 
                                            className="bg-coral-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${(results.total_voters / results.total_members) * 100}%` }}
                                        ></div>
                                    </div>
                                )}
                                
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleBackToGroup}
                                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                                    >
                                        Back to Group
                                    </button>
                                    {!results?.voting_complete && (
                                        <button
                                            onClick={handleManualRefresh}
                                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200"
                                        >
                                            🔄 Refresh
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar with voter status */}
                        <div className="space-y-6">
                            {sessionId && (
                                <VoterStatusPanel 
                                    sessionId={sessionId}
                                    groupMembers={groupMembers}
                                    showDetailedView={true}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const { session, results: gameResults, winner, total_voters, total_members, voting_complete } = results;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-6xl mx-auto">
                
                {/* Enhanced Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <h1 className="text-4xl md:text-5xl font-bold text-white">
                            🏆 Enhanced Live Results
                        </h1>
                        {refreshing && (
                            <div className="ml-4 w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        )}
                    </div>
                    <p className="text-white/70 text-lg mb-2">{session?.session_name}</p>
                    <div className="text-white/60">
                        {total_voters} of {total_members} squad members voted
                    </div>
                    
                    <div className="mt-3 flex items-center justify-center space-x-4 flex-wrap">
                        {voting_complete ? (
                            <div className="px-4 py-2 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full text-sm">
                                ✅ Voting Complete
                            </div>
                        ) : (
                            <div className="px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-sm">
                                🔴 Live Results • Updates automatically
                            </div>
                        )}
                        
                        <div className={`px-3 py-1 rounded-full text-xs flex items-center space-x-2 ${
                            connectionState.isConnected 
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                : connectionState.isReconnecting
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${
                                connectionState.isConnected ? 'bg-green-400 animate-pulse' : 
                                connectionState.isReconnecting ? 'bg-yellow-400 animate-pulse' :
                                'bg-red-400'
                            }`}></div>
                            <span>
                                {connectionState.isConnected ? `Live (${connectionState.updateCount} updates)` : 
                                 connectionState.isReconnecting ? `Reconnecting (${connectionState.retryCount})` : 
                                 'Offline'}
                            </span>
                        </div>
                        
                        {session?.created_at && (
                            <div className="text-white/50 text-sm">
                                Started {formatTimeAgo(session.created_at)}
                            </div>
                        )}
                        
                        {connectionState.lastUpdate && (
                            <div className="text-white/40 text-xs">
                                Last update: {formatTimeAgo(connectionState.lastUpdate)}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 max-w-md mx-auto">
                        <div className="w-full bg-white/10 rounded-full h-3">
                            <div 
                                className="bg-gradient-to-r from-coral-500 to-marine-500 h-3 rounded-full transition-all duration-500 flex items-center justify-center"
                                style={{ width: `${total_members > 0 ? (total_voters / total_members) * 100 : 0}%` }}
                            >
                                {total_members > 0 && (
                                    <span className="text-white text-xs font-bold">
                                        {Math.round((total_voters / total_members) * 100)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* Main Results Column */}
                    <div className="lg:col-span-3">
                        {/* Winner Announcement */}
                        {winner && voting_complete && (
                            <div className="backdrop-blur-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-3xl p-8 mb-8 text-center">
                                <div className="text-6xl mb-4">🎉</div>
                                <h2 className="text-3xl font-bold text-white mb-2">
                                    Winner: {winner.game.name}!
                                </h2>
                                <p className="text-white/80 mb-4">
                                    {winner.total_points} points • {winner.vote_count} votes • Avg: {winner.average_score.toFixed(1)}
                                </p>
                                <GameImage 
                                    src={winner.game.header_image} 
                                    alt={winner.game.name}
                                    fallbackText={winner.game.name}
                                    className="w-full max-w-md mx-auto h-48 object-cover rounded-xl shadow-2xl"
                                />
                            </div>
                        )}

                        {/* Results List */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                            <h3 className="text-2xl font-bold text-white mb-6 flex items-center justify-between">
                                <span>All Results</span>
                                <div className="flex items-center space-x-3">
                                    {!voting_complete && (
                                        <div className="text-sm text-white/60 font-normal flex items-center">
                                            <div className={`w-2 h-2 rounded-full mr-2 ${
                                                connectionState.isConnected ? 'bg-green-400 animate-pulse' : 
                                                connectionState.isReconnecting ? 'bg-yellow-400 animate-pulse' :
                                                'bg-red-400'
                                            }`}></div>
                                            {connectionState.isConnected ? 'Live Updates' : 
                                             connectionState.isReconnecting ? 'Reconnecting' :
                                             'Manual Mode'}
                                        </div>
                                    )}
                                    
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handleManualRefresh}
                                            disabled={refreshing}
                                            className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm rounded-lg transition-colors duration-200 disabled:opacity-50"
                                            title="Manual refresh"
                                        >
                                            {refreshing ? '⏳' : '🔄'}
                                        </button>
                                        
                                        {!connectionState.isConnected && !voting_complete && (
                                            <button
                                                onClick={handleReconnectLive}
                                                className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 text-sm rounded-lg transition-colors duration-200"
                                                title="Reconnect live updates"
                                            >
                                                🔌
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </h3>
                            
                            {/* Connection error display */}
                            {connectionState.error && !connectionState.isConnected && (
                                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-300 text-sm">
                                    ⚠️ {connectionState.error}
                                    {!voting_complete && (
                                        <button
                                            onClick={handleReconnectLive}
                                            className="ml-2 px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-xs"
                                        >
                                            Reconnect
                                        </button>
                                    )}
                                </div>
                            )}
                            
                            <div className="space-y-4">
                                {gameResults.map((result, index) => {
                                    const isWinner = index === 0 && voting_complete;
                                    const isCurrentLeader = index === 0 && !voting_complete;
                                    
                                    return (
                                        <div 
                                            key={result.game.id} 
                                            className={`p-6 rounded-2xl border transition-all duration-300 ${
                                                isWinner
                                                    ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 shadow-lg shadow-yellow-500/20'
                                                    : isCurrentLeader
                                                    ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 shadow-lg shadow-blue-500/20'
                                                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className={`flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r ${getPlaceColor(index)} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                                                    {getPlaceEmoji(index)}
                                                </div>
                                                
                                                <GameImage 
                                                    src={result.game.header_image} 
                                                    alt={result.game.name}
                                                    fallbackText={result.game.name}
                                                    className="w-24 h-14 object-cover rounded-lg flex-shrink-0"
                                                />
                                                
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-white font-bold text-lg truncate flex items-center">
                                                        {result.game.name}
                                                        {isWinner && <span className="ml-2 text-yellow-400">👑</span>}
                                                        {isCurrentLeader && <span className="ml-2 text-blue-400">⭐</span>}
                                                    </h4>
                                                    <p className="text-white/60 text-sm line-clamp-2">
                                                        {result.game.short_description || 'No description available'}
                                                    </p>
                                                </div>
                                                
                                                <div className="flex-shrink-0 text-right">
                                                    <div className="text-2xl font-bold text-white mb-1">
                                                        {result.total_points} pts
                                                    </div>
                                                    <div className="text-white/60 text-sm">
                                                        {result.vote_count} vote{result.vote_count !== 1 ? 's' : ''}
                                                    </div>
                                                    <div className="text-white/50 text-xs mt-1">
                                                        Avg: {result.average_score.toFixed(1)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Sidebar */}
                    <div className="space-y-6">
                        {sessionId && (
                            <VoterStatusPanel 
                                sessionId={sessionId}
                                groupMembers={groupMembers}
                                showDetailedView={true}
                            />
                        )}
                        
                        {/* Enhanced Connection Info Panel */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                            <h4 className="text-white font-semibold mb-4 flex items-center">
                                <span className="text-xl mr-2">📡</span>
                                Connection Status
                            </h4>
                            
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-white/70">Status</span>
                                    <span className={`font-medium ${
                                        connectionState.isConnected ? 'text-green-400' :
                                        connectionState.isReconnecting ? 'text-yellow-400' :
                                        'text-red-400'
                                    }`}>
                                        {connectionState.isConnected ? '✅ Live' :
                                         connectionState.isReconnecting ? '🔄 Reconnecting' :
                                         '❌ Offline'}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-white/70">Updates</span>
                                    <span className="text-white/80 font-mono">
                                        {connectionState.updateCount}
                                    </span>
                                </div>
                                
                                {connectionState.retryCount > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/70">Retries</span>
                                        <span className="text-yellow-400 font-mono">
                                            {connectionState.retryCount}
                                        </span>
                                    </div>
                                )}
                                
                                {connectionState.lastUpdate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/70">Last Update</span>
                                        <span className="text-white/60 text-xs">
                                            {formatTimeAgo(connectionState.lastUpdate)}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {!connectionState.isConnected && !voting_complete && (
                                <button
                                    onClick={handleReconnectLive}
                                    className="w-full mt-4 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-sm transition-colors"
                                >
                                    🔌 Reconnect Live Updates
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
                    <button
                        onClick={handleBackToGroup}
                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                    >
                        ← Back to Group
                    </button>
                    
                    <Link 
                        to="/dashboard"
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200 text-center"
                    >
                        Dashboard
                    </Link>
                    
                    {!voting_complete && (
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50"
                        >
                            {refreshing ? '⏳ Refreshing...' : '🔄 Refresh Results'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResultsPage;