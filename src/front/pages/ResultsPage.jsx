// src/front/pages/ResultsPage.jsx - ENHANCED WITH REAL-TIME UPDATES
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import authService from '../store/authService';
import toast from 'react-hot-toast';
import GameImage from '../components/GameImage';

const ResultsPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    
    // 🚀 NEW: Real-time connection state
    const [isLiveConnected, setIsLiveConnected] = useState(false);
    const [liveUpdateCount, setLiveUpdateCount] = useState(0);
    const eventSourceRef = useRef(null);
    const pollIntervalRef = useRef(null);

    // Add debugging on component mount
    useEffect(() => {
        console.log('🏆 ResultsPage: Component mounted for session:', sessionId);
        console.log('🏆 ResultsPage: Current user:', authService.getCurrentUser()?.username);
        console.log('🏆 ResultsPage: Auth status:', authService.isAuthenticated());
    }, [sessionId]);

    // 🚀 ENHANCED: Initialize both SSE and fallback polling
    useEffect(() => {
        if (!sessionId) return;

        // Initial fetch
        fetchResults();
        
        // 🚀 NEW: Try to establish SSE connection first
        setupServerSentEvents();
        
        // 🚀 NEW: Setup fallback polling (only if SSE fails)
        const pollInterval = setInterval(() => {
            if (!isLiveConnected) {
                console.log('📡 SSE not connected, falling back to polling...');
                fetchResults(true); // Silent refresh
            }
        }, 8000); // Poll every 8 seconds as fallback
        
        pollIntervalRef.current = pollInterval;
        
        return () => {
            // Cleanup
            if (eventSourceRef.current) {
                console.log('🔌 Closing SSE connection...');
                eventSourceRef.current.close();
            }
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [sessionId]);

    // 🚀 NEW: Server-Sent Events setup for real-time updates
    const setupServerSentEvents = () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = authService.getAccessToken();
            
            if (!token) {
                console.warn('⚠️ No auth token available for SSE');
                return;
            }

            console.log('🔌 Setting up SSE connection for session:', sessionId);
            
            // Create EventSource with authentication
            const sseUrl = `${backendUrl}/api/gaming/sessions/${sessionId}/live-results`;
            const eventSource = new EventSource(sseUrl);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('✅ SSE connection established');
                setIsLiveConnected(true);
                setError(null);
                
                // Show connection success (subtle notification)
                if (liveUpdateCount === 0) {
                    toast.success('🔴 Live updates connected!', { duration: 2000 });
                }
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 SSE update received:', data);
                    
                    if (data.error) {
                        console.error('❌ SSE Error:', data.error);
                        setError(data.error);
                        return;
                    }

                    // 🚀 Update results in real-time
                    setResults(prevResults => {
                        const newResults = {
                            ...prevResults,
                            results: data.results,
                            total_voters: data.total_voters,
                            total_members: data.total_members,
                            voting_complete: data.voting_complete
                        };

                        // Show notification for new votes (but not on first load)
                        if (prevResults && data.total_voters > (prevResults.total_voters || 0)) {
                            const newVotes = data.total_voters - (prevResults.total_voters || 0);
                            toast.success(
                                `🗳️ ${newVotes} new vote${newVotes !== 1 ? 's' : ''}! (${data.total_voters}/${data.total_members})`,
                                { duration: 3000 }
                            );
                        }

                        // Notify when voting completes
                        if (!prevResults?.voting_complete && data.voting_complete) {
                            toast.success('🏁 Voting completed! Final results ready.', { duration: 5000 });
                        }

                        return newResults;
                    });

                    setLiveUpdateCount(prev => prev + 1);
                    setLoading(false);

                    // Close SSE connection if voting is complete
                    if (data.voting_complete) {
                        console.log('🏁 Voting complete, closing SSE connection');
                        eventSource.close();
                        setIsLiveConnected(false);
                    }

                } catch (parseError) {
                    console.error('❌ Error parsing SSE data:', parseError);
                }
            };

            eventSource.onerror = (error) => {
                console.error('❌ SSE connection error:', error);
                setIsLiveConnected(false);
                
                // Don't show error toast immediately - might be temporary
                setTimeout(() => {
                    if (!isLiveConnected) {
                        console.log('📡 SSE failed, falling back to polling');
                        toast.error('Live updates disconnected. Using polling instead.', { duration: 3000 });
                    }
                }, 5000);

                // Close and cleanup
                eventSource.close();
            };

        } catch (error) {
            console.error('❌ Failed to setup SSE:', error);
            setIsLiveConnected(false);
        }
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
                
                // If voting is complete and we're still polling, stop
                if (data.voting_complete && pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    console.log('🏁 Voting complete, stopping polling');
                }
                
            } else if (response.status === 404) {
                setError('Voting session not found');
                if (!silent) toast.error('Voting session not found');
            } else if (response.status === 403) {
                setError('You do not have permission to view these results');
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

    const handleBackToGroup = () => {
        if (results?.session?.group_id) {
            navigate(`/groups/${results.session.group_id}`);
        } else {
            navigate('/dashboard');
        }
    };

    const handleManualRefresh = () => {
        fetchResults();
        toast.success('Results refreshed!');
    };

    // 🚀 NEW: Force reconnect SSE
    const handleReconnectLive = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        setIsLiveConnected(false);
        setLiveUpdateCount(0);
        setupServerSentEvents();
        toast.loading('Reconnecting live updates...', { duration: 2000 });
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
            if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } catch (error) {
            return 'Recently';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading results...</p>
                    <p className="text-white/60 text-sm mt-2">Setting up live updates...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Unable to Load Results</h2>
                    <p className="text-white/70 mb-6">{error}</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => fetchResults()}
                            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={handleBackToGroup}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
                        >
                            Back to Group
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!results || !results.results || results.results.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">🗳️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">No Votes Yet</h2>
                    <p className="text-white/70 mb-6">
                        {results?.voting_complete ? 
                            'The voting session completed but no votes were cast.' :
                            'Waiting for squad members to submit their votes...'
                        }
                    </p>
                    <div className="mb-4 text-white/60 text-sm">
                        {results?.total_voters || 0} of {results?.total_members || 0} members have voted
                    </div>
                    
                    {/* 🚀 NEW: Live connection status */}
                    <div className="mb-4 flex items-center justify-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className="text-white/60 text-xs">
                            {isLiveConnected ? 'Live updates active' : 'Polling for updates'}
                        </span>
                    </div>
                    
                    {/* Progress bar */}
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
        );
    }

    const { session, results: gameResults, winner, total_voters, total_members, voting_complete } = results;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-4xl mx-auto">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <h1 className="text-4xl md:text-5xl font-bold text-white">
                            🏆 Voting Results
                        </h1>
                        {refreshing && (
                            <div className="ml-4 w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        )}
                    </div>
                    <p className="text-white/70 text-lg mb-2">{session?.session_name}</p>
                    <div className="text-white/60">
                        {total_voters} of {total_members} squad members voted
                    </div>
                    
                    {/* Session status */}
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
                        
                        {/* 🚀 NEW: Live connection indicator */}
                        <div className={`px-3 py-1 rounded-full text-xs flex items-center space-x-2 ${
                            isLiveConnected 
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                            <span>{isLiveConnected ? `Live (${liveUpdateCount} updates)` : 'Polling mode'}</span>
                        </div>
                        
                        {session?.created_at && (
                            <div className="text-white/50 text-sm">
                                Started {formatTimeAgo(session.created_at)}
                            </div>
                        )}
                    </div>
                    
                    {/* Progress bar */}
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
                        
                        {/* Winner details */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto">
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-yellow-400 font-bold text-lg">{winner.total_points}</div>
                                <div className="text-white/70 text-sm">Total Points</div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-yellow-400 font-bold text-lg">{winner.vote_count}</div>
                                <div className="text-white/70 text-sm">Votes Cast</div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-yellow-400 font-bold text-lg">{winner.average_score.toFixed(1)}</div>
                                <div className="text-white/70 text-sm">Avg Score</div>
                            </div>
                        </div>
                        
                        <div className="mt-6">
                            <button 
                                onClick={() => toast.success('Game session feature coming soon!')}
                                className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                            >
                                🚀 Launch Game Session
                            </button>
                        </div>
                    </div>
                )}

                {/* Current leader (if voting not complete) */}
                {!voting_complete && gameResults.length > 0 && (
                    <div className="backdrop-blur-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-3xl p-6 mb-8 text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Current Leader</h3>
                        <div className="flex items-center justify-center space-x-4">
                            <GameImage 
                                src={gameResults[0].game.header_image} 
                                alt={gameResults[0].game.name}
                                fallbackText={gameResults[0].game.name}
                                className="w-16 h-10 object-cover rounded-lg"
                            />
                            <div>
                                <div className="text-white font-bold">{gameResults[0].game.name}</div>
                                <div className="text-white/70 text-sm">{gameResults[0].total_points} points</div>
                            </div>
                        </div>
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
                                        isLiveConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                                    }`}></div>
                                    {isLiveConnected ? 'Live Updates' : 'Polling'}
                                </div>
                            )}
                            
                            {/* 🚀 NEW: Enhanced action buttons */}
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleManualRefresh}
                                    disabled={refreshing}
                                    className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm rounded-lg transition-colors duration-200 disabled:opacity-50"
                                    title="Manual refresh"
                                >
                                    {refreshing ? '⏳' : '🔄'}
                                </button>
                                
                                {!isLiveConnected && !voting_complete && (
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
                                        {/* Rank */}
                                        <div className={`flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r ${getPlaceColor(index)} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                                            {getPlaceEmoji(index)}
                                        </div>
                                        
                                        {/* Game Image */}
                                        <GameImage 
                                            src={result.game.header_image} 
                                            alt={result.game.name}
                                            fallbackText={result.game.name}
                                            className="w-24 h-14 object-cover rounded-lg flex-shrink-0"
                                        />
                                        
                                        {/* Game Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold text-lg truncate flex items-center">
                                                {result.game.name}
                                                {isWinner && <span className="ml-2 text-yellow-400">👑</span>}
                                                {isCurrentLeader && <span className="ml-2 text-blue-400">⭐</span>}
                                            </h4>
                                            <p className="text-white/60 text-sm line-clamp-2">
                                                {result.game.short_description || 'No description available'}
                                            </p>
                                            {result.game.genres && result.game.genres.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {result.game.genres.slice(0, 3).map(genre => (
                                                        <span key={genre} className="px-2 py-1 bg-white/20 rounded text-xs text-white/80">
                                                            {genre}
                                                        </span>
                                                    ))}
                                                    {result.game.genres.length > 3 && (
                                                        <span className="px-2 py-1 bg-white/20 rounded text-xs text-white/60">
                                                            +{result.game.genres.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Stats */}
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
                                            {result.game.multiplayer && (
                                                <div className="mt-1">
                                                    <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                                                        Multiplayer
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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

                {/* Voting Info */}
                <div className="mt-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h4 className="text-white font-semibold mb-4 text-center">How Voting Works</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/70 mb-4">
                        <div className="text-center">
                            <div className="text-2xl mb-2">🥇</div>
                            <div className="font-semibold text-white mb-1">1st Choice</div>
                            <div>3 points each</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2">🥈</div>
                            <div className="font-semibold text-white mb-1">2nd Choice</div>
                            <div>2 points each</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2">🥉</div>
                            <div className="font-semibold text-white mb-1">3rd Choice</div>
                            <div>1 point each</div>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-white/60 text-sm">
                            🏆 The game with the most total points wins! In case of a tie, the game with more votes takes priority.
                        </p>
                        {session && (
                            <p className="text-white/50 text-xs mt-2">
                                Session ID: {session.id} • Created: {formatTimeAgo(session.created_at)}
                                {/* 🚀 NEW: Connection info */}
                                {liveUpdateCount > 0 && (
                                    <span> • {liveUpdateCount} live updates received</span>
                                )}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsPage;