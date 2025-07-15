import React, { useState } from 'react';
// 1. ADD THE TOAST IMPORT
import toast from 'react-hot-toast';

const QuickVote = ({ groupId }) => {
    const [votableGames, setVotableGames] = useState([]);
    const [selectedGames, setSelectedGames] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const startVotingSession = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('squadup_access_token') || sessionStorage.getItem('squadup_access_token');
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            
            const response = await fetch(`${backendUrl}/api/gaming/groups/${groupId}/quick-vote`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSessionId(data.session.id);
                setVotableGames(data.votable_games);
            } else {
                // 2. REPLACE ALERT
                toast.error('Failed to start voting session.');
            }
        } catch (error) {
            console.error('Error starting vote:', error);
            // REPLACE ALERT
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
                // 3. REPLACE ALERT
                toast.error('You can only select up to 3 games.');
                return prev;
            }
        });
    };

    const submitVotes = async () => {
        if (selectedGames.length === 0) {
            // 4. REPLACE ALERT
            toast.error('Please select at least one game.');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('squadup_access_token') || sessionStorage.getItem('squadup_access_token');
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            
            const response = await fetch(`${backendUrl}/api/gaming/sessions/${sessionId}/submit-votes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ votes: selectedGames })
            });

            if (response.ok) {
                setSubmitted(true);
                setTimeout(() => {
                    window.location.href = `/sessions/${sessionId}/results`;
                }, 2000);
            } else {
                // REPLACE ALERT
                toast.error('Failed to submit votes.');
            }
        } catch (error) {
            console.error('Error submitting votes:', error);
            // REPLACE ALERT
            toast.error('A network error occurred.');
        } finally {
            setLoading(false);
        }
    };

    // --- The rest of your JSX remains completely unchanged ---
    if (!sessionId && !loading) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Ready to Vote?</h2>
                <p className="text-white/70 mb-6">
                    Start a quick voting session to decide what game to play with your squad!
                </p>
                <button
                    onClick={startVotingSession}
                    className="px-8 py-3 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                    🗳️ Start Voting Session
                </button>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-white mb-4">Votes Submitted!</h2>
                <p className="text-white/70">Redirecting to results...</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/70">Loading...</p>
            </div>
        );
    }

    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Vote for Games</h2>
                <p className="text-white/70">Select up to 3 games you'd like to play ({selectedGames.length}/3 selected)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto mb-6">
                {votableGames.map((game, index) => {
                    const isSelected = selectedGames.includes(game.id);
                    const selectionIndex = selectedGames.indexOf(game.id);
                    
                    return (
                        <div
                            key={game.id}
                            onClick={() => toggleGameSelection(game.id)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                                isSelected 
                                    ? 'bg-coral-500/20 border-coral-500' 
                                    : 'bg-white/5 border-white/20 hover:border-white/40'
                            }`}
                        >
                            <div className="flex items-center space-x-3">
                                {game.header_image && (
                                    <img 
                                        src={game.header_image} 
                                        alt={game.name}
                                        className="w-20 h-12 object-cover rounded"
                                    />
                                )}
                                <div className="flex-1">
                                    <h3 className="text-white font-medium">{game.name}</h3>
                                    <p className="text-white/60 text-sm">
                                        {game.ownership_stats.coverage_percentage}% of squad owns this
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
                <p className="text-white/60 text-sm">
                    Games are ordered by preference (1st choice gets 3 points, 2nd gets 2, 3rd gets 1)
                </p>
                <button
                    onClick={submitVotes}
                    disabled={selectedGames.length === 0}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Submit Votes
                </button>
            </div>
        </div>
    );
};

export default QuickVote;