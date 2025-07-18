// src/front/components/LiveVotingSession.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../store/authService';
import toast from 'react-hot-toast';
import GameImage from './GameImage';

const LiveVotingSession = ({ groupId, session, onSessionUpdate }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [commonGames, setCommonGames] = useState([]);
    const [selectedGames, setSelectedGames] = useState([]);
    const [liveResults, setLiveResults] = useState([]);
    const [voterStats, setVoterStats] = useState({ voted: 0, total: 0, percentage: 0 });
    const [hasVoted, setHasVoted] = useState(false);
    const [myVotes, setMyVotes] = useState([]);
    const [votingComplete, setVotingComplete] = useState(false);
    
    // SSE connection refs
    const sseRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    useEffect(() => {
        if (session?.id) {
            initializeSession();
            setupLiveUpdates();
        }
        
        return () => {
            if (sseRef.current) {
                sseRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
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
            console.error('Error initializing session:', error);
            toast.error('Failed to load voting session');
        } finally {
            setLoading(false);
        }
    };

    const setupLiveUpdates = () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            console.log('🔴 Setting up live voting updates...');
            
            const sseUrl = `${backendUrl}/api/gaming/sessions/${session.id}/live-results`;
            const eventSource = new EventSource(sseUrl);
            sseRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('✅ Live voting updates connected');
                setConnectionStatus('connected');
                toast.success('🔴 Live updates active!', { duration: 2000 });
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 Live voting update:', data);
                    
                    if (data.heartbeat) {
                        console.log('💓 Heartbeat received');
                        return;
                    }
                    
                    handleLiveUpdate(data);
                    
                } catch (parseError) {
                    console.error('Error parsing live update:', parseError);
                }
            };

            eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                setConnectionStatus('disconnected');
                
                // Attempt to reconnect
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('🔄 Attempting to reconnect...');
                    setupLiveUpdates();
                }, 5000);
            };

        } catch (error) {
            console.error('Failed to setup live updates:', error);
        }
    };

    const handleLiveUpdate = (data) => {
        if (data.results) {
            setLiveResults(data.results);
        }
        
        if (data.total_voters !== undefined) {
            setVoterStats({
                voted: data.total_voters,
                total: data.total_members || voterStats.total,
                percentage: data.total_members > 0 ? (data.total_voters / data.total_members * 100) : 0
            });
        }
        
        if (data.voting_complete) {
            setVotingComplete(true);
            toast.success('🏁 Voting complete!', { duration: 4000 });
            
            if (onSessionUpdate) {
                onSessionUpdate();
            }
        }
        
        if (data.winner) {
            toast.success(`🏆 Winner: ${data.winner.game.name}!`, { duration: 5000 });
        }
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
                toast.success('🎉 Vote submitted successfully!');
                
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

    if (loading) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white">Loading voting session...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Live Status Header */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        🗳️ Live Voting Session
                        {connectionStatus === 'connected' && (
                            <span className="ml-3 flex items-center">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                                <span className="text-green-300 text-sm">Live</span>
                            </span>
                        )}
                    </h2>
                    
                    <div className="text-right">
                        <div className="text-2xl font-bold text-coral-400">
                            {voterStats.voted}/{voterStats.total}
                        </div>
                        <div className="text-white/60 text-sm">votes collected</div>
                    </div>
                </div>
                
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">{session.session_name}</h3>
                    <p className="text-white/70">{session.description}</p>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-3 mb-4">
                    <div 
                        className="bg-gradient-to-r from-coral-500 to-marine-500 h-3 rounded-full transition-all duration-500 flex items-center justify-center"
                        style={{ width: `${voterStats.percentage || 0}%` }}
                    >
                        {voterStats.percentage > 0 && (
                            <span className="text-white text-xs font-bold">
                                {Math.round(voterStats.percentage)}%
                            </span>
                        )}
                    </div>
                </div>
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
                                            ? 'bg-coral-500/20 border-coral-500 shadow-lg' 
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
                                <div key={vote.id} className="text-white/80 text-sm">
                                    {index + 1}. {vote.game?.name || 'Unknown'} ({vote.priority} points)
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

            {/* Live Results Preview */}
            {liveResults.length > 0 && (
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">🏆 Live Results Preview</h3>
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