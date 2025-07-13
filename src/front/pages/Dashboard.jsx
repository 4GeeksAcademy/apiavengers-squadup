import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';

import toast from 'react-hot-toast';
import CreateGroupModal from '../components/CreateGroupModal';

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
            const mockData = { stats: { totalSessions: 12, totalVotes: 47, favoriteGame: 'Valorant', winRate: 73 }};
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

    const shouldShowLoading = authLoading || isLoadingData || !dashboardData;
    if (shouldShowLoading) { return <div>Loading...</div>; }
    if (!isAuthenticated || !user) { return <div>Error...</div>; }

    const { stats } = dashboardData;

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="mb-8">{/*...Welcome Section...*/}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">{/*...Stats Grid...*/}</div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                                    <div className="text-center py-8">{/*...Empty State...*/}</div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-6">{/*...Sidebar Actions...*/}</div>
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