// src/front/pages/Dashboard.jsx - FIXED hooks issue + enhanced components

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import toast from 'react-hot-toast';

// 🔧 FIX 1: Import the enhanced components
import JoinGroupInput from '../components/JoinGroupInput';
import GroupActionButtons from '../components/GroupActionButtons';
import CreateGroupModal from '../components/CreateGroupModal';
import CommonGamesList from '../components/CommonGamesList';

const Dashboard = () => {
    const { store } = useGlobalReducer();
    // 🔧 FIX: Declare ALL hooks first, before any conditional logic
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // 🔧 FIX: Get user AFTER hooks are declared
    const user = store.user;

    useEffect(() => {
        if (user) {
            fetchUserGroups();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchUserGroups = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
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
        } finally {
            setLoading(false);
        }
    };

    const handleGroupCreated = (newGroup) => {
        console.log('🎉 New group created:', newGroup);
        setGroups(prev => [...prev, newGroup]);
        toast.success(`Group "${newGroup.name}" created successfully!`);
    };

    const handleGroupJoined = (joinedGroup) => {
        console.log('🎉 Joined group:', joinedGroup);
        setGroups(prev => [...prev, joinedGroup]);
        toast.success(`Joined "${joinedGroup.name}"!`);
    };

    const handleGroupUpdate = (action, groupDeleted, groupIdOrData) => {
        console.log('🔄 Group update:', { action, groupDeleted, groupIdOrData });
        
        switch (action) {
            case 'deleted':
            case 'auto_deleted':
            case 'auto_deleted_manual':
                setGroups(prev => prev.filter(g => g.id !== groupIdOrData));
                break;
            case 'left_with_transfer':
            case 'member_left':
                setGroups(prev => prev.filter(g => g.id !== groupIdOrData));
                break;
            case 'refreshed':
                if (typeof groupIdOrData === 'object') {
                    setGroups(prev => prev.map(g => g.id === groupIdOrData.id ? groupIdOrData : g));
                } else {
                    fetchUserGroups();
                }
                break;
            default:
                fetchUserGroups();
        }
    };

    // 🔧 FIX: Loading check AFTER all hooks
    if (loading && groups.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 flex items-center justify-center">
                <div className="text-white text-center">
                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading your gaming dashboard...</p>
                </div>
            </div>
        );
    }

    // 🔧 FIX: User check AFTER hooks and loading
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 flex items-center justify-center">
                <div className="text-white text-center">
                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading user data...</p>
                </div>
            </div>
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
                            {user?.steam_connected ? '✅' : '⚠️'}
                        </div>
                        <div className="text-white/70">Steam Status</div>
                    </div>
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                        <div className="text-3xl font-bold text-green-400 mb-2">
                            {user?.total_games || 0}
                        </div>
                        <div className="text-white/70">Games in Library</div>
                    </div>
                </div>

                {/* Steam Connection Status */}
                {!user?.steam_connected && (
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
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <div className="flex items-start space-x-2 mb-3">
                            <span className="text-red-400 text-xl">⚠️</span>
                            <div className="flex-1">
                                <span className="text-red-300 font-medium block">Error Loading Groups</span>
                                <p className="text-red-200 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={fetchUserGroups}
                                className="px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-red-200 rounded-lg text-sm transition-colors"
                            >
                                🔄 Try Again
                            </button>
                            
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-blue-500/30 hover:bg-blue-500/50 text-blue-200 rounded-lg text-sm transition-colors"
                            >
                                Refresh Page
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                        <span>👥</span>
                        <span>Create New Group</span>
                    </button>
                    
                    <Link 
                        to="/sessions"
                        className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                        <span>🎮</span>
                        <span>Find Games</span>
                    </Link>
                    
                    <Link 
                        to="/game-library"
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                        <span>📚</span>
                        <span>Game Library</span>
                    </Link>
                </div>

                {/* Your Gaming Groups */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <span className="mr-3">👥</span>
                        Your Gaming Groups
                    </h2>
                    
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-white/70">Loading your groups...</p>
                        </div>
                    ) : groups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {groups.map(group => (
                                <div key={group.id} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-semibold text-white">{group.name}</h3>
                                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                                            {group.current_members || group.members?.length || 0} members
                                        </span>
                                    </div>
                                    
                                    {group.description && (
                                        <p className="text-white/70 text-sm mb-4">{group.description}</p>
                                    )}
                                    
                                    <div className="flex items-center justify-between text-sm text-white/60 mb-4">
                                        <span>
                                            {group.creator?.username === user?.username ? '👑 Your Group' : `Created by ${group.creator?.username || 'Unknown'}`}
                                        </span>
                                        <span>
                                            {group.is_public ? '🌐 Public' : '🔒 Private'}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <Link 
                                            to={`/groups/${group.id}`}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
                                        >
                                            View Group
                                        </Link>
                                        
                                        {/* 🔧 FIX 1: Use GroupActionButtons component */}
                                        <GroupActionButtons 
                                            group={group}
                                            user={user}
                                            onGroupUpdate={handleGroupUpdate}
                                            className="flex-1 ml-3"
                                        />
                                    </div>
                                    
                                    {/* Show invite code for group creators */}
                                    {group.creator?.username === user?.username && group.invite_code && (
                                        <div className="mt-4 p-3 bg-black/20 rounded-lg">
                                            <div className="text-xs text-white/60 mb-1">Invite Code:</div>
                                            <div className="font-mono text-sm text-white">{group.invite_code}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">👥</div>
                            <h3 className="text-xl font-bold text-white mb-2">No Groups Yet</h3>
                            <p className="text-white/70 mb-6">
                                Create your first gaming group or join an existing one to get started!
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                                >
                                    Create First Group
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 🔧 FIX 1: Add JoinGroupInput component */}
                <div className="mb-8">
                    <JoinGroupInput onGroupJoined={handleGroupJoined} />
                </div>

                {/* Common Games Preview */}
                {groups.length > 0 && groups[0] && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                        <CommonGamesList groupId={groups[0].id} />
                    </div>
                )}

                {/* Quick Actions */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Link 
                            to="/friends"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">👥</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Find Friends</h4>
                                <p className="text-white/60 text-sm">Connect with other gamers</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="/profile"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">⚙️</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Profile Settings</h4>
                                <p className="text-white/60 text-sm">Manage your account</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="/sessions"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">🎯</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Start Session</h4>
                                <p className="text-white/60 text-sm">Begin game voting</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* 🔧 FIX 3: Enhanced CreateGroupModal with proper onSubmit */}
            {isCreateModalOpen && (
                <CreateGroupModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={async (groupData) => {
                        try {
                            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups`, {
                                method: 'POST',
                                body: JSON.stringify(groupData)
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                handleGroupCreated(data.group);
                                setIsCreateModalOpen(false);
                                return true; // Success
                            } else {
                                const errorData = await response.json();
                                throw new Error(errorData.error || 'Failed to create group');
                            }
                        } catch (error) {
                            console.error('❌ Error in group creation:', error);
                            toast.error(error.message);
                            return false; // Prevent modal from closing
                        }
                    }}
                />
            )}
        </div>
    );
};

export default Dashboard;