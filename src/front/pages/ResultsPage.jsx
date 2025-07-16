// src/front/pages/ResultsPage.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        fetchResults();
        
        // Set up polling for live results (every 5 seconds)
        const interval = setInterval(fetchResults, 5000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const fetchResults = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/sessions/${sessionId}/results`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Results data:', data);
                setResults(data);
                setError(null);
            } else if (response.status === 404) {
                setError('Voting session not found');
                toast.error('Voting session not found');
            } else if (response.status === 403) {
                setError('You do not have permission to view these results');
                toast.error('Access denied');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to load results');
                toast.error(errorData.error || 'Failed to load results');
            }
        } catch (error) {
            console.error("Error fetching results:", error);
            setError('Network error. Please check your connection.');
            if (loading) { // Only show toast on initial load
                toast.error('Network error. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBackToGroup = () => {
        if (results?.session?.group_id) {
            navigate(`/groups/${results.session.group_id}`);
        } else {
            navigate('/dashboard');
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading results...</p>
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
                            onClick={fetchResults}
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
                    <button
                        onClick={handleBackToGroup}
                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                    >
                        Back to Group
                    </button>
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
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        🏆 Voting Results
                    </h1>
                    <p className="text-white/70 text-lg mb-2">{session?.session_name}</p>
                    <div className="text-white/60">
                        {total_voters} of {total_members} squad members voted
                    </div>
                    {!voting_complete && (
                        <div className="mt-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm inline-block">
                            Voting still active • Live results
                        </div>
                    )}
                </div>

                {/* Winner Announcement */}
                {winner && voting_complete && (
                    <div className="backdrop-blur-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-3xl p-8 mb-8 text-center">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            Winner: {winner.game.name}!
                        </h2>
                        <p className="text-white/80 mb-4">
                            {winner.total_points} points • {winner.vote_count} votes
                        </p>
                        <GameImage 
                            src={winner.game.header_image} 
                            alt={winner.game.name}
                            fallbackText={winner.game.name}
                            className="w-full max-w-md mx-auto h-48 object-cover rounded-xl shadow-2xl"
                        />
                        <div className="mt-6">
                            <button className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                🚀 Launch Game Session
                            </button>
                        </div>
                    </div>
                )}

                {/* Results List */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center justify-between">
                        <span>All Results</span>
                        {!voting_complete && (
                            <div className="text-sm text-white/60 font-normal">
                                Updates automatically
                            </div>
                        )}
                    </h3>
                    
                    <div className="space-y-4">
                        {gameResults.map((result, index) => {
                            const isWinner = index === 0;
                            
                            return (
                                <div 
                                    key={result.game.id} 
                                    className={`p-6 rounded-2xl border transition-all duration-300 ${
                                        isWinner && voting_complete
                                            ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 shadow-lg shadow-yellow-500/20'
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
                                            <h4 className="text-white font-bold text-lg truncate">
                                                {result.game.name}
                                            </h4>
                                            <p className="text-white/60 text-sm">
                                                {result.game.short_description || 'No description available'}
                                            </p>
                                            {result.game.genres && result.game.genres.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {result.game.genres.slice(0, 3).map(genre => (
                                                        <span key={genre} className="px-2 py-1 bg-white/20 rounded text-xs text-white/80">
                                                            {genre}
                                                        </span>
                                                    ))}
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
                            onClick={fetchResults}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200"
                        >
                            🔄 Refresh Results
                        </button>
                    )}
                </div>

                {/* Voting Info */}
                <div className="mt-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                    <h4 className="text-white font-semibold mb-3">How Voting Works</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/70">
                        <div>
                            <div className="text-lg mb-1">🥇</div>
                            <div>1st choice = 3 points</div>
                        </div>
                        <div>
                            <div className="text-lg mb-1">🥈</div>
                            <div>2nd choice = 2 points</div>
                        </div>
                        <div>
                            <div className="text-lg mb-1">🥉</div>
                            <div>3rd choice = 1 point</div>
                        </div>
                    </div>
                    <p className="text-white/60 text-xs mt-4">
                        The game with the most total points wins! 🏆
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResultsPage;