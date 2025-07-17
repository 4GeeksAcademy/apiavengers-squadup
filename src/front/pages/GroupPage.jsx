// src/front/pages/GroupPage.jsx - ENHANCED WITH VOTER STATUS
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CommonGamesList from '../components/CommonGamesList';
import QuickVote from '../components/QuickVote';
import GroupInviteLink from '../components/GroupInviteLink';
import GroupActionButtons from '../components/GroupActionButtons';
import VoterStatusPanel from '../components/VoterStatusPanel'; // NEW
import VotingReminders from '../components/VotingReminders'; // NEW
import authService from '../store/authService';
import useGlobalReducer from '../hooks/useGlobalReducer';
import toast from 'react-hot-toast';

const GroupPage = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { store } = useGlobalReducer();
    const user = store.user;
    
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('vote'); // 'vote', 'games', 'members'
    const [activeSessions, setActiveSessions] = useState([]);
    const [currentSession, setCurrentSession] = useState(null); // NEW: Track current voting session

    useEffect(() => {
        if (groupId) {
            fetchGroupData();
            fetchActiveSessions();
        }
    }, [groupId]);

    const fetchGroupData = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${groupId}`);
            
            if (response.ok) {
                const data = await response.json();
                setGroup(data.group);
            } else if (response.status === 404) {
                toast.error("Group not found");
                navigate('/dashboard');
            } else if (response.status === 403) {
                toast.error("You don't have access to this group");
                navigate('/dashboard');
            } else {
                console.error("Failed to load group details.");
                toast.error("Failed to load group details");
            }
        } catch (err) {
            console.error("An unexpected error occurred while fetching group data.");
            toast.error("Network error loading group");
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveSessions = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            // Check for active session first
            const activeSessionResponse = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${groupId}/active-session`);
            
            if (activeSessionResponse.ok) {
                const activeData = await activeSessionResponse.json();
                if (activeData.session) {
                    setCurrentSession(activeData.session);
                }
            }
            
            // Then get all sessions
            const sessionsResponse = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${groupId}/sessions`);
            
            if (sessionsResponse.ok) {
                const data = await sessionsResponse.json();
                const activeSessions = data.sessions?.filter(s => s.status === 'voting' || s.status === 'completed') || [];
                setActiveSessions(activeSessions);
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
        }
    };

    const handleGroupUpdate = (action, wasDeleted) => {
        if (wasDeleted || action === 'deleted') {
            navigate('/dashboard', { 
                state: { message: `Group "${group?.name || 'Unknown'}" was deleted` }
            });
        } else if (action === 'left') {
            navigate('/dashboard', { 
                state: { message: `You left "${group?.name || 'the group'}"` }
            });
        }
    };

    // NEW: Handle reminder sending (placeholder implementation)
    const handleSendReminder = async (voterId) => {
        console.log('Sending reminder to voter:', voterId);
        toast.success('Reminder sent!', { duration: 2000 });
        
        // In a real implementation, you might call an API like:
        // await authService.authenticatedFetch(`${backendUrl}/api/gaming/sessions/${currentSession.id}/remind/${voterId}`, { method: 'POST' });
    };

    // NEW: Get pending voters for current session
    const getPendingVoters = () => {
        if (!currentSession || !group?.members) return [];
        
        const voteResults = JSON.parse(currentSession.vote_results || '{}');
        const voters = voteResults.voters || {};
        
        return group.members.filter(member => !voters[member.id.toString()]);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading Group...</p>
                </div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Group Not Found</h2>
                    <p className="text-white/70 mb-6">This group may have been deleted or you don't have access to it.</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const pendingVoters = getPendingVoters();
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-7xl mx-auto"> {/* Increased max width for better layout */}
                
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
                            <div key={session.id} className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-blue-300 font-semibold">
                                            {session.status === 'voting' ? '🗳️ Active Voting Session' : '🏆 Voting Complete'}
                                        </h3>
                                        <p className="text-blue-200 text-sm">{session.session_name}</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/sessions/${session.id}/results`)}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-sm transition-colors duration-200"
                                    >
                                        View {session.status === 'voting' ? 'Live Results' : 'Results'}
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
                            { id: 'vote', label: 'Vote & Play', icon: '🗳️' },
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
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Tab Content - Enhanced Grid Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    
                    {/* Main Content */}
                    <div className="xl:col-span-3">
                        {activeTab === 'vote' && (
                            <div className="space-y-6">
                                <QuickVote groupId={groupId} />
                                
                                {/* Recent Sessions */}
                                {activeSessions.length > 0 && (
                                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                                        <h3 className="text-white font-semibold mb-4 flex items-center">
                                            <span className="text-xl mr-2">📊</span>
                                            Recent Sessions
                                        </h3>
                                        <div className="space-y-3">
                                            {activeSessions.slice(0, 3).map(session => (
                                                <div key={session.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                                    <div>
                                                        <p className="text-white font-medium">{session.session_name}</p>
                                                        <p className="text-white/60 text-sm">
                                                            {session.status === 'voting' ? 'Active voting' : 'Completed'} • 
                                                            {new Date(session.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => navigate(`/sessions/${session.id}/results`)}
                                                        className="px-3 py-1 bg-coral-500 hover:bg-coral-600 text-white text-sm rounded-lg transition-colors duration-200"
                                                    >
                                                        View
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {activeTab === 'games' && (
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                                <CommonGamesList groupId={groupId} />
                            </div>
                        )}
                        
                        {activeTab === 'members' && (
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                                <h3 className="text-white font-semibold mb-6 flex items-center">
                                    <span className="text-xl mr-2">👥</span>
                                    Squad Members ({group.current_members})
                                </h3>
                                <div className="space-y-4">
                                    {group.members && group.members.length > 0 ? (
                                        group.members.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center">
                                                        <span className="text-white font-bold">
                                                            {member.username?.[0]?.toUpperCase() || 'U'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-medium">{member.username}</h4>
                                                        <div className="flex items-center space-x-3 text-sm text-white/60">
                                                            {member.steam_connected ? (
                                                                <>
                                                                    <span className="flex items-center space-x-1">
                                                                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                                                        <span>Steam Connected</span>
                                                                    </span>
                                                                    {member.total_games && (
                                                                        <span>{member.total_games} games</span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="flex items-center space-x-1">
                                                                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                                                    <span>No Steam</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    {member.id === group.creator?.id && (
                                                        <span className="px-2 py-1 bg-coral-500/20 text-coral-300 border border-coral-500/30 rounded text-xs">
                                                            Creator
                                                        </span>
                                                    )}
                                                    {member.gaming_style && (
                                                        <span className="px-2 py-1 bg-white/10 text-white/70 rounded text-xs">
                                                            {member.gaming_style}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="text-4xl mb-4">👥</div>
                                            <p className="text-white/70">No members found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Enhanced Sidebar */}
                    <div className="space-y-6">
                        {/* NEW: Show voter status if there's an active voting session */}
                        {currentSession && activeTab === 'vote' && (
                            <VoterStatusPanel 
                                session={currentSession} 
                                groupMembers={group.members || []} 
                            />
                        )}
                        
                        {/* NEW: Show voting reminders for pending voters */}
                        {pendingVoters.length > 0 && currentSession?.status === 'voting' && activeTab === 'vote' && (
                            <VotingReminders 
                                pendingVoters={pendingVoters}
                                onSendReminder={handleSendReminder}
                            />
                        )}
                        
                        <GroupInviteLink group={group} />
                        
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

                        {/* Group Actions */}
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
                                    <span className="text-lg mr-2">🗳️</span>
                                    Start Voting Session
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupPage;