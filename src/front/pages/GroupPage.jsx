// src/front/pages/GroupPage.jsx - Enhanced with gaming state management and new features
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchGroupDetails, fetchGroupMembers, startVotingSession } from '../store/actions.js';
import useGlobalReducer from '../hooks/useGlobalReducer'; // Fixed: default import
import { getGamingSelectors, ACTION_TYPES } from '../store/store.js';

// Import components
import GroupMembersTab from '../components/GroupMembersTab';
import GroupActionButtons from '../components/GroupActionButtons';
import QuickVote from '../components/QuickVote';
import VoterStatusPanel from '../components/VoterStatusPanel';
import CommonGamesList from '../components/CommonGamesList';

const GroupPage = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { store, dispatch } = useGlobalReducer();
    const selectors = getGamingSelectors(store);
    
    // Local state
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Global state
    const user = store.user;
    const currentGroup = selectors.getCurrentGroup();
    const groupMembers = selectors.getGroupMembers();
    const activeSession = selectors.getActiveSession();
    const isGroupLoading = selectors.isGroupLoading();
    const groupError = selectors.getGroupError();

    // Check if current group matches URL parameter
    const isCorrectGroup = currentGroup?.id === parseInt(groupId);

    useEffect(() => {
        loadGroupData();
    }, [groupId, dispatch]);

    const loadGroupData = async () => {
        if (!groupId || !user) {
            setError('Invalid group or user not authenticated');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Fetch group details
            const groupResult = await fetchGroupDetails(dispatch, groupId);
            
            if (!groupResult.success) {
                throw new Error(groupResult.error || 'Failed to load group');
            }

            // Update current group in global state
            dispatch({
                type: ACTION_TYPES.SET_CURRENT_GROUP,
                payload: groupResult.group
            });

            // Fetch group members
            const membersResult = await fetchGroupMembers(dispatch, groupId);
            
            if (membersResult.success) {
                dispatch({
                    type: ACTION_TYPES.SET_GROUP_MEMBERS,
                    payload: membersResult.members
                });
            }

            // Check for active voting session
            await checkActiveSession();

        } catch (err) {
            console.error('Error loading group data:', err);
            setError(err.message);
            
            // If group not found or access denied, redirect to dashboard
            if (err.message.includes('not found') || err.message.includes('not a member')) {
                toast.error('Group not found or access denied');
                setTimeout(() => navigate('/dashboard'), 2000);
            }
        } finally {
            setLoading(false);
        }
    };

    const checkActiveSession = async () => {
        try {
            // This would be implemented when you have the endpoint
            // const sessionResult = await fetchActiveSession(dispatch, groupId);
            // if (sessionResult.success && sessionResult.session) {
            //     dispatch({
            //         type: ACTION_TYPES.SET_ACTIVE_SESSION,
            //         payload: sessionResult.session
            //     });
            // }
        } catch (error) {
            console.error('Error checking active session:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadGroupData();
        setRefreshing(false);
        toast.success('Group data refreshed');
    };

    const handleGroupUpdate = (action, groupDeleted, details) => {
        switch (action) {
            case 'member_kicked':
                toast.success(`Member removed from group`);
                // Group members are already updated by the component
                break;
            
            case 'ownership_transferred':
                toast.success(`Ownership transferred to ${details.newCreatorUsername}`);
                // Update current group with new creator
                if (currentGroup) {
                    dispatch({
                        type: ACTION_TYPES.SET_CURRENT_GROUP,
                        payload: {
                            ...currentGroup,
                            creator: {
                                id: details.newCreatorId,
                                username: details.newCreatorUsername
                            }
                        }
                    });
                }
                break;
            
            case 'member_left':
            case 'left_with_transfer':
                if (details.newCreator) {
                    toast.info(`You left the group. Ownership transferred to ${details.newCreator}`);
                } else {
                    toast.info('You left the group');
                }
                break;
            
            case 'auto_deleted':
            case 'creator_deleted':
                toast.info('Group has been deleted');
                break;
            
            default:
                console.log('Unknown group action:', action);
        }

        if (groupDeleted) {
            // Clear current group from state
            dispatch({ type: ACTION_TYPES.SET_CURRENT_GROUP, payload: null });
            dispatch({ type: ACTION_TYPES.SET_GROUP_MEMBERS, payload: [] });
        }
    };

    const handleVotingStart = (session, commonGames) => {
        toast.success(`Voting session "${session.session_name}" started!`);
        setActiveTab('voting');
    };

    // Check authentication
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔐</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
                    <p className="text-white/60 mb-6">Please log in to view this group</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl transition-colors"
                    >
                        Login
                    </button>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading || isGroupLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-coral-500/30 border-t-coral-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold text-white mb-2">Loading Group</h2>
                    <p className="text-white/60">Fetching the latest group information...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || groupError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Failed to Load Group</h2>
                    <p className="text-white/60 mb-6">{error || groupError}</p>
                    <div className="flex space-x-3 justify-center">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                        >
                            Back to Dashboard
                        </button>
                        <button
                            onClick={loadGroupData}
                            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // No group data
    if (!currentGroup || !isCorrectGroup) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">👥</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Group Not Found</h2>
                    <p className="text-white/60 mb-6">This group doesn't exist or you don't have access to it</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'members', label: 'Members', icon: '👥', badge: groupMembers.length },
        { id: 'games', label: 'Games', icon: '🎮' },
        { id: 'voting', label: 'Voting', icon: '🗳️', badge: activeSession ? 'ACTIVE' : null },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl transition-colors"
                            >
                                ← Back
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-white">{currentGroup.name}</h1>
                                <p className="text-white/60">{currentGroup.description}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="p-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl transition-colors disabled:opacity-50"
                                title="Refresh group data"
                            >
                                <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
                            </button>
                            
                            {/* Group Status Indicator */}
                            <div className="flex items-center space-x-2 px-3 py-2 bg-white/10 border border-white/20 rounded-xl">
                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                <span className="text-white/70 text-sm">Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Group Actions */}
                    <GroupActionButtons 
                        group={currentGroup} 
                        onGroupUpdate={handleGroupUpdate}
                        onVotingStart={handleVotingStart}
                    />
                </div>

                {/* Navigation Tabs */}
                <div className="mb-8">
                    <div className="flex space-x-1 bg-white/5 p-1 rounded-2xl">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? 'bg-coral-500 text-white shadow-lg'
                                        : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <span className="text-lg">{tab.icon}</span>
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        activeTab === tab.id 
                                            ? 'bg-white/20 text-white' 
                                            : 'bg-coral-500/20 text-coral-300'
                                    }`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="space-y-8">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Group Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                                    <div className="text-3xl font-bold text-coral-400 mb-2">{groupMembers.length}</div>
                                    <div className="text-white/70">Total Members</div>
                                </div>
                                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                                    <div className="text-3xl font-bold text-green-400 mb-2">
                                        {groupMembers.filter(m => m.steam_connected).length}
                                    </div>
                                    <div className="text-white/70">Steam Connected</div>
                                </div>
                                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                                    <div className="text-3xl font-bold text-blue-400 mb-2">
                                        {activeSession ? '1' : '0'}
                                    </div>
                                    <div className="text-white/70">Active Sessions</div>
                                </div>
                                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                                    <div className="text-3xl font-bold text-purple-400 mb-2">
                                        {new Date(currentGroup.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="text-white/70">Created</div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                                <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <button
                                        onClick={() => setActiveTab('members')}
                                        className="flex flex-col items-center space-y-2 p-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl transition-colors"
                                    >
                                        <span className="text-2xl">👥</span>
                                        <span className="text-white font-medium">View Members</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('games')}
                                        className="flex flex-col items-center space-y-2 p-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl transition-colors"
                                    >
                                        <span className="text-2xl">🎮</span>
                                        <span className="text-white font-medium">Browse Games</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('voting')}
                                        className="flex flex-col items-center space-y-2 p-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl transition-colors"
                                    >
                                        <span className="text-2xl">🗳️</span>
                                        <span className="text-white font-medium">Voting</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const frontendUrl = window.location.origin;
                                            const shareLink = `${frontendUrl}/join/${currentGroup.invite_code}`;
                                            navigator.clipboard.writeText(shareLink);
                                            toast.success('Invite link copied!');
                                        }}
                                        className="flex flex-col items-center space-y-2 p-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl transition-colors"
                                    >
                                        <span className="text-2xl">🔗</span>
                                        <span className="text-white font-medium">Copy Invite</span>
                                    </button>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                                <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                                        <span className="text-xl">👑</span>
                                        <div>
                                            <div className="text-white font-medium">
                                                {currentGroup.creator?.username} created this group
                                            </div>
                                            <div className="text-white/60 text-sm">
                                                {new Date(currentGroup.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    {activeSession && (
                                        <div className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                            <span className="text-xl">🗳️</span>
                                            <div>
                                                <div className="text-white font-medium">
                                                    Voting session "{activeSession.session_name}" is active
                                                </div>
                                                <div className="text-green-300 text-sm">
                                                    Click the Voting tab to participate
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {!activeSession && groupMembers.length >= 2 && (
                                        <div className="flex items-center space-x-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                            <span className="text-xl">💡</span>
                                            <div>
                                                <div className="text-white font-medium">Ready to vote for games!</div>
                                                <div className="text-blue-300 text-sm">
                                                    Start a voting session to choose what to play next
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <GroupMembersTab 
                            group={currentGroup} 
                            user={user} 
                            onGroupUpdate={handleGroupUpdate}
                        />
                    )}

                    {activeTab === 'games' && (
                        <CommonGamesList 
                            group={currentGroup}
                            members={groupMembers}
                        />
                    )}

                    {activeTab === 'voting' && (
                        <div className="space-y-6">
                            {activeSession ? (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Main Voting Component */}
                                    <div className="lg:col-span-2">
                                        <QuickVote 
                                            groupId={currentGroup.id}
                                            sessionId={activeSession.id}
                                            user={user}
                                        />
                                    </div>
                                    
                                    {/* Voter Status Panel */}
                                    <div className="lg:col-span-1">
                                        <VoterStatusPanel 
                                            sessionId={activeSession.id}
                                            groupMembers={groupMembers}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-12 text-center">
                                    <div className="text-6xl mb-4">🗳️</div>
                                    <h3 className="text-2xl font-bold text-white mb-4">No Active Voting Session</h3>
                                    <p className="text-white/60 mb-6">
                                        Start a voting session to let members choose the next game to play together.
                                    </p>
                                    
                                    {selectors.isCurrentUserGroupCreator() ? (
                                        <div className="space-y-4">
                                            <button
                                                onClick={() => {
                                                    // This would trigger the voting modal in GroupActionButtons
                                                    document.querySelector('[data-action="start-voting"]')?.click();
                                                }}
                                                disabled={groupMembers.length < 2}
                                                className="px-8 py-4 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                                            >
                                                🚀 Start Voting Session
                                            </button>
                                            {groupMembers.length < 2 && (
                                                <p className="text-yellow-300 text-sm">
                                                    ⚠️ Need at least 2 members to start voting
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-white/60 text-sm">
                                            Only the group creator can start voting sessions
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupPage;