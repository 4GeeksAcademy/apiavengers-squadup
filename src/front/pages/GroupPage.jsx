// src/front/pages/GroupPage.jsx - PHASE 5 IMPLEMENTATION: Standardized UI/UX Components

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import authService from '../store/authService';
import useGlobalReducer from '../hooks/useGlobalReducer';
import toast from 'react-hot-toast';

// 🚀 PHASE 5: Import standardized components
import { PageLoadingState, DataLoadingState } from '../components/LoadingState';
import { 
    NetworkErrorState, 
    NotFoundErrorState, 
    PermissionErrorState,
    GroupErrorState 
} from '../components/ErrorState';
import { validateGroupId, safeGroupOperation } from '../utils/groupValidation';

import CommonGamesList from '../components/CommonGamesList';
import LiveVotingSession from '../components/LiveVotingSession';
import QuickVote from '../components/QuickVote';
import GroupInviteLink from '../components/GroupInviteLink';
import GroupActionButtons from '../components/GroupActionButtons';
import GroupMembersTab from '../components/GroupMembersTab';
import VoterStatusPanel from '../components/VoterStatusPanel';
import VotingReminders from '../components/VotingReminders';

const GroupPage = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { store } = useGlobalReducer();
    const user = store.user;
    
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // 🚀 PHASE 5: Enhanced error state
    const [activeTab, setActiveTab] = useState('vote');
    const [activeSessions, setActiveSessions] = useState([]);
    
    // Live voting state
    const [showLiveVoting, setShowLiveVoting] = useState(false);
    const [currentLiveSession, setCurrentLiveSession] = useState(null);

    useEffect(() => {
        if (groupId) {
            // 🚀 PHASE 5: Validate groupId before proceeding
            const validation = validateGroupId(groupId);
            if (!validation.isValid) {
                console.error('❌ Invalid groupId in URL:', groupId, validation.error);
                setError('Invalid group ID in URL');
                setLoading(false);
                return;
            }

            fetchGroupData();
            fetchActiveSessions();
        }
    }, [groupId]);

    // Check if there's an active voting session
    useEffect(() => {
        const activeVotingSession = activeSessions.find(s => s.status === 'voting');
        
        if (activeVotingSession) {
            setShowLiveVoting(true);
            setCurrentLiveSession(activeVotingSession);
            console.log('🔴 Active voting session found:', activeVotingSession.session_name);
        } else {
            setShowLiveVoting(false);
            setCurrentLiveSession(null);
        }
    }, [activeSessions]);

    // 🚀 PHASE 5: Enhanced fetchGroupData with safeGroupOperation
    const fetchGroupData = async () => {
        const result = await safeGroupOperation(
            groupId,
            async (validatedGroupId) => {
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${validatedGroupId}`);
                
                if (response.ok) {
                    const data = await response.json();
                    return data.group;
                } else if (response.status === 404) {
                    throw new Error('Group not found');
                } else if (response.status === 403) {
                    throw new Error('Access denied to this group');
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to load group details');
                }
            },
            'fetch group data'
        );

        setLoading(false);

        if (result.success) {
            setGroup(result.data);
            setError(null);
        } else {
            console.error('❌ Failed to fetch group data:', result.error);
            setError(result.error);
            
            // Show appropriate toast based on error type
            if (result.error.includes('not found')) {
                toast.error("Group not found");
            } else if (result.error.includes('Access denied')) {
                toast.error("You don't have access to this group");
            } else {
                toast.error("Failed to load group details");
            }
        }
    };

    // 🚀 PHASE 5: Enhanced fetchActiveSessions with safeGroupOperation
    const fetchActiveSessions = async () => {
        const result = await safeGroupOperation(
            groupId,
            async (validatedGroupId) => {
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${validatedGroupId}/sessions`);
                
                if (response.ok) {
                    const data = await response.json();
                    return data.sessions || [];
                } else {
                    console.warn('Failed to fetch sessions:', response.status);
                    return []; // Don't fail the whole page for sessions
                }
            },
            'fetch active sessions'
        );

        if (result.success) {
            const sessions = result.data;
            setActiveSessions(sessions);
            
            console.log('📊 Found sessions:', sessions.length, 'sessions');
            const votingSessions = sessions.filter(s => s.status === 'voting');
            if (votingSessions.length > 0) {
                console.log('🔴 Active voting sessions:', votingSessions.length);
            }
        } else {
            console.error("Error fetching sessions:", result.error);
            // Don't set error state for sessions, just log it
        }
    };

    // Handle session state changes
    const handleSessionUpdate = () => {
        console.log('🔄 Session updated, refreshing data...');
        fetchActiveSessions();
    };

    const handleGroupUpdate = (action, wasDeleted, data) => {
        if (wasDeleted || action === 'deleted') {
            navigate('/dashboard', { 
                state: { message: `Group "${group?.name || 'Unknown'}" was deleted` }
            });
        } else if (action === 'left') {
            navigate('/dashboard', { 
                state: { message: `You left "${group?.name || 'the group'}"` }
            });
        } else if (action === 'ownership_transferred') {
            // Refresh group data after ownership transfer
            fetchGroupData();
        } else if (action === 'member_kicked') {
            // Update group member count
            setGroup(prev => ({
                ...prev,
                current_members: data?.remainingMembers || prev.current_members - 1
            }));
        }
    };

    // 🚀 PHASE 5: Use standardized PageLoadingState
    if (loading) {
        return <PageLoadingState 
            message="Loading group..." 
            subMessage="Fetching members and game data" 
        />;
    }

    // 🚀 PHASE 5: Enhanced error handling with specific error states
    if (error) {
        if (error.includes('not found')) {
            return <NotFoundErrorState 
                title="Group Not Found"
                message="This group may have been deleted or you don't have access to it."
                onGoBack={() => navigate('/dashboard')}
            />;
        }
        
        if (error.includes('Access denied') || error.includes('permission')) {
            return <PermissionErrorState 
                onGoBack={() => navigate('/dashboard')}
                onGoHome={() => navigate('/')}
            />;
        }
        
        if (error.includes('Invalid group ID')) {
            return <GroupErrorState 
                error="Invalid group ID in the URL"
                onRetry={() => window.location.reload()}
                onGoHome={() => navigate('/dashboard')}
            />;
        }
        
        // Generic network/server error
        return <NetworkErrorState 
            error={error}
            onRetry={fetchGroupData}
            onRefresh={() => window.location.reload()}
            helpText="Check your connection and try again."
        />;
    }

    // 🚀 PHASE 5: Additional validation - ensure group exists
    if (!group) {
        return <NotFoundErrorState 
            title="Group Not Found"
            message="This group may have been deleted or you don't have access to it."
            onGoBack={() => navigate('/dashboard')}
        />;
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-6xl mx-auto">
                
                {/* Header */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                                <h1 className="text-3xl lg:text-4xl font-bold text-white">{group.name}</h1>
                                {group.is_public ? (
                                    <span className="px-3 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full text-sm">
                                        Public
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-sm">
                                        Private
                                    </span>
                                )}
                                
                                {/* Live voting indicator */}
                                {showLiveVoting && (
                                    <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-sm animate-pulse">
                                        🔴 Live Voting
                                    </span>
                                )}
                            </div>
                            
                            {group.description && (
                                <p className="text-white/70 text-lg mb-3">{group.description}</p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                    <span className="text-white/60">👥</span>
                                    <span className="text-white">{group.current_members}/{group.max_members} members</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-white/60">👑</span>
                                    <span className="text-white">{group.creator?.username || 'Unknown'}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-white/60">📅</span>
                                    <span className="text-white">{new Date(group.created_at).toLocaleDateString()}</span>
                                </div>
                                
                                {/* Active sessions count */}
                                {activeSessions.length > 0 && (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-white/60">🎯</span>
                                        <span className="text-white">{activeSessions.length} active sessions</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mt-4">
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div 
                                        className="bg-coral-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(group.current_members / group.max_members) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Actions */}
                        {user && group && (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                                >
                                    ← Dashboard
                                </button>
                                <GroupActionButtons 
                                    group={group} 
                                    user={user} 
                                    onGroupUpdate={handleGroupUpdate}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Sessions Alert */}
                {activeSessions.length > 0 && (
                    <div className="mb-6">
                        {activeSessions.map(session => (
                            <div key={session.id} className={`backdrop-blur-xl border rounded-2xl p-4 mb-4 ${
                                session.status === 'voting' 
                                    ? 'bg-red-500/10 border-red-500/30' 
                                    : 'bg-blue-500/10 border-blue-500/30'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className={`font-semibold ${
                                            session.status === 'voting' ? 'text-red-300' : 'text-blue-300'
                                        }`}>
                                            {session.status === 'voting' ? '🔴 Active Voting Session' : '🏆 Voting Complete'}
                                        </h3>
                                        <p className={`text-sm ${
                                            session.status === 'voting' ? 'text-red-200' : 'text-blue-200'
                                        }`}>
                                            {session.session_name}
                                        </p>
                                        {session.status === 'voting' && (
                                            <p className="text-xs text-white/60 mt-1">
                                                🔴 Live updates • Real-time results
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => navigate(`/sessions/${session.id}/results`)}
                                        className={`px-4 py-2 font-medium rounded-lg text-sm transition-colors duration-200 ${
                                            session.status === 'voting'
                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        }`}
                                    >
                                        {session.status === 'voting' ? 'Join Live Voting' : 'View Results'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="mb-8">
                    <div className="flex space-x-1 bg-white/5 p-1 rounded-xl w-fit">
                        {[
                            { id: 'vote', label: 'Vote & Play', icon: showLiveVoting ? '🔴' : '🗳️' },
                            { id: 'games', label: 'Common Games', icon: '🎮' },
                            { id: 'members', label: 'Members', icon: '👥' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                                    activeTab === tab.id
                                        ? 'bg-coral-500 text-white shadow-lg'
                                        : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                                {tab.id === 'vote' && showLiveVoting && (
                                    <span className="ml-1 w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Tab Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        {activeTab === 'vote' && (
                            <div className="space-y-6">
                                {/* Show live voting if session is active, otherwise show create option */}
                                {showLiveVoting && currentLiveSession ? (
                                    <LiveVotingSession 
                                        groupId={groupId} 
                                        session={currentLiveSession}
                                        onSessionUpdate={handleSessionUpdate}
                                    />
                                ) : (
                                    <>
                                        <QuickVote 
                                            groupId={groupId}
                                            onSessionCreated={handleSessionUpdate}
                                        />
                                        
                                        <VotingReminders 
                                            groupId={groupId}
                                            recentSessions={activeSessions}
                                        />
                                    </>
                                )}
                            </div>
                        )}
                        
                        {activeTab === 'games' && (
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                                <CommonGamesList groupId={groupId} />
                            </div>
                        )}
                        
                        {/* 🚀 PHASE 5: Continue using the unified GroupMembersTab component */}
                        {activeTab === 'members' && (
                            <GroupMembersTab 
                                group={group}
                                user={user}
                                onGroupUpdate={handleGroupUpdate}
                            />
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <GroupInviteLink group={group} />
                        
                        {/* Show voter status only when voting is active */}
                        {showLiveVoting && currentLiveSession && (
                            <VoterStatusPanel 
                                sessionId={currentLiveSession.id}
                                groupId={groupId}
                            />
                        )}
                        
                        {/* Quick Stats */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                            <h3 className="text-white font-semibold mb-4 flex items-center">
                                <span className="text-xl mr-2">📊</span>
                                Quick Stats
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-white/70">Members:</span>
                                    <span className="text-white font-bold">{group.current_members}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/70">Max Members:</span>
                                    <span className="text-white font-bold">{group.max_members}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/70">Active Sessions:</span>
                                    <span className="text-coral-400 font-bold">{activeSessions.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/70">Live Voting:</span>
                                    <span className={`font-bold text-sm ${showLiveVoting ? 'text-red-400' : 'text-gray-400'}`}>
                                        {showLiveVoting ? '🔴 Active' : '⚫ None'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/70">Created:</span>
                                    <span className="text-white/60 text-sm">{new Date(group.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/70">Visibility:</span>
                                    <span className={`text-sm font-medium ${group.is_public ? 'text-green-300' : 'text-blue-300'}`}>
                                        {group.is_public ? 'Public' : 'Private'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Steam Status */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                            <h3 className="text-white font-semibold mb-4 flex items-center">
                                <span className="text-xl mr-2">🎮</span>
                                Steam Integration
                            </h3>
                            <div className="space-y-3">
                                {group.members && group.members.length > 0 ? (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <span className="text-white/70">Connected Members:</span>
                                            <span className="text-green-400 font-bold">
                                                {group.members.filter(m => m.steam_connected).length}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-white/70">Not Connected:</span>
                                            <span className="text-red-400 font-bold">
                                                {group.members.filter(m => !m.steam_connected).length}
                                            </span>
                                        </div>
                                        <div className="w-full bg-white/10 rounded-full h-2 mt-3">
                                            <div 
                                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                                style={{ 
                                                    width: `${(group.members.filter(m => m.steam_connected).length / group.members.length) * 100}%` 
                                                }}
                                            ></div>
                                        </div>
                                        <p className="text-white/60 text-xs mt-2">
                                            {Math.round((group.members.filter(m => m.steam_connected).length / group.members.length) * 100)}% Steam connected
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-white/60 text-sm">No members to display Steam status</p>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                            <h3 className="text-white font-semibold mb-4 flex items-center">
                                <span className="text-xl mr-2">⚡</span>
                                Quick Actions
                            </h3>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => setActiveTab('vote')}
                                    className={`w-full p-3 rounded-lg text-left transition-colors duration-200 ${
                                        activeTab === 'vote' 
                                            ? 'bg-coral-500/20 text-coral-300 border border-coral-500/30' 
                                            : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'
                                    }`}
                                >
                                    <span className="text-lg mr-2">{showLiveVoting ? '🔴' : '🗳️'}</span>
                                    {showLiveVoting ? 'Join Live Voting' : 'Start Voting Session'}
                                </button>
                                
                                <button 
                                    onClick={() => setActiveTab('games')}
                                    className={`w-full p-3 rounded-lg text-left transition-colors duration-200 ${
                                        activeTab === 'games' 
                                            ? 'bg-coral-500/20 text-coral-300 border border-coral-500/30' 
                                            : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'
                                    }`}
                                >
                                    <span className="text-lg mr-2">🎮</span>
                                    View Common Games
                                </button>
                                
                                <button 
                                    onClick={() => setActiveTab('members')}
                                    className={`w-full p-3 rounded-lg text-left transition-colors duration-200 ${
                                        activeTab === 'members' 
                                            ? 'bg-coral-500/20 text-coral-300 border border-coral-500/30' 
                                            : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'
                                    }`}
                                >
                                    <span className="text-lg mr-2">👥</span>
                                    Manage Members
                                </button>
                                
                                {/* Quick link to results if available */}
                                {activeSessions.length > 0 && (
                                    <button 
                                        onClick={() => {
                                            const latestSession = activeSessions[0];
                                            navigate(`/sessions/${latestSession.id}/results`);
                                        }}
                                        className="w-full p-3 rounded-lg text-left transition-colors duration-200 bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30"
                                    >
                                        <span className="text-lg mr-2">📊</span>
                                        View Latest Results
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupPage;