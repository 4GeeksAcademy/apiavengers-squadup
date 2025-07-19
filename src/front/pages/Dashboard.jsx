// src/front/pages/Dashboard.jsx - COMPREHENSIVE FIX

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import toast from 'react-hot-toast';

// ✅ FIXED: Import all components with proper error handling
import JoinGroupInput from '../components/JoinGroupInput';
import GroupActionButtons from '../components/GroupActionButtons';
import CreateGroupModal from '../components/CreateGroupModal';
import CommonGamesList from '../components/CommonGamesList';
import { PageLoadingState } from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const Dashboard = () => {
    // ✅ ALL hooks declared at the top
    const { store } = useGlobalReducer();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [retryAttempt, setRetryAttempt] = useState(0);

    // ✅ FIXED: User is retrieved AFTER all hooks have been declared
    const user = store.user;
    const isAuthenticated = store.isAuthenticated;

    // ✅ FIXED: Comprehensive effect for fetching groups
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            console.log('📊 Dashboard: User authenticated, fetching groups...');
            fetchUserGroups();
        } else if (isAuthenticated === false) {
            // User is explicitly not authenticated
            console.log('🚫 Dashboard: User not authenticated');
            setLoading(false);
            setError('Please log in to view your dashboard.');
        } else {
            // Still checking authentication
            console.log('⏳ Dashboard: Waiting for authentication check...');
        }
    }, [isAuthenticated, user?.id]);

    // ✅ ENHANCED: Better error handling and retry logic
    const fetchUserGroups = async (silent = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            if (!backendUrl) {
                throw new Error('Backend URL not configured. Please check your environment variables.');
            }

            console.log(`🔄 Fetching groups (attempt ${retryAttempt + 1})`);
            
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups`);
            
            if (response.ok) {
                const data = await response.json();
                const groupsData = data.groups || [];
                
                setGroups(groupsData);
                setError(null);
                setRetryAttempt(0); // Reset retry count on success
                
                console.log(`✅ Successfully fetched ${groupsData.length} groups`);
                
                if (!silent) {
                    toast.success(`Loaded ${groupsData.length} gaming groups`);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `Server error (${response.status})`;
                
                if (response.status === 401) {
                    throw new Error('Your session has expired. Please log in again.');
                } else if (response.status === 403) {
                    throw new Error('Access denied. Please check your permissions.');
                } else if (response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                } else {
                    throw new Error(errorMessage);
                }
            }
        } catch (err) {
            console.error('❌ Error fetching groups:', err);
            
            let errorMessage = err.message;
            
            // Enhanced error categorization
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                errorMessage = 'Network connection error. Please check your internet connection.';
            } else if (err.message.includes('Backend URL not configured')) {
                errorMessage = 'Application configuration error. Please contact support.';
            } else if (err.message.includes('session has expired')) {
                // Don't set error state for auth issues, let auth system handle it
                console.log('🔑 Authentication error, letting auth system handle...');
                return;
            }
            
            setError(errorMessage);
            
            if (!silent) {
                toast.error(`Failed to load groups: ${errorMessage}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // ✅ ENHANCED: Better retry logic with exponential backoff
    const handleRetry = async () => {
        const nextAttempt = retryAttempt + 1;
        setRetryAttempt(nextAttempt);
        
        // Add delay for retries to prevent spam
        if (nextAttempt > 1) {
            const delay = Math.min(1000 * Math.pow(2, nextAttempt - 2), 5000); // Max 5 second delay
            toast.loading(`Retrying in ${delay / 1000} seconds...`, { duration: delay });
            setTimeout(() => {
                fetchUserGroups();
            }, delay);
        } else {
            await fetchUserGroups();
        }
    };

    // ✅ ENHANCED: Better group creation handling
    const handleGroupCreated = (newGroup) => {
        if (!newGroup || !newGroup.id) {
            console.error('❌ Invalid group data received:', newGroup);
            toast.error('Group created but data is invalid. Please refresh the page.');
            return;
        }
        
        // Add the new group to the start of the list for immediate visibility
        setGroups(prev => {
            // Prevent duplicates
            const exists = prev.some(g => g.id === newGroup.id);
            if (exists) {
                console.warn('⚠️ Group already exists in list:', newGroup.id);
                return prev;
            }
            return [newGroup, ...prev];
        });
        
        toast.success(`🎉 Group "${newGroup.name}" created successfully!`);
        console.log('✅ Group created and added to list:', newGroup.name);
    };

    // ✅ ENHANCED: Better group joining handling
    const handleGroupJoined = (joinedGroup) => {
        if (!joinedGroup || !joinedGroup.id) {
            console.error('❌ Invalid joined group data:', joinedGroup);
            toast.error('Joined group but data is invalid. Please refresh the page.');
            return;
        }
        
        setGroups(prev => {
            // Prevent duplicates
            const exists = prev.some(g => g.id === joinedGroup.id);
            if (exists) {
                console.warn('⚠️ Already a member of this group:', joinedGroup.name);
                toast.info(`You're already a member of "${joinedGroup.name}"`);
                return prev;
            }
            return [...prev, joinedGroup];
        });
        
        toast.success(`🎉 Welcome to "${joinedGroup.name}"!`);
        console.log('✅ Successfully joined group:', joinedGroup.name);
    };

    // ✅ ENHANCED: Comprehensive group update handling
    const handleGroupUpdate = (action, isDeleted, data) => {
        console.log('🔄 Group update received:', { action, isDeleted, data });
        
        try {
            if (isDeleted) {
                // Remove the group from the list by its ID
                const groupIdToRemove = typeof data === 'object' ? data.id : data;
                
                if (!groupIdToRemove) {
                    console.error('❌ Cannot remove group: invalid ID');
                    return;
                }
                
                setGroups(prev => {
                    const filtered = prev.filter(g => g.id !== groupIdToRemove);
                    console.log(`✅ Removed group ${groupIdToRemove} from list`);
                    return filtered;
                });
                
                toast.info('Group has been deleted or you have left it.');
                
            } else if (action === 'refreshed' && typeof data === 'object' && data.id) {
                // Update a specific group's data in the list
                setGroups(prev => {
                    const updated = prev.map(g => g.id === data.id ? { ...g, ...data } : g);
                    console.log(`✅ Updated group ${data.id} in list`);
                    return updated;
                });
                
            } else {
                // For other actions (like ownership transfer), do a full refresh
                console.log(`🔄 Performing full refresh for action: ${action}`);
                fetchUserGroups(true); // Silent refresh
            }
        } catch (error) {
            console.error('❌ Error handling group update:', error);
            // Fallback to full refresh
            fetchUserGroups(true);
        }
    };

    // ✅ ENHANCED: Better create modal submission
    const handleCreateModalSubmit = async (groupData) => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            if (!backendUrl) {
                throw new Error('Backend URL not configured');
            }

            console.log('🚀 Creating group:', groupData);

            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(groupData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `Server error (${response.status})`;
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            if (!data.group) {
                throw new Error('Invalid response: missing group data');
            }
            
            handleGroupCreated(data.group);
            setIsCreateModalOpen(false);
            
            return true; // Success
            
        } catch (error) {
            console.error('❌ Error creating group:', error);
            
            let errorMessage = error.message;
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Network connection error. Please try again.';
            }
            
            toast.error(`Failed to create group: ${errorMessage}`);
            return false; // Prevent modal from closing on error
        }
    };

    // ✅ FIXED: Steam connection check
    const isSteamConnected = user?.steam_connected || user?.is_steam_connected || false;
    const totalGames = user?.total_games || 0;

    // --- RENDER LOGIC ---

    // Authentication loading state
    if (loading && !user && store.authLoading) {
        return <PageLoadingState message="Checking authentication..." />;
    }

    // Groups loading state (only if user exists)
    if (loading && user && groups.length === 0) {
        return <PageLoadingState message="Loading your gaming dashboard..." />;
    }

    // Authentication required
    if (!user && !store.authLoading) {
        return (
            <ErrorState 
                type="permission" 
                title="Authentication Required" 
                message="Please log in to view your dashboard."
                onAction={() => window.location.href = '/login'}
                actionText="Go to Login"
            />
        );
    }

    // Network or configuration error
    if (error && error.includes('configuration')) {
        return (
            <ErrorState 
                type="api" 
                title="Configuration Error"
                message={error}
                onRetry={handleRetry}
                helpText="Please contact support if this error persists."
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
                        Welcome back, {user?.username || 'Gamer'}! Ready to find your next adventure?
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
                            {isSteamConnected ? '✅' : '⚠️'}
                        </div>
                        <div className="text-white/70">Steam Status</div>
                    </div>
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                        <div className="text-3xl font-bold text-green-400 mb-2">
                            {totalGames}
                        </div>
                        <div className="text-white/70">Games in Library</div>
                    </div>
                </div>

                {/* Steam Connection Status */}
                {!isSteamConnected && (
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

                {/* Error Display with retry */}
                {error && (
                    <div className="mb-8">
                        <ErrorState 
                            type="api" 
                            message={error}
                            onRetry={handleRetry} 
                            retryText={`Try Again${retryAttempt > 0 ? ` (${retryAttempt})` : ''}`}
                            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8"
                        />
                    </div>
                )}

                {/* Your Gaming Groups */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center mb-4 sm:mb-0">
                            <span className="mr-3">👥</span>
                            Your Gaming Groups
                        </h2>
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-5 py-2.5 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
                            >
                                <span>➕</span>
                                <span>Create Group</span>
                            </button>
                            <JoinGroupInput 
                                onGroupJoined={handleGroupJoined}
                                className="min-w-0" 
                            />
                            <button
                                onClick={() => fetchUserGroups()}
                                disabled={loading}
                                className="px-3 py-2.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50"
                                title="Refresh groups"
                            >
                                <span className={loading ? 'animate-spin' : ''}>🔄</span>
                            </button>
                        </div>
                    </div>
                    
                    {groups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {groups.map(group => (
                                <div key={group.id} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 flex flex-col">
                                    <div className="flex-grow">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-semibold text-white truncate pr-2">
                                                {group.name || 'Unnamed Group'}
                                            </h3>
                                            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm flex-shrink-0">
                                                {group.current_members || 0} members
                                            </span>
                                        </div>
                                        
                                        <p className="text-white/70 text-sm mb-4 min-h-[40px]">
                                            {group.description || "No description provided."}
                                        </p>
                                        
                                        <div className="flex items-center justify-between text-sm text-white/60 mb-4">
                                            <span>
                                                {group.creator?.id === user?.id ? '👑 Your Group' : `Created by ${group.creator?.username || 'Unknown'}`}
                                            </span>
                                            <span>
                                                {group.is_public ? '🌐 Public' : '🔒 Private'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-auto gap-2">
                                        <Link 
                                            to={`/groups/${group.id}`}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200 flex-shrink-0"
                                        >
                                            View Group
                                        </Link>
                                        
                                        <GroupActionButtons 
                                            group={group}
                                            user={user}
                                            onGroupUpdate={handleGroupUpdate}
                                            className="flex-shrink-0"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">🕹️</div>
                            <h3 className="text-xl font-bold text-white mb-2">No Groups Yet</h3>
                            <p className="text-white/70 mb-6">
                                Create a group to start finding games with your squad!
                            </p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                            >
                                🚀 Create Your First Group
                            </button>
                        </div>
                    )}
                </div>

                {/* ✅ FIXED: Safely render CommonGamesList only when groups exist and user has Steam */}
                {groups.length > 0 && isSteamConnected && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                            <span className="mr-3">🎯</span>
                            Common Games in '{groups[0]?.name || 'Group'}'
                        </h2>
                        <CommonGamesList groupId={groups[0]?.id} />
                    </div>
                )}

                {/* Steam connection reminder for common games */}
                {groups.length > 0 && !isSteamConnected && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8">
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">🎮</div>
                            <h3 className="text-xl font-bold text-white mb-2">Connect Steam for Common Games</h3>
                            <p className="text-white/70 mb-6">
                                Connect your Steam account to see games you have in common with your group members!
                            </p>
                            <Link
                                to="/profile"
                                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors duration-200"
                            >
                                Connect Steam Account
                            </Link>
                        </div>
                    </div>
                )}

                {/* Quick Actions for when there are no groups */}
                {groups.length === 0 && !loading && !error && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Link 
                                to="/sessions"
                                className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                            >
                                <span className="text-2xl">🎮</span>
                                <div>
                                    <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Find Games</h4>
                                    <p className="text-white/60 text-sm">Discover gaming sessions</p>
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

            {/* ✅ FIXED: Create Group Modal with better error handling and validation */}
            {isCreateModalOpen && (
                <CreateGroupModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={handleCreateModalSubmit}
                />
            )}
        </div>
    );
};

export default Dashboard;