import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import authService from '../store/authService';
import toast from 'react-hot-toast'; // Add for error feedback

const ResultsPage = () => {
    const { sessionId } = useParams();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Add error state

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/sessions/${sessionId}/results`);
                if (response.ok) {
                    const data = await response.json();
                    setResults(data);
                } else {
                    const errorData = await response.json();
                    setError(errorData.error || 'Failed to load results');
                    toast.error(errorData.error || 'Failed to load results');
                }
            } catch (error) {
                console.error("Error fetching results:", error);
                setError('Network error. Please try again.');
                toast.error('Network error. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [sessionId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center" role="status" aria-live="polite">
                <div className="text-white text-xl">Loading Results...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center">
                <div className="text-red-500 text-xl">{error}</div>
            </div>
        );
    }

    if (!results || !results.winner) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-xl">No winner could be determined.</div>
            </div>
        );
    }

    const { winner, results: allScores } = results;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8">
                <p className="text-2xl text-white/80">The winner is...</p>
                <h1 className="text-7xl font-bold text-white uppercase tracking-wider">{winner.name}!</h1>
            </div>
            <img src={winner.header_image} alt={winner.name} className="w-full max-w-2xl rounded-xl shadow-2xl mb-8" />
            <div className="backdrop-blur-xl bg-white/10 p-6 rounded-2xl w-full max-w-lg">
                <h2 className="text-xl font-bold text-white mb-4">Final Scores</h2>
                <div className="space-y-2">
                    {allScores.map(item => (
                        <div key={item.game.id} className="flex justify-between items-center bg-white/10 p-3 rounded-lg">
                            <span className="font-semibold text-white">{item.game.name}</span>
                            <span className="font-bold text-coral-400">{item.score} points</span>
                        </div>
                    ))}
                </div>
            </div>
            <Link to="/dashboard" className="mt-8 px-6 py-3 bg-coral-500 text-white font-semibold rounded-lg">
                Back to Dashboard
            </Link>
        </div>
    );
};

export default ResultsPage;