// src/front/components/QuickVote.jsx - PRODUCTION-READY with retry logic
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../store/authService';
import { submitVotes, fetchMyVotes } from '../store/actions.js';
import GameImage from './GameImage';

const QuickVote = ({ groupId }) => {
    const navigate = useNavigate();
    const [votableGames, setVotableGames] = useState([]);
    const [selectedGames, setSelectedGames] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [error, setError] = useState(null);
    
    // 🚀 NEW: Enhanced state for retry functionality
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);

    // Check for existing voting session on component mount
    useEffect(() => {
        checkExistingSession();
    }, [groupId]);

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
                    
                    // Check if this user has already voted
                    checkUserVoteStatus(data.session.id);
                    
                    toast.info('Voting session already active!');
                }
            }
        } catch (error) {
            console.error('Error checking existing session:', error);
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
                        toast.info('You have already voted in this session');
                    }
                } catch (parseError) {
                    console.error('Error parsing vote results:', parseError);
                }
            }
        } catch (error) {
            console.error('Error checking vote status:', error);
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
                    session_name: `Group Vote Session - ${new Date().toLocaleString()}`,
                    description: 'Vote for the next game to play together!'
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Vote session started:', data);
                
                setSessionId(data.session.id);
                setVotableGames(data.common_games || []);
                setSessionStarted(true);
                
                toast.success('Voting session started! Select up to 3 games.');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to start voting session');
                toast.error(errorData.error || 'Failed to start voting session.');
            }
        } catch (error) {
            console.error('Error starting vote:', error);
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

    // 🚀 ENHANCED: Vote submission with retry logic and validation
    const submitVotesWithRetry = async (maxRetries = 3) => {
        if (selectedGames.length === 0) {
            toast.error('Please select at least one game.');
            return;
        }

        if (!sessionId) {
            toast.error('No active voting session.');
            return;
        }

        // Show what user is voting for
        const votesSummary = selectedGames.map((gameId, index) => {
            const game = votableGames.find(g => g.id === gameId);
            return `${index + 1}. ${game?.name || 'Unknown'} (${selectedGames.length - index} pts)`;
        });
        
        console.log('🗳️ Submitting votes:', votesSummary.join(', '));

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
                    
                    // 🎉 Enhanced success feedback
                    toast.success('🎉 Votes submitted successfully!', { duration: 3000 });
                    
                    // Show what was voted for
                    console.log('✅ Votes successfully submitted:', votesSummary.join(', '));
                    
                    // Show summary toast
                    setTimeout(() => {
                        const summaryText = votesSummary.slice(0, 2).join(', ') + 
                                          (votesSummary.length > 2 ? `, +${votesSummary.length - 2} more` : '');
                        toast.success(`Your votes: ${summaryText}`, { duration: 4000 });
                    }, 500);
                    
                    // Navigate to results with delay
                    setTimeout(() => {
                        console.log('🎯 Navigating to results page:', `/sessions/${sessionId}/results`);
                        navigate(`/sessions/${sessionId}/results`);
                    }, 1500);
                    
                    return; // Success - exit retry loop
                    
                } else {
                    // Handle API errors
                    const errorMessage = data.error || 'Vote submission failed';
                    
                    // Check for specific error types that shouldn't be retried
                    if (errorMessage.includes('already voted') || 
                        errorMessage.includes('not active') ||
                        errorMessage.includes('not a member')) {
                        throw new Error(`${errorMessage} (No retry needed)`);
                    }
                    
                    throw new Error(errorMessage);
                }
                
            } catch (error) {
                console.error(`Vote submission attempt ${attempt} failed:`, error);
                
                // Check if this is a non-retryable error
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

    // 🚀 NEW: Clear error and retry
    const handleRetry = () => {
        setError(null);
        setRetryCount(0);
        submitVotesWithRetry();
    };

    // 🚀 NEW: Reset and start fresh
    const handleReset = () => {
        setError(null);
        setRetryCount(0);
        setIsRetrying(false);
        setSelectedGames([]);
        checkExistingSession();
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
                                checkExistingSession();
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

    // If no session started yet, show start button
    if (!sessionStarted && !loading) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Ready to Vote?</h2>
                <p className="text-white/70 mb-6">
                    Start a quick voting session to decide what game to play with your squad!
                </p>
                <button
                    onClick={startVotingSession}
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            Starting...
                        </div>
                    ) : (
                        '🗳️ Start Voting Session'
                    )}
                </button>
            </div>
        );
    }

    // Show success message after submission
    if (submitted) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-white mb-4">Votes Submitted!</h2>
                <p className="text-white/70 mb-2">Thank you for voting!</p>
                
                {/* 🚀 NEW: Show what was voted for */}
                <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <p className="text-white/60 text-sm mb-2">Your votes:</p>
                    {selectedGames.map((gameId, index) => {
                        const game = votableGames.find(g => g.id === gameId);
                        return (
                            <div key={gameId} className="text-white/80 text-sm">
                                {index + 1}. {game?.name || 'Unknown'} ({selectedGames.length - index} points)
                            </div>
                        );
                    })}
                </div>
                
                <p className="text-white/60 text-sm">Redirecting to results...</p>
                
                <div className="mt-6">
                    <button 
                        onClick={() => navigate(`/sessions/${sessionId}/results`)}
                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                    >
                        View Results Now
                    </button>
                </div>
            </div>
        );
    }

    // Show loading state
    if (loading) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/70">
                    {isRetrying ? `Retrying vote submission... (attempt ${retryCount})` : 'Loading...'}
                </p>
                {isRetrying && (
                    <p className="text-white/50 text-sm mt-2">
                        Having connection issues? We'll keep trying...
                    </p>
                )}
            </div>
        );
    }

    // Main voting interface
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Vote for Games</h2>
                <p className="text-white/70">
                    Select up to 3 games you'd like to play ({selectedGames.length}/3 selected)
                </p>
                <p className="text-white/60 text-sm mt-1">
                    Your 1st choice gets 3 points, 2nd gets 2 points, 3rd gets 1 point
                </p>
            </div>

            {/* 🚀 ENHANCED: Error banner with retry option */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleRetry}
                                className="px-3 py-1 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-xs transition-colors"
                            >
                                🔄 Retry
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
                            >
                                🔄 Reset
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
                    {/* Games grid */}
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

                    {/* Submit section */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="text-white/60 text-sm">
                            <p>🏆 Games are ranked by preference</p>
                            <p>📊 Results will show the winning game based on total points</p>
                            {selectedGames.length > 0 && (
                                <p className="text-coral-300 mt-1">
                                    ✨ Ready to submit {selectedGames.length} vote{selectedGames.length !== 1 ? 's' : ''}
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
                                    {isRetrying ? `Retrying... (${retryCount})` : 'Submitting...'}
                                </div>
                            ) : (
                                `Submit ${selectedGames.length} Vote${selectedGames.length !== 1 ? 's' : ''}`
                            )}
                        </button>
                    </div>

                    {/* Help text */}
                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
                        <div className="flex items-start space-x-2">
                            <span className="text-blue-400 mt-0.5">💡</span>
                            <div>
                                <strong>Voting Tips:</strong>
                                <ul className="mt-2 space-y-1">
                                    <li>• Select games in order of preference (1st, 2nd, 3rd choice)</li>
                                    <li>• You can change your selections before submitting</li>
                                    <li>• Only multiplayer games owned by multiple squad members are shown</li>
                                    <li>• The game with the most points wins!</li>
                                    <li>• 🚀 <strong>New:</strong> Automatic retry if submission fails</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default QuickVote;