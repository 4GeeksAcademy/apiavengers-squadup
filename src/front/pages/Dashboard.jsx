// src/front/pages/Dashboard.jsx - FIXED with enhanced components and proper imports

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
    const user = store.user;

    // State management
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchUserGroups();
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

    // 🔧 FIX 3: Proper CreateGroupModal integration with onSubmit
    const handleGroupCreated = (newGroup) => {
        console.log('🎉 New group created:', newGroup);
        setGroups(prev => [...prev, newGroup]);
        toast.success(`Group "${newGroup.name}" created successfully!`);
    };

    // 🔧 FIX 1: Handler for JoinGroupInput
    const handleGroupJoined = (joinedGroup) => {
        console.log('🎉 Joined group:', joinedGroup);
        setGroups(prev => [...prev, joinedGroup]);
        toast.success(`Joined "${joinedGroup.name}"!`);
    };

    // Enhanced group update handler for GroupActionButtons
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
                </div>

                {/* Your Gaming Groups */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <span className="mr-3">👥</span>
                        Your Gaming Groups
                    </h2>
                    
                    {groups.length > 0 ? (
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
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                            >
                                Create First Group
                            </button>
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