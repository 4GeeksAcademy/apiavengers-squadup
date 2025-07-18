// src/front/components/QuickVote.jsx - ENHANCED to work alongside LiveVotingSession
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../store/authService';

const QuickVote = ({ groupId, onSessionCreated }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [hasActiveSession, setHasActiveSession] = useState(false);
    const [activeSession, setActiveSession] = useState(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkForActiveSession();
    }, [groupId]);

    const checkForActiveSession = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}/active-session`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.session && data.session.status === 'voting') {
                    setHasActiveSession(true);
                    setActiveSession(data.session);
                } else {
                    setHasActiveSession(false);
                    setActiveSession(null);
                }
            }
        } catch (error) {
            console.error('Error checking active session:', error);
        }
    };

    const createVotingSession = async () => {
        if (hasActiveSession) {
            toast.error('There is already an active voting session');
            return;
        }

        setCreating(true);
        setError(null);

        const loadingToast = toast.loading('Creating voting session...');
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}/start-vote`, 
                {
                    method: 'POST',
                    body: JSON.stringify({
                        session_name: `Squad Vote - ${new Date().toLocaleDateString()}`,
                        description: 'Vote for the next game to play together!',
                        auto_complete_threshold: 0.8 // Auto-complete when 80% have voted
                    })
                }
            );

            toast.dismiss(loadingToast);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Voting session created:', data);
                
                setActiveSession(data.session);
                setHasActiveSession(true);
                
                toast.success('🗳️ Voting session started! Choose your games.');
                
                // Notify parent component if callback provided
                if (onSessionCreated) {
                    onSessionCreated(data.session);
                }
                
                // Small delay to show success message
                setTimeout(() => {
                    // The LiveVotingSession component should now take over
                    window.location.reload(); // Force refresh to show LiveVotingSession
                }, 1000);
                
            } else {
                const errorData = await response.json();
                const errorMessage = errorData.error || 'Failed to create voting session';
                setError(errorMessage);
                toast.error(errorMessage);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error creating voting session:', error);
            const errorMessage = 'Network error occurred while creating session';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setCreating(false);
        }
    };

    const joinActiveSession = () => {
        if (activeSession) {
            // Refresh to show LiveVotingSession component
            window.location.reload();
        }
    };

    const viewResults = () => {
        if (activeSession) {
            navigate(`/sessions/${activeSession.id}/results`);
        }
    };

    // If there's an active session, show session management instead of create button
    if (hasActiveSession && activeSession) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="text-center">
                    <div className="text-6xl mb-4">🗳️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">
                        Active Voting Session
                    </h2>
                    <p className="text-white/70 mb-2">{activeSession.session_name}</p>
                    <p className="text-white/60 text-sm mb-6">
                        Created {new Date(activeSession.created_at).toLocaleString()}
                    </p>
                    
                    {/* Session Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-white/5 rounded-lg">
                            <div className="text-blue-400 font-bold text-lg">
                                {activeSession.total_voters || 0}
                            </div>
                            <div className="text-white/60 text-sm">Votes Cast</div>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg">
                            <div className="text-green-400 font-bold text-lg">
                                {activeSession.games_count || 0}
                            </div>
                            <div className="text-white/60 text-sm">Games Available</div>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={joinActiveSession}
                            className="px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
                        >
                            🗳️ Join Voting
                        </button>
                        
                        <button
                            onClick={viewResults}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200"
                        >
                            📊 View Live Results
                        </button>
                    </div>
                    
                    {/* Live Status */}
                    <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <div className="flex items-center justify-center space-x-2 text-blue-300 text-sm">
                            <span className="animate-pulse text-red-400">●</span>
                            <span>Live voting session active</span>
                        </div>
                    </div>
                    
                    {/* Refresh Note */}
                    <p className="mt-4 text-white/50 text-xs">
                        Note: Page will refresh to show the live voting interface
                    </p>
                </div>
            </div>
        );
    }

    // Show create new session interface
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
            <div className="text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold text-white mb-4">Ready to Vote?</h2>
                <p className="text-white/70 mb-6">
                    Start a new voting session to decide what game to play with your squad!
                </p>
                
                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        <div className="flex items-center space-x-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    </div>
                )}
                
                {/* Features List */}
                <div className="mb-8 space-y-3 text-left max-w-md mx-auto">
                    <div className="flex items-center space-x-3 text-white/80">
                        <span className="text-coral-400">✅</span>
                        <span className="text-sm">Real-time voting with live updates</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white/80">
                        <span className="text-coral-400">✅</span>
                        <span className="text-sm">Ranked choice voting (1st, 2nd, 3rd)</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white/80">
                        <span className="text-coral-400">✅</span>
                        <span className="text-sm">Only shows multiplayer games you all own</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white/80">
                        <span className="text-coral-400">✅</span>
                        <span className="text-sm">Instant results and winner announcement</span>
                    </div>
                </div>
                
                {/* Create Button */}
                <button
                    onClick={createVotingSession}
                    disabled={creating || loading}
                    className="px-8 py-4 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                >
                    {creating ? (
                        <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            Creating Session...
                        </div>
                    ) : (
                        '🗳️ Start Live Voting Session'
                    )}
                </button>

                {/* Info Box */}
                <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
                    <div className="flex items-start space-x-2">
                        <span className="text-blue-400 mt-0.5">💡</span>
                        <div className="text-left">
                            <strong>How it works:</strong>
                            <ol className="mt-2 space-y-1 text-xs">
                                <li>1. We'll find games everyone in your squad owns</li>
                                <li>2. Each member votes for their top 3 choices</li>
                                <li>3. Results update in real-time as votes come in</li>
                                <li>4. The game with the most points wins!</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Requirements Check */}
                <div className="mt-6 text-xs text-white/50">
                    <p>💡 Make sure squad members have connected Steam for best results</p>
                </div>
            </div>
        </div>
    );
};

export default QuickVote;