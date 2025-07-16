// src/front/pages/Dashboard.jsx - FIXED to prevent infinite auth checking

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import toast from 'react-hot-toast';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupActionButtons from '../components/GroupActionButtons';

export const Dashboard = () => {
    const navigate = useNavigate();
    const { store } = useGlobalReducer();

    // CRITICAL FIX: Use refs to track initialization and prevent multiple effect runs
    const initializationRef = useRef(false);
    const dataLoadedRef = useRef(false);

    const [dashboardData, setDashboardData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [groups, setGroups] = useState([]);
    const [commonGames, setCommonGames] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('overview');
    const [recentActivity, setRecentActivity] = useState([]);
    const [groupFilter, setGroupFilter] = useState('all');

    // FIXED: Destructure with defaults to prevent undefined access
    const {
        isAuthenticated = false,
        user = null,
        authLoading = false
    } = store || {};

    // CRITICAL FIX: Single effect for URL parameter handling (runs once)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('steam_connected') === 'true') {
            toast.success('Steam account connected successfully!');
            window.history.replaceState({}, document.title, window.location.pathname);
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
    }, []); // Empty dependency - only runs once

    // CRITICAL FIX: Single effect for data loading with proper conditions
    useEffect(() => {
        // Prevent multiple initializations
        if (initializationRef.current) {
            console.log('🔄 Dashboard: Already initialized, skipping...');
            return;
        }

        // Only proceed if user is properly authenticated and not loading
        if (!isAuthenticated || !user || authLoading) {
            console.log('🔄 Dashboard: Waiting for auth completion...', {
                isAuthenticated,
                hasUser: !!user,
                authLoading
            });
            return;
        }

        // Mark as initialized to prevent re-runs
        initializationRef.current = true;
        console.log('🔄 Dashboard: Starting data load for user:', user.username);

        loadDashboardData();
    }, [isAuthenticated, user?.id, authLoading]); // FIXED: Only depend on stable auth values

    const loadDashboardData = async () => {
        // Prevent duplicate data loading
        if (dataLoadedRef.current) {
            console.log('🔄 Dashboard: Data already loaded, skipping...');
            return;
        }

        dataLoadedRef.current = true;
        setIsLoadingData(true);

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            console.log('📡 Fetching groups from:', `${backendUrl}/api/gaming/groups`);
            
            const groupsResponse = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups`);
            
            if (groupsResponse.ok) {
                const groupsData = await groupsResponse.json();
                setGroups(groupsData.groups || []);
                
                // Fetch common games if we have groups
                if (groupsData.groups?.length > 0) {
                    await fetchCommonGames(groupsData.groups);
                }
            } else {
                const errorData = await groupsResponse.json();
                console.error('Groups fetch error:', errorData);
                toast.error(`Failed to load groups: ${errorData.error || 'Unknown error'}`);
                
                if (groupsResponse.status === 401) {
                    console.log('🚨 Auth error in dashboard, clearing auth and redirecting...');
                    authService.logout();
                    navigate('/login');
                    return;
                }
            }
            
            // Set enhanced dashboard stats
            const enhancedData = { 
                stats: { 
                    totalSessions: groups.length > 0 ? Math.floor(Math.random() * 20) + 5 : 0,
                    totalVotes: groups.length > 0 ? Math.floor(Math.random() * 50) + 10 : 0,
                    favoriteGame: user?.steam_connected ? 'Valorant' : 'Connect Steam to see stats',
                    winRate: groups.length > 0 ? Math.floor(Math.random() * 40) + 60 : 0
                }
            };
            setDashboardData(enhancedData);
            
            // Mock recent activity
            setRecentActivity([
                { id: 1, type: 'group_join', message: 'Joined "Weekend Warriors"', time: '2 hours ago', icon: '👥' },
                { id: 2, type: 'game_vote', message: 'Voted for Valorant in squad session', time: '1 day ago', icon: '🗳️' },
                { id: 3, type: 'steam_sync', message: 'Steam library synced', time: '2 days ago', icon: '🔄' }
            ]);
            
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            toast.error("Could not load your dashboard data.");
            
            // Only logout on specific auth errors, not network errors
            if (error.message === 'Authentication failed' || error.message.includes('401')) {
                console.log('🚨 Auth error in dashboard, clearing auth and redirecting...');
                authService.logout();
                navigate('/login');
            }
        } finally {
            setIsLoadingData(false);
        }
    };

    const fetchCommonGames = async (userGroups = groups) => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            // Get all unique Steam-connected members from all groups
            const allMembers = userGroups.flatMap(g => g.members?.filter(m => m.steam_connected) || []);
            const uniqueUserIds = [...new Set([user.id, ...allMembers.map(m => m.id)])];
            
            if (uniqueUserIds.length < 2) {
                setCommonGames([]);
                return;
            }
            
            const response = await authService.authenticatedFetch(`${backendUrl}/api/steam/common-games`, {
                method: 'POST',
                body: JSON.stringify({ user_ids: uniqueUserIds })
            });
            
            if (response.ok) {
                const data = await response.json();
                setCommonGames(data.games?.slice(0, 6) || []); // Limit to 6 for dashboard
            }
        } catch (error) {
            console.error('Error fetching common games:', error);
            // Don't show toast for this as it's a background operation
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
                
                // Refresh common games
                await fetchCommonGames([...groups, data.group]);
            } else {
                const errorData = await response.json();
                toast.error(`Error: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error("A network error occurred.");
        }
    };

    const handleGroupUpdate = (action, wasDeleted, groupId) => {
        console.log('🔄 Group update received:', { action, wasDeleted, groupId });
        
        if (wasDeleted || action === 'deleted') {
            // Remove the group from state completely
            setGroups(prevGroups => {
                const updatedGroups = prevGroups.filter(g => g.id !== groupId);
                console.log('🗑️ Group removed from state. Remaining groups:', updatedGroups.length);
                return updatedGroups;
            });
            
            // Refresh common games after group removal
            fetchCommonGames();
        } else if (action === 'left') {
            console.log('👋 Member left, refreshing dashboard data...');
            // Reset the data loaded flag and reload
            dataLoadedRef.current = false;
            loadDashboardData();
        }
    };

    const copyInviteLink = async (inviteCode) => {
        const frontendUrl = window.location.origin;
        const shareLink = `${frontendUrl}/join/${inviteCode}`;
        
        try {
            await navigator.clipboard.writeText(shareLink);
            toast.success('Invite link copied to clipboard!');
        } catch (err) {
            console.error("Failed to copy link:", err);
            toast.error("Could not copy the link.");
        }
    };

    const navigateToProfile = () => navigate('/profile');

    const getFilteredGroups = () => {
        switch (groupFilter) {
            case 'creator':
                return groups.filter(g => g.creator?.id === user.id);
            case 'member':
                return groups.filter(g => g.creator?.id !== user.id);
            default:
                return groups;
        }
    };

    // FIXED: Better loading state detection
    const shouldShowLoading = authLoading || isLoadingData || !dashboardData || !initializationRef.current;
    
    if (shouldShowLoading) { 
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/70">Loading your dashboard...</p>
                </div>
            </div>
        );
    }
    
    // FIXED: Better authentication check
    if (!isAuthenticated || !user) { 
        console.log('🚨 Dashboard: Not authenticated, redirecting to login');
        navigate('/login');
        return null;
    }

    const { stats } = dashboardData;
    const filteredGroups = getFilteredGroups();

    // Rest of the component JSX remains the same...
    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
                <div className="max-w-7xl mx-auto relative z-10">
                    
                    {/* Enhanced Welcome Section */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                                    Welcome back, {user.username}! 👋
                                </h1>
                                <p className="text-white/70 text-lg">
                                    Ready to squad up and find your next gaming session?
                                </p>
                            </div>
                            <div className="mt-4 md:mt-0 flex space-x-3">
                                <Link 
                                    to="/sessions" 
                                    className="px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
                                >
                                    🎯 Find Games
                                </Link>
                                <button 
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-6 py-3 bg-marine-500 hover:bg-marine-600 text-white font-semibold rounded-xl transition-colors duration-200"
                                >
                                    + Create Group
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300 group">
                            <div className="text-3xl font-bold text-coral-400 mb-2 group-hover:scale-110 transition-transform duration-300">{filteredGroups.length}</div>
                            <div className="text-white/70 text-sm">Groups Joined</div>
                            <div className="mt-2 text-xs text-white/50">
                                {groups.filter(g => g.creator?.id === user.id).length} created by you
                            </div>
                        </div>
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300 group">
                            <div className="text-3xl font-bold text-marine-400 mb-2 group-hover:scale-110 transition-transform duration-300">{user.total_games || 0}</div>
                            <div className="text-white/70 text-sm">Games Library</div>
                            <div className="mt-2 text-xs text-white/50">
                                {user.steam_connected ? 'Steam connected' : 'Connect Steam for more'}
                            </div>
                        </div>
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300 group">
                            <div className="text-3xl font-bold text-green-400 mb-2 group-hover:scale-110 transition-transform duration-300">{commonGames.length}</div>
                            <div className="text-white/70 text-sm">Common Games</div>
                            <div className="mt-2 text-xs text-white/50">
                                With your squads
                            </div>
                        </div>
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300 group">
                            <div className="text-3xl font-bold text-purple-400 mb-2 group-hover:scale-110 transition-transform duration-300">
                                {user.steam_connected ? '✅' : '❌'}
                            </div>
                            <div className="text-white/70 text-sm">Steam Status</div>
                            <div className="mt-2 text-xs text-white/50">
                                {user.steam_connected ? 'Connected' : 'Not connected'}
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="mb-8">
                        <div className="flex space-x-1 bg-white/5 p-1 rounded-xl w-fit">
                            {[
                                { id: 'overview', label: 'Overview', icon: '📊' },
                                { id: 'groups', label: 'My Groups', icon: '👥' },
                                { id: 'games', label: 'Common Games', icon: '🎮' },
                                { id: 'activity', label: 'Recent Activity', icon: '⚡' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSection(tab.id)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                                        activeSection === tab.id
                                            ? 'bg-coral-500 text-white shadow-lg'
                                            : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Content Based on Active Section */}
                    {activeSection === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Quick Stats */}
                            <div className="lg:col-span-2">
                                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                                    <h2 className="text-2xl font-bold text-white mb-6">Gaming Overview</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                                <span className="text-white/80">Sessions Played</span>
                                                <span className="text-coral-400 font-bold">{stats.totalSessions}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                                <span className="text-white/80">Games Voted On</span>
                                                <span className="text-marine-400 font-bold">{stats.totalVotes}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                                <span className="text-white/80">Favorite Game</span>
                                                <span className="text-green-400 font-bold text-sm">{stats.favoriteGame}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                                <span className="text-white/80">Win Rate</span>
                                                <span className="text-purple-400 font-bold">{stats.winRate}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="space-y-6">
                                {/* Steam Integration Status */}
                                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                                        <span className="text-2xl mr-2">🎮</span>
                                        Steam Integration
                                    </h3>
                                    
                                    {user.steam_connected ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                                <span className="text-white">Connected as {user.steam_username}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-center">
                                                <div>
                                                    <div className="text-2xl font-bold text-marine-400">{user.total_games || 0}</div>
                                                    <div className="text-white/60 text-sm">Games</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-coral-400">
                                                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                                    </div>
                                                    <div className="text-white/60 text-sm">Last Sync</div>
                                                </div>
                                            </div>
                                            <div className="flex space-x-3">
                                                <Link 
                                                    to="/game-library"
                                                    className="flex-1 px-4 py-2 bg-marine-500 hover:bg-marine-600 text-white font-medium rounded-lg text-center transition-colors"
                                                >
                                                    View Library
                                                </Link>
                                                <button 
                                                    onClick={navigateToProfile}
                                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                                                >
                                                    Manage
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="text-4xl mb-4">🔗</div>
                                            <p className="text-white/70 mb-4">Connect your Steam account to sync your game library and find common games with friends.</p>
                                            <button 
                                                onClick={navigateToProfile}
                                                className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                                            >
                                                Connect Steam
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Actions */}
                                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                                        <span className="text-2xl mr-2">⚡</span>
                                        Quick Actions
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        <Link 
                                            to="/sessions"
                                            className="block w-full px-4 py-3 bg-marine-500/20 hover:bg-marine-500/30 border border-marine-500/30 text-marine-300 rounded-xl transition-all duration-300 text-center font-medium"
                                        >
                                            🎯 Find Games to Play
                                        </Link>
                                        
                                        <Link 
                                            to="/game-library"
                                            className="block w-full px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-xl transition-all duration-300 text-center font-medium"
                                        >
                                            📚 Browse Game Library
                                        </Link>
                                        
                                        <Link 
                                            to="/friends"
                                            className="block w-full px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 rounded-xl transition-all duration-300 text-center font-medium"
                                        >
                                            👥 Manage Friends
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'groups' && (
                        <div className="space-y-8">
                            {/* Group Filter */}
                            <div className="flex items-center justify-between">
                                <div className="flex space-x-1 bg-white/5 p-1 rounded-xl">
                                    {[
                                        { id: 'all', label: 'All Groups' },
                                        { id: 'creator', label: 'Created by Me' },
                                        { id: 'member', label: 'Member Of' }
                                    ].map(filter => (
                                        <button
                                            key={filter.id}
                                            onClick={() => setGroupFilter(filter.id)}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                                groupFilter === filter.id
                                                    ? 'bg-marine-500 text-white'
                                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                                >
                                    + Create New Group
                                </button>
                            </div>

                            {/* Groups Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredGroups.length > 0 ? (
                                    filteredGroups.map((group) => {
                                        const isCreator = group.creator?.id === user.id;
                                        
                                        return (
                                            <div 
                                                key={group.id} 
                                                className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden shadow-2xl hover:bg-white/15 transition-all duration-300 group"
                                            >
                                                {/* Group Header */}
                                                <div className="p-6 border-b border-white/10">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h3 className="font-bold text-white text-lg group-hover:text-coral-300 transition-colors">
                                                            {group.name}
                                                        </h3>
                                                        {isCreator && (
                                                            <span className="px-2 py-1 bg-coral-500/20 text-coral-300 rounded-full text-xs font-medium">
                                                                Creator
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between text-sm text-white/60 mb-4">
                                                        <span>{group.current_members} / {group.max_members} members</span>
                                                        <span className="flex items-center space-x-1">
                                                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                                            <span>Active</span>
                                                        </span>
                                                    </div>

                                                    {group.description && (
                                                        <p className="text-white/70 text-sm mb-4 line-clamp-2">
                                                            {group.description}
                                                        </p>
                                                    )}

                                                    {/* Member Progress Bar */}
                                                    <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                                                        <div 
                                                            className="bg-coral-500 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${(group.current_members / group.max_members) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {/* Group Actions */}
                                                <div className="p-4 space-y-3">
                                                    <Link 
                                                        to={`/groups/${group.id}`}
                                                        className="block w-full px-4 py-2 bg-marine-500/20 hover:bg-marine-500/30 border border-marine-500/30 text-marine-300 rounded-lg text-center transition-colors font-medium"
                                                    >
                                                        View Group
                                                    </Link>
                                                    
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => copyInviteLink(group.invite_code)}
                                                            className="flex-1 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors flex items-center justify-center space-x-1"
                                                            title="Copy invite link"
                                                        >
                                                            <span>🔗</span>
                                                            <span>Invite</span>
                                                        </button>
                                                        
                                                        <GroupActionButtons 
                                                            group={group} 
                                                            user={user} 
                                                            onGroupUpdate={(action, wasDeleted) => handleGroupUpdate(action, wasDeleted, group.id)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-12 text-center">
                                        <div className="text-6xl mb-4">👥</div>
                                        <h3 className="text-2xl font-bold text-white mb-4">
                                            {groupFilter === 'all' ? 'No Groups Yet' : 
                                             groupFilter === 'creator' ? 'No Groups Created' : 'Not a Member of Any Groups'}
                                        </h3>
                                        <p className="text-white/60 mb-6">
                                            {groupFilter === 'all' ? 'Create or join a group to start finding games with friends!' :
                                             groupFilter === 'creator' ? 'Create your first group to start building your squad!' :
                                             'Join some groups to start gaming with others!'}
                                        </p>
                                        <button 
                                            onClick={() => setIsModalOpen(true)}
                                            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                                        >
                                            Create Your First Group
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'games' && (
                        <div className="space-y-8">
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                                <h2 className="text-2xl font-bold text-white mb-6">Common Games with Your Squad</h2>
                                
                                {commonGames.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {commonGames.map(game => (
                                            <div key={game.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 group">
                                                <div className="relative">
                                                    <img 
                                                        src={game.header_image} 
                                                        alt={game.name}
                                                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                                                        onError={(e) => {
                                                            e.target.src = `https://via.placeholder.com/460x215/0066cc/ffffff?text=${encodeURIComponent(game.name.slice(0, 10))}`;
                                                        }}
                                                    />
                                                    <div className="absolute top-2 right-2 bg-green-500/80 text-white px-2 py-1 rounded-lg text-xs font-medium">
                                                        {game.ownership_stats?.coverage_percentage || 0}% owned
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <h3 className="font-bold text-white mb-2 group-hover:text-coral-300 transition-colors">
                                                        {game.name}
                                                    </h3>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-white/60">
                                                            {game.ownership_stats?.owners || 0} players own this
                                                        </span>
                                                        {game.multiplayer && (
                                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                                                                Multiplayer
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="text-6xl mb-4">🎮</div>
                                        <h3 className="text-xl font-bold text-white mb-2">No Common Games Found</h3>
                                        <p className="text-white/70 mb-6">
                                            {user.steam_connected ? 
                                                'Join groups or invite friends to find games you can play together!' :
                                                'Connect your Steam account to see games you can play with your squad!'
                                            }
                                        </p>
                                        {!user.steam_connected && (
                                            <button 
                                                onClick={navigateToProfile}
                                                className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                                            >
                                                Connect Steam
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'activity' && (
                        <div className="space-y-8">
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                                <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
                                
                                {recentActivity.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentActivity.map(activity => (
                                            <div key={activity.id} className="flex items-center space-x-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300">
                                                <div className="w-10 h-10 bg-coral-500/20 rounded-full flex items-center justify-center">
                                                    <span className="text-lg">{activity.icon}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white font-medium">{activity.message}</p>
                                                    <p className="text-white/60 text-sm">{activity.time}</p>
                                                </div>
                                                <div className="w-2 h-2 bg-coral-400 rounded-full"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="text-6xl mb-4">📱</div>
                                        <h3 className="text-xl font-bold text-white mb-2">No Recent Activity</h3>
                                        <p className="text-white/70">
                                            Start gaming with your squad to see activity here!
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Global Quick Actions Bar */}
                    <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-50">
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="w-14 h-14 bg-coral-500 hover:bg-coral-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
                            title="Create new group"
                        >
                            <span className="text-xl">+</span>
                        </button>
                        
                        <Link 
                            to="/sessions"
                            className="w-14 h-14 bg-marine-500 hover:bg-marine-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
                            title="Find games to play"
                        >
                            <span className="text-xl">🎯</span>
                        </Link>
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