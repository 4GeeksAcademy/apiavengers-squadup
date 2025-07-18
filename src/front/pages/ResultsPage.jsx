// src/front/pages/ResultsPage.jsx - FIXED JSON parsing and SSE authentication
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import authService from '../store/authService';
import toast from 'react-hot-toast';
import GameImage from '../components/GameImage';
import VoterStatusPanel from '../components/VoterStatusPanel';
import VotingReminders from '../components/VotingReminders';

const ResultsPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);
    
    // Real-time connection state
    const [isLiveConnected, setIsLiveConnected] = useState(false);
    const [liveUpdateCount, setLiveUpdateCount] = useState(0);
    const eventSourceRef = useRef(null);
    const pollIntervalRef = useRef(null);

    useEffect(() => {
        console.log('🏆 ResultsPage: Component mounted for session:', sessionId);
        console.log('🏆 ResultsPage: Current user:', authService.getCurrentUser()?.username);
        console.log('🏆 ResultsPage: Auth status:', authService.isAuthenticated());
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;

        fetchResults();
        setupServerSentEvents();
        
        const pollInterval = setInterval(() => {
            if (!isLiveConnected) {
                console.log('📡 SSE not connected, falling back to polling...');
                fetchResults(true);
            }
        }, 8000);
        
        pollIntervalRef.current = pollInterval;
        
        return () => {
            if (eventSourceRef.current) {
                console.log('🔌 Closing SSE connection...');
                eventSourceRef.current.close();
            }
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [sessionId]);

    // 🔧 FIXED: SSE with token-based authentication
    const setupServerSentEvents = () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = authService.getAccessToken();
            
            if (!token) {
                console.warn('⚠️ No auth token available for SSE');
                return;
            }

            console.log('🔌 Setting up SSE connection for session:', sessionId);
            
            // 🔧 FIX: Use token-based authentication for SSE
            const sseUrl = `${backendUrl}/api/gaming/sessions/${sessionId}/live-results?token=${encodeURIComponent(token)}`;
            const eventSource = new EventSource(sseUrl);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('✅ SSE connection established');
                setIsLiveConnected(true);
                setError(null);
                
                if (liveUpdateCount === 0) {
                    toast.success('🔴 Live updates connected!', { duration: 2000 });
                }
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 SSE update received:', data);
                    
                    // 🔧 FIX: Handle heartbeat messages
                    if (data.heartbeat) {
                        console.log('💓 Heartbeat received');
                        return;
                    }
                    
                    if (data.error) {
                        console.error('❌ SSE Error:', data.error);
                        setError(data.error);
                        return;
                    }

                    setResults(prevResults => {
                        const newResults = {
                            ...prevResults,
                            results: data.results,
                            total_voters: data.total_voters,
                            total_members: data.total_members,
                            voting_complete: data.voting_complete
                        };

                        if (prevResults && data.total_voters > (prevResults.total_voters || 0)) {
                            const newVotes = data.total_voters - (prevResults.total_voters || 0);
                            toast.success(`🗳️ ${newVotes} new vote${newVotes !== 1 ? 's' : ''}! (${data.total_voters}/${data.total_members})`, { duration: 3000 });
                        }

                        if (!prevResults?.voting_complete && data.voting_complete) {
                            toast.success('🏁 Voting completed! Final results ready.', { duration: 5000 });
                        }

                        return newResults;
                    });

                    setLiveUpdateCount(prev => prev + 1);
                    setLoading(false);

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
                
                setTimeout(() => {
                    if (!isLiveConnected) {
                        console.log('📡 SSE failed, falling back to polling');
                        toast.error('Live updates disconnected. Using polling instead.', { duration: 3000 });
                    }
                }, 5000);

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
                
                if (data.session?.group_id) {
                    fetchGroupMembers(data.session.group_id);
                }
                
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

    const handleSendReminder = async (voterId) => {
        console.log('Sending reminder to voter:', voterId);
        toast.success('Reminder sent!', { duration: 2000 });
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

    // 🔧 FIXED: Safe JSON parsing for pending voters
    const getPendingVoters = () => {
        if (!results || !groupMembers.length) return [];
        
        try {
            // Handle both string and object formats safely
            let voteResults = {};
            
            if (results.session?.vote_results) {
                if (typeof results.session.vote_results === 'string') {
                    try {
                        voteResults = JSON.parse(results.session.vote_results);
                    } catch (parseError) {
                        console.warn('Could not parse vote_results JSON:', parseError);
                        voteResults = {};
                    }
                } else if (typeof results.session.vote_results === 'object') {
                    voteResults = results.session.vote_results;
                }
            }
            
            const voters = voteResults.voters || {};
            return groupMembers.filter(member => !voters[member.id.toString()]);
            
        } catch (error) {
            console.error('Error calculating pending voters:', error);
            return [];
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
        const pendingVoters = getPendingVoters();
        
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
                                <div className="mb-4 text-white/60 text-sm">
                                    {results?.total_voters || 0} of {results?.total_members || 0} members have voted
                                </div>
                                
                                <div className="mb-4 flex items-center justify-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                                    <span className="text-white/60 text-xs">
                                        {isLiveConnected ? 'Live updates active' : 'Polling for updates'}
                                    </span>
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
                                    groupId={results?.session?.group_id}
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
                                                isLiveConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                                            }`}></div>
                                            {isLiveConnected ? 'Live Updates' : 'Polling'}
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

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {sessionId && (
                            <VoterStatusPanel 
                                sessionId={sessionId}
                                groupId={session?.group_id}
                            />
                        )}
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