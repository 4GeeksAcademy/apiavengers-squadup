// src/front/components/QuickVote.jsx - Enhanced with new Vote model integration
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { submitVotes, fetchMyVotes, fetchSessionResults } from '../store/actions.js';
import useGlobalReducer from '../hooks/useGlobalReducer'; // Fixed: default import
import { getGamingSelectors, ACTION_TYPES } from '../store/store.js';
import GameImage from './GameImage';

const QuickVote = ({ groupId, sessionId, user }) => {
    const { store, dispatch } = useGlobalReducer();
    const selectors = getGamingSelectors(store);
    
    // Local state
    const [votableGames, setVotableGames] = useState([]);
    const [selectedGames, setSelectedGames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [userVotes, setUserVotes] = useState([]);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [sessionStarted, setSessionStarted] = useState(false);

    // Global state
    const activeSession = selectors.getActiveSession();
    const sessionResults = selectors.getSessionResults();
    const isVotingLoading = selectors.isVotingLoading();

    useEffect(() => {
        if (sessionId) {
            checkExistingSession();
            checkUserVotes();
        }
    }, [sessionId, dispatch]);

    const checkExistingSession = async () => {
        try {
            // Check if we have session data
            if (!activeSession || activeSession.id !== sessionId) {
                // Fetch session details from the active-session endpoint
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                const response = await fetch(`${backendUrl}/api/gaming/groups/${groupId}/active-session`, {
                    headers: {
                        'Authorization': `Bearer ${store.token}`
                    }
                });
                
                const data = await response.json();
                
                if (response.ok && data.success && data.session) {
                    dispatch({
                        type: ACTION_TYPES.SET_ACTIVE_SESSION,
                        payload: data.session
                    });
                    
                    setVotableGames(data.votable_games || []);
                    setSessionStarted(true);
                } else {
                    setError('No active voting session found');
                }
            } else {
                setSessionStarted(true);
                // If we have games in global state, use them
                // Otherwise we'd need to fetch them separately
            }
        } catch (error) {
            console.error('Error checking session:', error);
            setError('Failed to load voting session');
        }
    };

    const checkUserVotes = async () => {
        if (!sessionId) return;

        try {
            const result = await fetchMyVotes(dispatch, sessionId);
            
            if (result.success) {
                if (result.hasVoted) {
                    setSubmitted(true);
                    setUserVotes(result.votes || []);
                    
                    // Convert votes back to selected games format for display
                    const selectedFromVotes = result.votes.map(vote => ({
                        id: vote.game_id,
                        name: vote.game?.name || `Game ${vote.game_id}`,
                        header_image: vote.game?.header_image,
                        priority: vote.priority
                    }));
                    
                    // Sort by priority (highest first)
                    selectedFromVotes.sort((a, b) => b.priority - a.priority);
                    setSelectedGames(selectedFromVotes);
                }
            }
        } catch (error) {
            console.error('Error checking user votes:', error);
            // Don't show error to user, just log it
        }
    };

    const handleGameSelect = (game) => {
        if (submitted) {
            toast.error('You have already submitted your votes');
            return;
        }

        setSelectedGames(prev => {
            const isAlreadySelected = prev.find(g => g.id === game.id);
            
            if (isAlreadySelected) {
                // Remove from selection
                return prev.filter(g => g.id !== game.id);
            } else if (prev.length >= 3) {
                // Replace the lowest priority game
                const newSelection = [...prev.slice(0, 2), game];
                toast.info('Maximum 3 games can be selected. Replaced your 3rd choice.');
                return newSelection;
            } else {
                // Add to selection
                return [...prev, game];
            }
        });
    };

    const getGamePriority = (gameId) => {
        const index = selectedGames.findIndex(g => g.id === gameId);
        return index === -1 ? 0 : selectedGames.length - index; // 3, 2, 1 for first, second, third
    };

    const handleVoteSubmission = async () => {
        if (selectedGames.length === 0) {
            toast.error('Please select at least one game to vote for');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Format votes for the new Vote model
            const gameVotes = selectedGames.map((game, index) => ({
                game_id: game.id,
                priority: selectedGames.length - index // 3 points for 1st choice, 2 for 2nd, 1 for 3rd
            }));

            const result = await submitVotes(dispatch, sessionId, gameVotes);

            if (result.success) {
                setSubmitted(true);
                
                // Update local user votes display
                const newUserVotes = gameVotes.map(vote => ({
                    ...vote,
                    game: selectedGames.find(g => g.id === vote.game_id)
                }));
                setUserVotes(newUserVotes);
                
                // Clear any previous error
                setError(null);
                setRetryCount(0);
                
                toast.success(`🎉 Votes submitted! ${result.totalVoters}/${result.totalMembers} members have voted.`);
                
                // Check if voting is complete
                if (result.sessionStatus === 'completed') {
                    toast.success('🏁 Voting session completed!');
                    // Fetch final results
                    setTimeout(() => {
                        fetchSessionResults(dispatch, sessionId);
                    }, 1000);
                }
            } else {
                throw new Error(result.error || 'Failed to submit votes');
            }
        } catch (error) {
            console.error('Error submitting votes:', error);
            setError(error.message);
            
            // Implement retry logic for network errors
            if (error.message.includes('Network') && retryCount < 3) {
                setRetryCount(prev => prev + 1);
                toast.error(`Network error. Retry ${retryCount + 1}/3 in 3 seconds...`);
                setTimeout(() => {
                    handleVoteSubmission();
                }, 3000);
            } else {
                toast.error(error.message || 'Failed to submit votes');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRetryVoting = () => {
        setSubmitted(false);
        setUserVotes([]);
        setSelectedGames([]);
        setError(null);
        setRetryCount(0);
        
        // Re-check if user can still vote
        checkUserVotes();
    };

    // Get priority label
    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 3: return '1st Choice (3 pts)';
            case 2: return '2nd Choice (2 pts)';
            case 1: return '3rd Choice (1 pt)';
            default: return '';
        }
    };

    // Show loading state
    if (!sessionStarted || isVotingLoading) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8">
                <div className="flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-coral-500/30 border-t-coral-500 rounded-full animate-spin mr-3"></div>
                    <span className="text-white">Loading voting session...</span>
                </div>
            </div>
        );
    }

    // Show error state
    if (error && !submitted) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
                <div className="text-6xl mb-4">❌</div>
                <h3 className="text-xl font-bold text-white mb-4">Voting Error</h3>
                <p className="text-white/60 mb-6">{error}</p>
                <button
                    onClick={() => {
                        setError(null);
                        checkExistingSession();
                    }}
                    className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // Show success state
    if (submitted) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-xl font-bold text-white mb-2">Votes Submitted!</h3>
                    <p className="text-white/60">Thank you for participating in the game vote.</p>
                </div>

                {/* Show user's votes */}
                <div className="space-y-4">
                    <h4 className="text-lg font-bold text-white">Your Votes:</h4>
                    <div className="space-y-3">
                        {userVotes
                            .sort((a, b) => b.priority - a.priority)
                            .map((vote, index) => (
                            <div key={vote.game_id} className="flex items-center space-x-4 p-4 bg-white/5 border border-white/20 rounded-xl">
                                <div className="relative">
                                    <GameImage
                                        game={vote.game || selectedGames.find(g => g.id === vote.game_id)}
                                        size="sm"
                                        className="w-16 h-16 rounded-lg"
                                    />
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-coral-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                        {vote.priority}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-white font-medium">
                                        {vote.game?.name || selectedGames.find(g => g.id === vote.game_id)?.name || `Game ${vote.game_id}`}
                                    </div>
                                    <div className="text-coral-400 text-sm font-medium">
                                        {getPriorityLabel(vote.priority)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="mt-8 flex justify-center space-x-4">
                    <button
                        onClick={() => {
                            // Navigate to results or refresh to see live results
                            window.location.reload();
                        }}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
                    >
                        View Live Results
                    </button>
                    
                    {/* Allow revote if session is still active */}
                    {activeSession?.status === 'voting' && (
                        <button
                            onClick={handleRetryVoting}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors"
                        >
                            Change Votes
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Main voting interface
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold text-white flex items-center">
                    <span className="text-2xl mr-2">🗳️</span>
                    Cast Your Votes
                </h3>
                <p className="text-white/60 mt-1">
                    Select up to 3 games and rank them. Your top choice gets 3 points, second gets 2 points, third gets 1 point.
                </p>
                
                {/* Selection summary */}
                {selectedGames.length > 0 && (
                    <div className="mt-4 p-3 bg-coral-500/10 border border-coral-500/20 rounded-lg">
                        <div className="text-coral-300 text-sm font-medium mb-2">
                            Selected ({selectedGames.length}/3):
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedGames.map((game, index) => (
                                <span key={game.id} className="px-2 py-1 bg-coral-500/20 text-coral-300 rounded text-xs flex items-center space-x-1">
                                    <span className="font-bold">{selectedGames.length - index}.</span>
                                    <span>{game.name}</span>
                                    <button 
                                        onClick={() => handleGameSelect(game)}
                                        className="ml-1 text-coral-300 hover:text-white"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Games list */}
            <div className="p-6">
                {votableGames.length > 0 ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                            {votableGames.map(game => {
                                const isSelected = selectedGames.find(g => g.id === game.id);
                                const priority = getGamePriority(game.id);
                                
                                return (
                                    <button
                                        key={game.id}
                                        onClick={() => handleGameSelect(game)}
                                        className={`flex items-center space-x-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                                            isSelected
                                                ? 'bg-coral-500/20 border-coral-500/50 transform scale-105'
                                                : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
                                        }`}
                                    >
                                        <div className="relative">
                                            <GameImage
                                                game={game}
                                                size="sm"
                                                className="w-16 h-16 rounded-lg"
                                            />
                                            {isSelected && (
                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-coral-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                                    {priority}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white font-medium truncate">{game.name}</div>
                                            <div className="text-white/60 text-sm truncate">
                                                {game.short_description || 'No description available'}
                                            </div>
                                            <div className="flex items-center space-x-3 mt-1">
                                                {game.multiplayer && (
                                                    <span className="text-green-400 text-xs">👥 Multiplayer</span>
                                                )}
                                                {game.co_op && (
                                                    <span className="text-blue-400 text-xs">🤝 Co-op</span>
                                                )}
                                                {game.max_players && (
                                                    <span className="text-white/60 text-xs">
                                                        Max {game.max_players} players
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {isSelected && (
                                                <div className="text-coral-400 text-sm font-medium mt-1">
                                                    {getPriorityLabel(priority)}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🎮</div>
                        <h4 className="text-xl font-bold text-white mb-2">No Common Games Found</h4>
                        <p className="text-white/60 mb-6">
                            Make sure group members have connected their Steam accounts and own common multiplayer games.
                        </p>
                        <button
                            onClick={checkExistingSession}
                            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors"
                        >
                            Refresh Games
                        </button>
                    </div>
                )}
            </div>

            {/* Submit button */}
            {votableGames.length > 0 && (
                <div className="p-6 border-t border-white/10">
                    <button
                        onClick={handleVoteSubmission}
                        disabled={selectedGames.length === 0 || loading}
                        className="w-full px-6 py-4 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Submitting Votes...</span>
                            </>
                        ) : (
                            <>
                                <span className="text-xl">🚀</span>
                                <span>
                                    Submit {selectedGames.length} Vote{selectedGames.length !== 1 ? 's' : ''}
                                </span>
                            </>
                        )}
                    </button>
                    
                    {selectedGames.length === 0 && (
                        <p className="text-white/60 text-center text-sm mt-2">
                            Select at least one game to vote
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuickVote;