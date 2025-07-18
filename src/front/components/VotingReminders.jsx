// src/front/components/VotingReminders.jsx - ENHANCED for Live Voting
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../store/authService';
import toast from 'react-hot-toast';

const VotingReminders = ({ groupId }) => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (groupId) {
            fetchRecentSessions();
        }
    }, [groupId]);

    const fetchRecentSessions = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}/sessions?limit=5&include_stats=true`
            );
            
            if (response.ok) {
                const data = await response.json();
                setSessions(data.sessions || []);
                setError(null);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to load sessions');
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
            setError('Network error loading sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleViewResults = (sessionId) => {
        navigate(`/sessions/${sessionId}/results`);
    };

    const handleJoinActiveSession = (sessionId) => {
        // Navigate to group page and highlight the active session
        navigate(`/groups/${groupId}`, { 
            state: { 
                activeSessionId: sessionId,
                highlightVoting: true 
            } 
        });
        toast.success('Navigate to the voting section to participate!');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'voting': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'voting': return '🔴';
            case 'completed': return '✅';
            case 'cancelled': return '❌';
            default: return '⏸️';
        }
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'Unknown';
        
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
            if (diffDays < 7) return `${diffDays}d ago`;
            
            return date.toLocaleDateString();
        } catch (error) {
            return 'Unknown';
        }
    };

    const getWinnerInfo = (session) => {
        if (!session.winner_game) return null;
        
        return {
            name: session.winner_game.name,
            votes: session.winner_votes || 0,
            points: session.winner_points || 0
        };
    };

    if (loading) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    <span className="text-white/70 text-sm">Loading session history...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-red-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-2">Session History</h3>
                <div className="text-red-300 text-sm mb-3">{error}</div>
                <button
                    onClick={fetchRecentSessions}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
                >
                    🔄 Retry
                </button>
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <span className="text-xl mr-2">📊</span>
                    Session History
                </h3>
                <div className="text-center py-4">
                    <div className="text-4xl mb-2">🗳️</div>
                    <p className="text-white/70 text-sm">No voting sessions yet</p>
                    <p className="text-white/50 text-xs mt-1">Start your first vote to see history here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center">
                    <span className="text-xl mr-2">📊</span>
                    Recent Sessions
                </h3>
                <button
                    onClick={fetchRecentSessions}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg text-xs transition-colors"
                    title="Refresh sessions"
                >
                    🔄
                </button>
            </div>
            
            <div className="space-y-3">
                {sessions.map(session => {
                    const winner = getWinnerInfo(session);
                    const isActive = session.status === 'voting';
                    
                    return (
                        <div 
                            key={session.id} 
                            className={`p-4 rounded-xl border transition-all duration-300 ${
                                isActive 
                                    ? 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/20' 
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h4 className="text-white font-medium truncate">
                                            {session.session_name}
                                        </h4>
                                        {isActive && (
                                            <span className="animate-pulse text-red-400 text-sm">●</span>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(session.status)}`}>
                                            {getStatusIcon(session.status)} {session.status}
                                        </span>
                                        <span className="text-white/60">{formatTimeAgo(session.created_at)}</span>
                                    </div>
                                </div>
                                
                                {/* Action Button */}
                                <div className="ml-3">
                                    {isActive ? (
                                        <button
                                            onClick={() => handleJoinActiveSession(session.id)}
                                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors duration-200 flex items-center space-x-1"
                                        >
                                            <span>🗳️</span>
                                            <span>Vote</span>
                                        </button>
                                    ) : session.status === 'completed' ? (
                                        <button
                                            onClick={() => handleViewResults(session.id)}
                                            className="px-3 py-1 bg-coral-500/20 hover:bg-coral-500/30 text-coral-300 text-sm rounded-lg transition-colors duration-200 flex items-center space-x-1"
                                        >
                                            <span>📊</span>
                                            <span>Results</span>
                                        </button>
                                    ) : (
                                        <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm rounded-lg">
                                            {session.status}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Session Stats */}
                            <div className="flex items-center justify-between text-xs text-white/60">
                                <div className="flex space-x-4">
                                    <span>👥 {session.total_voters || 0} votes</span>
                                    <span>🎮 {session.games_count || 0} games</span>
                                    {session.participation_rate && (
                                        <span>📊 {Math.round(session.participation_rate)}% participated</span>
                                    )}
                                </div>
                            </div>

                            {/* Winner Info */}
                            {winner && (
                                <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-green-300 font-medium">
                                            🏆 Winner: {winner.name}
                                        </span>
                                        <span className="text-green-400 text-xs">
                                            {winner.points} pts • {winner.votes} votes
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Active Session Info */}
                            {isActive && (
                                <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <div className="text-blue-300 text-sm flex items-center space-x-2">
                                        <span className="animate-pulse">🔴</span>
                                        <span>Live voting session - Click to participate!</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* View All Sessions Link */}
            {sessions.length === 5 && (
                <div className="mt-4 text-center">
                    <button
                        onClick={() => navigate(`/groups/${groupId}/sessions`)}
                        className="text-coral-400 hover:text-coral-300 text-sm transition-colors duration-200 hover:underline"
                    >
                        View all sessions →
                    </button>
                </div>
            )}

            {/* Quick Stats */}
            <div className="mt-4 pt-3 border-t border-white/10">
                <div className="grid grid-cols-3 gap-4 text-center text-xs text-white/60">
                    <div>
                        <div className="text-white font-bold">
                            {sessions.filter(s => s.status === 'completed').length}
                        </div>
                        <div>Completed</div>
                    </div>
                    <div>
                        <div className="text-blue-400 font-bold">
                            {sessions.filter(s => s.status === 'voting').length}
                        </div>
                        <div>Active</div>
                    </div>
                    <div>
                        <div className="text-coral-400 font-bold">
                            {sessions.reduce((sum, s) => sum + (s.total_voters || 0), 0)}
                        </div>
                        <div>Total Votes</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VotingReminders;