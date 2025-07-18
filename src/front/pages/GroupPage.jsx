// src/front/pages/GroupPage.jsx - FIXED VERSION with correct context import

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer'; // 🔧 FIX 4: Use this instead of AuthContext
import authService from '../store/authService';

const PageLoadingState = ({ message }) => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 flex items-center justify-center">
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/70">{message}</p>
        </div>
    </div>
);

const NetworkErrorState = ({ error, onRetry, onRefresh, helpText }) => (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-white mb-4">Error Loading Group</h3>
        <p className="text-red-300 mb-4">{error}</p>
        {helpText && <p className="text-white/60 text-sm mb-6">{helpText}</p>}
        <div className="flex gap-3 justify-center">
            <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
                Try Again
            </button>
            <button
                onClick={onRefresh}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-lg transition-colors"
            >
                Refresh Page
            </button>
        </div>
    </div>
);

const GroupPage = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    
    // 🔧 FIX 4: Use global state instead of broken AuthContext
    const { store } = useGlobalReducer();
    const user = store.user;
    const token = authService.getAccessToken();

    const [group, setGroup] = useState(null);
    const [games, setGames] = useState([]);
    const [members, setMembers] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [myVote, setMyVote] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // Validate authentication and group ID
    useEffect(() => {
        if (!user || !token) {
            console.error('❌ GroupPage: User not authenticated');
            navigate('/login');
            return;
        }

        if (!groupId || isNaN(parseInt(groupId))) {
            console.error('❌ GroupPage: Invalid group ID');
            setError('Invalid group ID');
            setLoading(false);
            return;
        }

        console.log('🏗️ GroupPage: Initializing for group', groupId, 'user', user.username);
        initializeGroupPage();
    }, [groupId, user, token, navigate]);

    // Initialize group page data
    const initializeGroupPage = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch group details
            await Promise.all([
                fetchGroupDetails(),
                fetchGroupMembers(),
                fetchCommonGames(),
                checkActiveSession()
            ]);
        } catch (err) {
            console.error('❌ GroupPage initialization failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch group details
    const fetchGroupDetails = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}`
            );

            if (response.ok) {
                const data = await response.json();
                setGroup(data.group);
                console.log('✅ Group details loaded:', data.group.name);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load group');
            }
        } catch (error) {
            console.error('❌ Failed to fetch group details:', error);
            throw error;
        }
    };

    // Fetch group members
    const fetchGroupMembers = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}/members`
            );

            if (response.ok) {
                const data = await response.json();
                setMembers(data.members || []);
                console.log('✅ Group members loaded:', data.members?.length || 0);
            } else {
                console.warn('⚠️ Failed to load group members');
                setMembers([]);
            }
        } catch (error) {
            console.warn('⚠️ Failed to fetch group members:', error);
            setMembers([]);
        }
    };

    // Fetch common games
    const fetchCommonGames = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}/common-games`
            );

            if (response.ok) {
                const data = await response.json();
                setGames(data.games || []);
                console.log('✅ Common games loaded:', data.games?.length || 0);
            } else {
                console.warn('⚠️ Failed to load common games');
                setGames([]);
            }
        } catch (error) {
            console.warn('⚠️ Failed to fetch common games:', error);
            setGames([]);
        }
    };

    // Check for active voting session
    const checkActiveSession = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}/active-session`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.session) {
                    setActiveSession(data.session);
                    setSessionId(data.session.id);
                    console.log('✅ Active session found:', data.session.session_name);
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to check active session:', error);
        }
    };

    // Handle voting
    const handleVote = async (gameId) => {
        if (!sessionId || myVote !== null) {
            console.warn('⚠️ Cannot vote: no session or already voted');
            return;
        }

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/sessions/${sessionId}/vote`,
                {
                    method: 'POST',
                    body: JSON.stringify({ game_id: gameId })
                }
            );

            if (response.ok) {
                const data = await response.json();
                setMyVote(gameId);
                console.log('✅ Vote submitted for game:', gameId);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to vote');
            }
        } catch (error) {
            console.error('❌ Vote submission failed:', error);
            setError(`Failed to vote: ${error.message}`);
        }
    };

    // Start new voting session
    const startVotingSession = async () => {
        try {
            const sessionName = prompt('Enter a name for this voting session:');
            if (!sessionName) return;

            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}/start-vote`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        session_name: sessionName.trim(),
                        voting_type: 'ranked_choice'
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                setActiveSession(data.session);
                setSessionId(data.session.id);
                console.log('✅ Voting session started:', data.session.session_name);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start voting session');
            }
        } catch (error) {
            console.error('❌ Failed to start voting session:', error);
            setError(`Failed to start session: ${error.message}`);
        }
    };

    // Check if all members have voted
    const allVoted = members.length > 0 && members.every(member => member.has_voted);
    const isCreator = group?.creator?.id === user?.id;

    if (loading) {
        return <PageLoadingState message="Loading group details..." />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4">
                <div className="max-w-4xl mx-auto">
                    <NetworkErrorState 
                        error={error}
                        onRetry={() => {
                            setError(null);
                            initializeGroupPage();
                        }}
                        onRefresh={() => window.location.reload()}
                        helpText="Make sure you have permission to view this group."
                    />
                </div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-4">Group Not Found</h2>
                        <p className="text-white/70 mb-6">This group may have been deleted or you don't have access.</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-6xl mx-auto">
                
                {/* Group Header */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">{group.name}</h1>
                            <p className="text-white/70">
                                Created by {group.creator?.username || 'Unknown'} • {members.length} members
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl transition-colors duration-200"
                        >
                            ← Back
                        </button>
                    </div>

                    {group.description && (
                        <p className="text-white/80 mb-6">{group.description}</p>
                    )}

                    {/* Group Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-cyan-400">{members.length}</div>
                            <div className="text-white/60 text-sm">Members</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-green-400">{games.length}</div>
                            <div className="text-white/60 text-sm">Common Games</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-purple-400">
                                {members.filter(m => m.is_online).length}
                            </div>
                            <div className="text-white/60 text-sm">Online Now</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Voting Section */}
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Group Voting</h2>
                            {isCreator && !activeSession && (
                                <button
                                    onClick={startVotingSession}
                                    className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                                >
                                    Start Vote
                                </button>
                            )}
                        </div>

                        {activeSession ? (
                            <div>
                                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 mb-6">
                                    <h3 className="text-lg font-semibold text-blue-200 mb-2">
                                        Active Session: {activeSession.session_name}
                                    </h3>
                                    <p className="text-blue-100 text-sm">
                                        {myVote ? 'You have voted! Waiting for others...' : 'Click on a game below to vote!'}
                                    </p>
                                </div>

                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {games.map(game => (
                                        <div
                                            key={game.id}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                                myVote === game.id
                                                    ? 'border-green-500 bg-green-500/20'
                                                    : myVote
                                                    ? 'border-gray-500/30 bg-gray-500/10 opacity-50 cursor-not-allowed'
                                                    : 'border-white/20 bg-white/5 hover:border-coral-500/50 hover:bg-coral-500/10'
                                            }`}
                                            onClick={() => !myVote && handleVote(game.id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <h4 className="text-white font-semibold">{game.name}</h4>
                                                    <p className="text-white/60 text-sm">
                                                        {game.ownership_stats?.owners || 0} members own this
                                                    </p>
                                                </div>
                                                {myVote === game.id && (
                                                    <div className="text-green-400 font-bold">✓ Voted</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {allVoted && (
                                    <div className="mt-6 text-center">
                                        <button
                                            onClick={() => navigate(`/results/${sessionId}`)}
                                            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors duration-200"
                                        >
                                            View Results 🎉
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-4">🗳️</div>
                                <h3 className="text-xl font-bold text-white mb-2">No Active Voting Session</h3>
                                <p className="text-white/70 mb-6">
                                    {isCreator 
                                        ? 'Start a voting session to let members choose what to play!' 
                                        : 'Waiting for the group creator to start a voting session.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Members Section */}
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-6">Group Members</h2>
                        
                        {members.length > 0 ? (
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {members.map(member => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors duration-200"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-3 h-3 rounded-full ${
                                                member.is_online ? 'bg-green-400' : 'bg-gray-400'
                                            }`}></div>
                                            <div>
                                                <div className="text-white font-medium">
                                                    {member.username}
                                                    {member.id === group.creator?.id && (
                                                        <span className="ml-2 text-yellow-400">👑</span>
                                                    )}
                                                    {member.id === user.id && (
                                                        <span className="ml-2 text-blue-400">(You)</span>
                                                    )}
                                                </div>
                                                <div className="text-white/60 text-sm">
                                                    {member.steam_connected ? '🎮 Steam Connected' : '⚠️ Steam Disconnected'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right">
                                            <div className={`text-sm ${
                                                member.is_online ? 'text-green-400' : 'text-gray-400'
                                            }`}>
                                                {member.is_online ? 'Online' : 'Offline'}
                                            </div>
                                            {activeSession && (
                                                <div className={`text-xs ${
                                                    member.has_voted ? 'text-green-400' : 'text-yellow-400'
                                                }`}>
                                                    {member.has_voted ? 'Voted ✓' : 'Pending...'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-4">👥</div>
                                <h3 className="text-xl font-bold text-white mb-2">No Members Found</h3>
                                <p className="text-white/70">
                                    Invite friends to join your group!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupPage;