// src/front/pages/Dashboard.jsx - FIXED VERSION with all imports resolved

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import toast from 'react-hot-toast';

// Import enhanced components
import JoinGroupInput from '../components/JoinGroupInput';
import GroupActionButtons from '../components/GroupActionButtons';
import CreateGroupModal from '../components/CreateGroupModal';
import CommonGamesList from '../components/CommonGamesList';
import { PageLoadingState } from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const Dashboard = () => {
    // ✅ FIX: ALL hooks are declared at the top of the component function.
    const { store } = useGlobalReducer();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // ✅ FIX: User is retrieved AFTER all hooks have been declared.
    const user = store.user;

    useEffect(() => {
        // Fetch groups only when the user object is available.
        if (user && user.id) {
            fetchUserGroups();
        } else {
            // If there's no user, stop the loading indicator.
            setLoading(false);
        }
    }, [user]); // This effect runs whenever the user object changes.

    const fetchUserGroups = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups`);
            
            if (response.ok) {
                const data = await response.json();
                setGroups(data.groups || []);
                console.log('✅ Fetched user groups:', data.groups?.length || 0);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch groups');
            }
        } catch (err) {
            console.error('❌ Error fetching groups:', err);
            setError(err.message);
            // Also display a user-friendly toast notification
            toast.error("Could not load your groups.");
        } finally {
            setLoading(false);
        }
    };

    const handleGroupCreated = (newGroup) => {
        // Add the new group to the start of the list for immediate visibility.
        setGroups(prev => [newGroup, ...prev]);
        toast.success(`Group "${newGroup.name}" created successfully!`);
    };

    const handleGroupJoined = (joinedGroup) => {
        // Add the joined group to the list.
        setGroups(prev => [...prev, joinedGroup]);
        toast.success(`🎉 Welcome to "${joinedGroup.name}"!`);
    };

    const handleGroupUpdate = (action, isDeleted, data) => {
        console.log('🔄 Group update received in dashboard:', { action, isDeleted, data });
        if (isDeleted) {
            // Remove the group from the list by its ID.
            const groupIdToRemove = typeof data === 'object' ? data.id : data;
            setGroups(prev => prev.filter(g => g.id !== groupIdToRemove));
        } else if (action === 'refreshed' && typeof data === 'object') {
            // Update a specific group's data in the list.
            setGroups(prev => prev.map(g => g.id === data.id ? data : g));
        } else {
            // For other actions (like ownership transfer), a full refresh is safest.
            fetchUserGroups();
        }
    };

    // --- RENDER LOGIC ---

    // Initial loading state while checking auth and fetching data.
    if (loading && !user) {
        return <PageLoadingState message="Checking authentication..." />;
    }

    if (loading && groups.length === 0) {
        return <PageLoadingState message="Loading your gaming dashboard..." />;
    }

    // If there is no authenticated user after loading.
    if (!user) {
        return (
            <ErrorState 
                type="permission" 
                title="Authentication Required" 
                message="Please log in to view your dashboard." 
            />
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-6xl mx-auto">
                
                {/* Header Section */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        Gaming Dashboard
                    </h1>
                    <p className="text-white/70 text-lg">
                        Welcome back, {user.username}! Ready to find your next adventure?
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                        <div className="text-3xl font-bold text-cyan-400 mb-2">{groups.length}</div>
                        <div className="text-white/70">Gaming Groups</div>
                    </div>
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                        <div className="text-3xl font-bold text-purple-400 mb-2">
                            {user.steam_connected ? '✅' : '⚠️'}
                        </div>
                        <div className="text-white/70">Steam Status</div>
                    </div>
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                        <div className="text-3xl font-bold text-green-400 mb-2">
                            {user.total_games || 0}
                        </div>
                        <div className="text-white/70">Games in Library</div>
                    </div>
                </div>

                {/* Steam Connection Status */}
                {!user.steam_connected && (
                    <div className="mb-8 p-6 bg-orange-500/10 border border-orange-500/30 rounded-2xl">
                        <div className="flex items-center space-x-4">
                            <div className="text-4xl">🎮</div>
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-orange-300 mb-2">
                                    Connect Your Steam Account
                                </h3>
                                <p className="text-orange-200 mb-4">
                                    Link your Steam account to sync your game library and find common games with friends!
                                </p>
                                <Link 
                                    to="/profile"
                                    className="inline-flex px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors duration-200"
                                >
                                    Connect Steam Now
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <ErrorState 
                        type="api" 
                        onRetry={fetchUserGroups} 
                        error={{ message: error }} 
                    />
                )}

                {/* Your Gaming Groups */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center mb-4 sm:mb-0">
                            <span className="mr-3">👥</span>
                            Your Gaming Groups
                        </h2>
                        <div className="flex gap-3">
                           <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-5 py-2.5 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
                            >
                                <span>➕</span>
                                <span>Create Group</span>
                            </button>
                            <JoinGroupInput onGroupJoined={handleGroupJoined} />
                        </div>
                    </div>
                    
                    {groups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {groups.map(group => (
                                <div key={group.id} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 flex flex-col">
                                    <div className="flex-grow">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-semibold text-white truncate pr-2">{group.name}</h3>
                                            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm flex-shrink-0">
                                                {group.current_members || 0} members
                                            </span>
                                        </div>
                                        
                                        <p className="text-white/70 text-sm mb-4 min-h-[40px]">
                                            {group.description || "No description provided."}
                                        </p>
                                        
                                        <div className="flex items-center justify-between text-sm text-white/60 mb-4">
                                            <span>
                                                {group.creator?.id === user.id ? '👑 Your Group' : `Created by ${group.creator?.username || 'Unknown'}`}
                                            </span>
                                            <span>
                                                {group.is_public ? '🌐 Public' : '🔒 Private'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-auto">
                                        <Link 
                                            to={`/groups/${group.id}`}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
                                        >
                                            View Group
                                        </Link>
                                        
                                        <GroupActionButtons 
                                            group={group}
                                            user={user}
                                            onGroupUpdate={(action, deleted, data) => handleGroupUpdate(action, deleted, group.id)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">🕹️</div>
                            <h3 className="text-xl font-bold text-white mb-2">No Groups Yet</h3>
                            <p className="text-white/70">
                                Create a group to start finding games with your squad!
                            </p>
                        </div>
                    )}
                </div>

                {/* ✅ FIX: Safely render CommonGamesList only when groups exist. */}
                {groups.length > 0 && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8">
                         <h2 className="text-2xl font-bold text-white mb-6">Common Games in '{groups[0].name}'</h2>
                        <CommonGamesList groupId={groups[0].id} />
                    </div>
                )}

                {/* Quick Actions for when there are no groups */}
                {groups.length === 0 && !loading && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Link 
                                to="/find-games"
                                className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                            >
                                <span className="text-2xl">🎮</span>
                                <div>
                                    <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Find Games</h4>
                                    <p className="text-white/60 text-sm">Discover common games</p>
                                </div>
                            </Link>
                            
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                            >
                                <span className="text-2xl">➕</span>
                                <div>
                                    <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Create Group</h4>
                                    <p className="text-white/60 text-sm">Start a new squad</p>
                                </div>
                            </button>
                            
                            <Link 
                                to="/profile"
                                className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                            >
                                <span className="text-2xl">⚙️</span>
                                <div>
                                    <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Settings</h4>
                                    <p className="text-white/60 text-sm">Manage your profile</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Group Modal */}
            {isCreateModalOpen && (
                <CreateGroupModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={async (groupData) => {
                        try {
                            const backendUrl = import.meta.env.VITE_BACKEND_URL;
                            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups`, {
                                method: 'POST',
                                body: JSON.stringify(groupData)
                            });
                            
                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || 'Failed to create group');
                            }
                            
                            const data = await response.json();
                            handleGroupCreated(data.group);
                            setIsCreateModalOpen(false); // Close on success
                            return true;

                        } catch (error) {
                            console.error('❌ Error in group creation:', error);
                            toast.error(error.message);
                            return false; // Return false to prevent modal from closing on error
                        }
                    }}
                />
            )}
        </div>
    );
};

export default Dashboard;