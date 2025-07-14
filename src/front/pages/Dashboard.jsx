import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';

import toast from 'react-hot-toast';
import CreateGroupModal from '../components/CreateGroupModal';
import ConnectSteamButton from '../components/ConnectSteamButton';

export const Dashboard = () => {
    const navigate = useNavigate();
    const { store } = useGlobalReducer();

    const [dashboardData, setDashboardData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [groups, setGroups] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const {
        isAuthenticated = false,
        user = null,
        authLoading = false
    } = store || {};

    useEffect(() => {
        if (isAuthenticated && user) {
            loadDashboardData();
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('steam_connected') === 'true') {
            toast.success('Steam account connected successfully!');
            window.history.replaceState({}, document.title, window.location.pathname);
            loadDashboardData();
        } else if (urlParams.get('steam_error')) {
            const error = urlParams.get('steam_error');
            const errorMessages = {
                'auth_failed': 'Steam authentication failed. Please try again.',
                'connection_failed': 'Failed to connect Steam account.',
                'invalid_id': 'Invalid Steam ID received.',
                'server_error': 'Server error occurred. Please try again later.',
                'no_user': 'Authentication session expired. Please try again.'
            };
            toast.error(errorMessages[error] || 'An unknown Steam connection error occurred.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const loadDashboardData = async () => {
        setIsLoadingData(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            console.log('Fetching groups from:', `${backendUrl}/api/gaming/groups`);
            const groupsResponse = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups`);
            if (groupsResponse.ok) {
                const groupsData = await groupsResponse.json();
                setGroups(groupsData.groups || []);
            } else {
                const errorData = await groupsResponse.json();
                console.error('Groups fetch error:', errorData);
                toast.error(`Failed to load groups: ${errorData.error || 'Unknown error'}`);
                if (groupsResponse.status === 401) {
                    toast.error('Session expired. Please log in again.');
                    authService.logout();
                    navigate('/login');
                }
            }
            // Replace mock data with actual API if available
            const mockData = {
                stats: {
                    totalSessions: 12,
                    totalVotes: 47,
                    favoriteGame: 'Valorant',
                    winRate: 73
                },
                recentSessions: [
                    {
                        id: 1,
                        gameName: 'Valorant',
                        participants: ['You', 'Player2', 'Player3'],
                        winner: 'Valorant',
                        date: '2024-01-15',
                        status: 'completed'
                    },
                    {
                        id: 2,
                        gameName: 'Apex Legends',
                        participants: ['You', 'GamerTag1'],
                        winner: 'Apex Legends',
                        date: '2024-01-14',
                        status: 'completed'
                    },
                    {
                        id: 3,
                        gameName: 'CS2',
                        participants: ['You', 'Friend1', 'Friend2', 'Friend3'],
                        winner: 'Pending',
                        date: '2024-01-16',
                        status: 'active'
                    }
                ]
            };
            setDashboardData(mockData);
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            toast.error("Could not load your dashboard data.");
            if (error.message === 'Authentication failed' || error.message.includes('401')) {
                toast.error('Session expired. Please log in again.');
                authService.logout();
                navigate('/login');
            }
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleCreateGroup = async (groupName) => {
        const loadingToast = toast.loading("Creating group...");
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups`, {
                method: 'POST',
                body: JSON.stringify({ name: groupName })
            });

            toast.dismiss(loadingToast);

            if (response.ok) {
                const data = await response.json();
                setGroups(prevGroups => [...prevGroups, data.group]);
                toast.success(`Group "${data.group.name}" created!`);
                setIsModalOpen(false);
            } else {
                const errorData = await response.json();
                toast.error(`Error: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error("A network error occurred.");
        }
    };

    const handleSteamConnect = () => {
        // Implementation for Steam connect
    };

    const navigateToProfile = () => navigate('/profile');
    const toSessions = () => navigate('/sessions');
    const createNewSession = () => navigate('/sessions/create');

    const shouldShowLoading = authLoading || isLoadingData || !dashboardData;
    if (shouldShowLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-white/70">Loading your dashboard...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                            <p className="text-white/70">Please log in to view your dashboard.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const { stats, recentSessions } = dashboardData;

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
                {/* Floating Particles Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${2 + Math.random() * 3}s`
                            }}
                        />
                    ))}
                </div>

                <div className="max-w-6xl mx-auto relative z-10">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-white mb-2">Welcome back, {user.username}!</h1>
                        <p className="text-white/70">Ready to squad up and dominate the competition?</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                        {/* Total Sessions */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Total Sessions</p>
                                    <p className="text-3xl font-bold text-white mt-1">{stats.totalSessions}</p>
                                </div>
                                <div className="w-12 h-12 bg-coral-500/20 rounded-xl flex items-center justify-center">
                                    <span className="text-2xl">🎮</span>
                                </div>
                            </div>
                        </div>

                        {/* Total Votes */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Total Votes</p>
                                    <p className="text-3xl font-bold text-white mt-1">{stats.totalVotes}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                    <span className="text-2xl">🗳️</span>
                                </div>
                            </div>
                        </div>

                        {/* Win Rate */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Win Rate</p>
                                    <p className="text-3xl font-bold text-white mt-1">{stats.winRate}%</p>
                                </div>
                                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                    <span className="text-2xl">🏆</span>
                                </div>
                            </div>
                        </div>

                        {/* Favorite Game */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Favorite Game</p>
                                    <p className="text-xl font-bold text-white mt-1">{stats.favoriteGame}</p>
                                </div>
                                <div className="w-12 h-12 bg-lavender-500/20 rounded-xl flex items-center justify-center">
                                    <span className="text-2xl">⭐</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Recent Sessions */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">Recent Sessions</h2>
                                <button
                                    onClick={toSessions}
                                    className="text-coral-400 hover:text-coral-300 font-medium text-sm transition-colors duration-200"
                                >
                                    View All →
                                </button>
                            </div>

                            <div className="space-y-4">
                                {recentSessions.map((session) => (
                                    <div key={session.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-white">{session.gameName}</h3>
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${session.status === 'completed'
                                                    ? 'bg-green-500/20 text-green-300'
                                                    : 'bg-yellow-500/20 text-yellow-300'
                                                }`}>
                                                {session.status === 'completed' ? 'Completed' : 'Active'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-white/70">
                                            <span>{session.participants.length} players</span>
                                            <span>{session.date}</span>
                                        </div>
                                        {session.status === 'completed' && (
                                            <div className="mt-2 text-sm">
                                                <span className="text-green-300">Winner: {session.winner}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {recentSessions.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl">🎮</span>
                                    </div>
                                    <p className="text-white/70 mb-4">No sessions yet</p>
                                    <button
                                        onClick={createNewSession}
                                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors duration-200"
                                    >
                                        Create Your First Session
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions & Steam Integration */}
                        <div className="space-y-6">

                            {/* Quick Actions */}
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-white">My Groups</h2>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                                    >
                                        + Create Group
                                    </button>
                                </div>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {groups.length > 0 ? (
                                        groups.map((group) => (
                                            <Link
                                                to={`/groups/${group.id}`}
                                                key={group.id}
                                                className="block bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold text-white">{group.name}</h3>
                                                    <span className="text-sm text-white/60">
                                                        {group.current_members} / {group.max_members} members
                                                    </span>
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">👥</span>
                                            </div>
                                            <p className="text-white/70 mb-4">No groups yet</p>
                                            <button
                                                onClick={() => setIsModalOpen(true)}
                                                className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors duration-200"
                                            >
                                                Create Your First Group
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Steam Integration */}
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                                <h2 className="text-2xl font-bold text-white mb-6">Steam Integration</h2>

                                {user?.is_steam_connected ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                                            <div className="w-10 h-10 bg-green-500/30 rounded-full flex items-center justify-center">
                                                <span className="text-lg">✅</span>
                                            </div>
                                            <div>
                                                <p className="text-green-300 font-medium">Steam Connected</p>
                                                <p className="text-green-300/70 text-sm">Your game library is synced</p>
                                            </div>
                                        </div>

                                        <button className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300">
                                            🔄 Sync Game Library
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="text-center py-4">
                                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">🎮</span>
                                            </div>
                                            <p className="text-white/70 mb-2">Connect your Steam account</p>
                                            <p className="text-white/50 text-sm">Access your game library and find sessions with games you own</p>
                                        </div>
                                        <div className="w-full">
                                            <ConnectSteamButton className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 
                                            hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-300 transform hover:-translate-y-1 shadow-lg 
                                            hover:shadow-blue-500/25 flex items-center justify-center space-x-2"/>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CreateGroupModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateGroup}
            />
        </>
    );
};