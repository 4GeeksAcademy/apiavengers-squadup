// src/front/pages/Dashboard.jsx - COMPLETE FIXED VERSION

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import CreateGroupModal from '../components/CreateGroupModal';
import { validateGroupId, validateGroupObject, safeGroupOperation, handleGroupError, validateInviteCode } from '../utils/groupValidation';
import JoinGroupInput from '../components/JoinGroupInput';
import GroupActionButtons from '../components/GroupActionButtons';
import toast from 'react-hot-toast';

// Import your existing enhanced components
import { PageLoadingState, DataLoadingState } from '../components/LoadingState';
import { NetworkErrorState, AuthErrorState } from '../components/ErrorState';

export function Dashboard() {
    const navigate = useNavigate();
    const { store, dispatch } = useGlobalReducer();
    
    // 🔧 CRITICAL: Use refs to prevent multiple effect runs and track state
    const initializationRef = useRef(false);
    const dataLoadedRef = useRef(false);
    const isMountedRef = useRef(true);
    const loadingTimeoutRef = useRef(null);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 🔧 CRITICAL: Destructure with defaults to prevent undefined access
    const {
        isAuthenticated = false,
        user = null,
        authLoading = false
    } = store || {};

    // 🔧 CRITICAL: Enhanced data loading with comprehensive validation
    const loadDashboardData = async () => {
        // Check if data is already loaded and this isn't a forced refresh
        if (dataLoadedRef.current && !loading) {
            console.log('📊 Dashboard: Data already loaded, skipping...');
            setLoading(false);
            return;
        }

        console.log('📊 Dashboard: Loading user groups...');
        setLoading(true);
        setError(null);

        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
        }

        // Set a fallback timeout to prevent infinite loading
        loadingTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
                console.log('⏰ Dashboard: Loading timeout reached, forcing loading to false');
                setLoading(false);
            }
        }, 10000); // 10 second timeout

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            console.log('📡 Fetching groups from:', `${backendUrl}/api/gaming/groups`);
            
            const groupsResponse = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups`);
            
            if (!isMountedRef.current) return;
            
            if (groupsResponse.ok) {
                const groupsData = await groupsResponse.json();
                
                // 🔧 CRITICAL: Validate group data using your validation utility
                const validGroups = (groupsData.groups || []).filter(group => {
                    const validation = validateGroupObject(group);
                    if (!validation.isValid) {
                        console.error('❌ Invalid group data received:', group, validation.errors);
                    }
                    return validation.isValid;
                });
                
                console.log('✅ Valid groups loaded:', validGroups.length);
                
                if (isMountedRef.current) {
                    setGroups(validGroups);
                    setError(null);
                    dataLoadedRef.current = true;
                    console.log('✅ Dashboard: Groups loaded successfully');
                }
            } else {
                const errorData = await groupsResponse.json();
                console.error('Groups fetch error:', errorData);
                
                if (groupsResponse.status === 401) {
                    console.log('🚨 Auth error in dashboard, clearing auth and redirecting...');
                    authService.logout();
                    navigate('/login');
                    return;
                }
                
                throw new Error(errorData.error || 'Failed to load groups');
            }
            
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            const friendlyError = handleGroupError(error, 'dashboard load');
            
            if (isMountedRef.current) {
                setError(friendlyError);
                
                // Handle authentication expiration
                if (error.message.includes('Authentication expired') || error.message.includes('401')) {
                    console.log('🚨 Auth error in dashboard, clearing auth and redirecting...');
                    authService.logout();
                    navigate('/login');
                    return;
                }
                
                toast.error(friendlyError);
            }
        } finally {
            // CRITICAL: Always clear timeout and set loading to false
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
            }
            
            if (isMountedRef.current) {
                console.log('🏁 Dashboard: Setting loading to false');
                setLoading(false);
            }
        }
    };

    // 🔧 CRITICAL: Main useEffect with enhanced logic
    useEffect(() => {
        console.log('🔄 Dashboard useEffect triggered:', {
            initialized: initializationRef.current,
            dataLoaded: dataLoadedRef.current,
            isAuthenticated,
            hasUser: !!user,
            authLoading,
            loading
        });

        // Reset mounted flag on each effect run
        isMountedRef.current = true;

        // If we're waiting for auth, don't do anything yet
        if (authLoading) {
            console.log('⏳ Dashboard: Auth still loading, waiting...');
            return;
        }

        // If not authenticated, stop loading and let auth error component show
        if (!isAuthenticated || !user) {
            console.log('🚨 Dashboard: Not authenticated or no user');
            setLoading(false);
            return;
        }

        // If already initialized and data loaded, ensure loading is off
        if (initializationRef.current && dataLoadedRef.current) {
            console.log('📊 Dashboard: Already initialized and data loaded');
            if (loading) {
                console.log('🔧 Dashboard: Fixing stuck loading state');
                setLoading(false);
            }
            return;
        }

        // If already initialized but no data, something went wrong - retry
        if (initializationRef.current && !dataLoadedRef.current) {
            console.log('🔄 Dashboard: Initialized but no data, retrying...');
            loadDashboardData();
            return;
        }

        // First time initialization
        if (!initializationRef.current) {
            initializationRef.current = true;
            console.log('🔄 Dashboard: Starting initial data load for user:', user.username);
            loadDashboardData();
        }

        return () => {
            console.log('🧹 Dashboard: Cleanup triggered');
            isMountedRef.current = false;
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [isAuthenticated, user?.id, authLoading]);

    // 🔧 CRITICAL: Navigation handling useEffect
    useEffect(() => {
        // Handle case where user navigates back to dashboard
        const navigationTimer = setTimeout(() => {
            if (initializationRef.current && dataLoadedRef.current && loading) {
                console.log('🔧 Dashboard: Navigation check - forcing loading state to false');
                setLoading(false);
            }
        }, 500); // Slightly longer delay to ensure all effects have run

        return () => clearTimeout(navigationTimer);
    }, []); // Run only on mount

    // 🔧 CRITICAL: Enhanced group creation handler with validation
    const handleGroupCreated = async (newGroup) => {
        console.log('✅ Dashboard: New group created:', newGroup);
        
        // Validate new group data
        const validation = validateGroupObject(newGroup);
        if (!validation.isValid) {
            console.error('❌ Invalid group data from creation:', newGroup, validation.errors);
            toast.error('Group created but invalid data received. Please refresh.');
            // Force refresh dashboard data
            dataLoadedRef.current = false;
            initializationRef.current = false;
            loadDashboardData();
            return;
        }
        
        setGroups(prevGroups => [...prevGroups, newGroup]);
        setIsCreateModalOpen(false);
        toast.success(`Group "${newGroup.name}" created successfully!`);
    };

    // 🔧 CRITICAL: Enhanced group update handler with validation
    const handleGroupUpdate = (action, wasDeleted, groupId) => {
        console.log('🔄 Group update received:', { action, wasDeleted, groupId });
        
        // Validate groupId before proceeding
        const validation = validateGroupId(groupId);
        if (!validation.isValid) {
            console.error('❌ Invalid groupId in handleGroupUpdate:', groupId, validation.error);
            toast.error('Invalid group data. Please refresh the page.');
            // Force refresh dashboard data
            dataLoadedRef.current = false;
            initializationRef.current = false;
            loadDashboardData();
            return;
        }
        
        if (wasDeleted || action === 'deleted') {
            // Remove the group from state completely
            setGroups(prevGroups => {
                const updatedGroups = prevGroups.filter(g => g.id !== validation.normalizedId);
                console.log(`🗑️ Group ${validation.normalizedId} removed from state. Remaining groups:`, updatedGroups.length);
                return updatedGroups;
            });
        } else if (action === 'left') {
            console.log('👋 Member left, refreshing dashboard data...');
            // Remove the group from state and refresh
            setGroups(prevGroups => prevGroups.filter(g => g.id !== validation.normalizedId));
            
            // Reset the data loaded flag and reload
            dataLoadedRef.current = false;
            initializationRef.current = false;
            loadDashboardData();
        }
    };

    // 🔧 CRITICAL: Enhanced group joining handler with validation
    const handleGroupJoined = async (newGroup) => {
        console.log('🎉 Group joined successfully:', newGroup.name);
        
        // Validate new group using your validation utility
        const validation = validateGroupObject(newGroup);
        if (validation.isValid) {
            setGroups(prevGroups => [...prevGroups, newGroup]);
            toast.success(`Welcome to "${newGroup.name}"! 🎉`);
        } else {
            console.error('❌ Invalid group data from join:', newGroup, validation.errors);
            toast.error('Joined group but invalid data received. Please refresh.');
            // Force refresh dashboard data
            dataLoadedRef.current = false;
            initializationRef.current = false;
            loadDashboardData();
        }
    };

    // 🔧 CRITICAL: Safe refresh handler
    const handleRefresh = async () => {
        console.log('🔄 Dashboard: Manual refresh triggered');
        
        // Reset all state flags
        dataLoadedRef.current = false;
        initializationRef.current = false;
        setLoading(true);
        setError(null);

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups`);
            
            if (response.ok) {
                const data = await response.json();
                const validGroups = (data.groups || []).filter(group => {
                    const validation = validateGroupObject(group);
                    return validation.isValid;
                });
                
                setGroups(validGroups);
                dataLoadedRef.current = true;
                initializationRef.current = true;
                toast.success('Groups refreshed!');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to refresh groups');
            }
        } catch (error) {
            console.error('❌ Dashboard: Refresh error:', error);
            const friendlyError = handleGroupError(error, 'dashboard refresh');
            setError(friendlyError);
            toast.error(friendlyError);
        } finally {
            setLoading(false);
        }
    };

    // 🔧 CRITICAL: Safe group filtering with validation
    const getFilteredGroups = () => {
        // Filter out invalid groups with validation
        const validGroups = groups.filter(g => {
            const validation = validateGroupObject(g);
            return validation.isValid;
        });
        
        return validGroups;
    };

    // Copy invite link helper
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

    // 🔧 CRITICAL: Enhanced loading state logic
    const shouldShowLoading = authLoading || loading;
    
    // Debug logging
    console.log('🎯 Dashboard render state:', {
        loading,
        authLoading,
        shouldShowLoading,
        dataLoaded: dataLoadedRef.current,
        initialized: initializationRef.current,
        groupsLength: groups.length,
        isAuthenticated,
        hasUser: !!user
    });
    
    // Use enhanced loading component
    if (shouldShowLoading) {
        return <PageLoadingState message="Loading your dashboard..." subMessage="Fetching groups and game data" />;
    }

    // Enhanced error handling with NetworkErrorState
    if (error && !groups.length) {
        return <NetworkErrorState 
            error={error}
            onRetry={handleRefresh}
            onRefresh={() => window.location.reload()}
            helpText="Check your internet connection and try refreshing the page."
        />;
    }

    // Enhanced authentication error handling
    if (!isAuthenticated || !user) {
        console.log('🚨 Dashboard: Not authenticated, showing auth error');
        return <AuthErrorState 
            onLogin={() => navigate('/login')}
            onGoHome={() => navigate('/')}
        />;
    }

    const filteredGroups = getFilteredGroups();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                            Welcome back, {user.username}! 👋
                        </h1>
                        <p className="text-blue-200">
                            Ready to squad up and find your next gaming session?
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-xl transition-all"
                        >
                            {loading ? '🔄' : '↻'} Refresh
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg transition-all transform hover:scale-105"
                        >
                            + Create Group
                        </button>
                    </div>
                </div>

                {/* Enhanced Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
                        <div className="text-3xl font-bold text-coral-400 mb-2">{filteredGroups.length}</div>
                        <div className="text-blue-200">Your Groups</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
                        <div className="text-3xl font-bold text-green-400 mb-2">
                            {filteredGroups.filter(g => g.current_members > 1).length}
                        </div>
                        <div className="text-blue-200">Active Groups</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
                        <div className="text-3xl font-bold text-purple-400 mb-2">
                            {filteredGroups.reduce((sum, g) => sum + (g.current_members || 0), 0)}
                        </div>
                        <div className="text-blue-200">Total Members</div>
                    </div>
                </div>

                {/* Groups Section */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Your Gaming Groups</h2>
                        {filteredGroups.length > 0 && (
                            <span className="text-blue-300 text-sm">
                                {filteredGroups.length} group{filteredGroups.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {filteredGroups.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🎮</div>
                            <h3 className="text-xl font-semibold text-white mb-3">No Groups Yet</h3>
                            <p className="text-blue-200 mb-6 max-w-md mx-auto">
                                Create your first gaming group to start finding teammates and organizing game sessions!
                            </p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg transition-all"
                            >
                                Create Your First Group
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredGroups.map(group => {
                                // 🔧 CRITICAL: Validate each group before rendering
                                const validation = validateGroupObject(group);
                                if (!validation.isValid) {
                                    console.error('❌ Skipping invalid group in render:', group, validation.errors);
                                    return null;
                                }

                                return (
                                    <Link
                                        key={group.id}
                                        to={`/groups/${group.id}`}
                                        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-coral-500/50 rounded-xl p-6 transition-all transform hover:scale-105 group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-white group-hover:text-coral-400 transition-colors">
                                                {group.name}
                                            </h3>
                                            {group.creator?.id === user.id && (
                                                <span className="px-2 py-1 bg-coral-500/20 text-coral-400 text-xs rounded-full">
                                                    Owner
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-2 text-sm text-blue-200">
                                            <div className="flex items-center gap-2">
                                                <span>👥</span>
                                                <span>{group.current_members || 0} / {group.max_members || '∞'} members</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span>👑</span>
                                                <span>Created by {group.creator?.username || 'Unknown'}</span>
                                            </div>
                                            {group.invite_code && (
                                                <div className="flex items-center gap-2">
                                                    <span>🔗</span>
                                                    <span className="font-mono text-xs bg-white/10 px-2 py-1 rounded">
                                                        {group.invite_code}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Quick action buttons */}
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    copyInviteLink(group.invite_code);
                                                }}
                                                className="flex-1 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors flex items-center justify-center space-x-1"
                                                title="Copy invite link"
                                            >
                                                <span>🔗</span>
                                                <span>Invite</span>
                                            </button>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                        to="/find-games"
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-4 rounded-xl transition-all transform hover:scale-105 text-center"
                    >
                        <div className="text-2xl mb-2">🎯</div>
                        <div className="font-semibold">Find Games</div>
                    </Link>
                    <Link
                        to="/friends"
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-4 rounded-xl transition-all transform hover:scale-105 text-center"
                    >
                        <div className="text-2xl mb-2">👥</div>
                        <div className="font-semibold">Friends</div>
                    </Link>
                    <Link
                        to="/game-library"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-xl transition-all transform hover:scale-105 text-center"
                    >
                        <div className="text-2xl mb-2">📚</div>
                        <div className="font-semibold">My Library</div>
                    </Link>
                    <Link
                        to="/profile"
                        className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white p-4 rounded-xl transition-all transform hover:scale-105 text-center"
                    >
                        <div className="text-2xl mb-2">⚙️</div>
                        <div className="font-semibold">Settings</div>
                    </Link>
                </div>
            </div>

            {/* Create Group Modal */}
            {isCreateModalOpen && (
                <CreateGroupModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onGroupCreated={handleGroupCreated}
                />
            )}
        </div>
    );
}