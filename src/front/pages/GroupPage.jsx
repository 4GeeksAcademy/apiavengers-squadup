import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // 🔧 ADDED: useNavigate
import CommonGamesList from '../components/CommonGamesList';
import QuickVote from '../components/QuickVote';
import GroupInviteLink from '../components/GroupInviteLink';
import GroupActionButtons from '../components/GroupActionButtons'; // 🔧 ADDED: New component
import authService from '../store/authService';
import useGlobalReducer from '../hooks/useGlobalReducer'; // 🔧 ADDED: For user state

const GroupPage = () => {
    const { groupId } = useParams();
    const navigate = useNavigate(); // 🔧 ADDED: For navigation after leave/delete
    const { store } = useGlobalReducer(); // 🔧 ADDED: Get user from global state
    const user = store.user; // 🔧 ADDED: Extract user
    
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch the group's data when the page loads
    useEffect(() => {
        const fetchGroupData = async () => {
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${groupId}`);
                
                if (response.ok) {
                    const data = await response.json();
                    setGroup(data.group); // Store the fetched group data in state
                } else {
                    console.error("Failed to load group details.");
                }
            } catch (err) {
                console.error("An unexpected error occurred while fetching group data.");
            } finally {
                setLoading(false);
            }
        };

        fetchGroupData();
    }, [groupId]); // This effect re-runs if you navigate from one group page to another

    // 🔧 ADDED: Handle group updates (leave/delete actions)
    const handleGroupUpdate = (action, wasDeleted) => {
        if (wasDeleted || action === 'deleted') {
            // Group was deleted, redirect to dashboard
            navigate('/dashboard', { 
                state: { message: `Group "${group?.name || 'Unknown'}" was deleted` }
            });
        } else if (action === 'left') {
            // User left the group, redirect to dashboard  
            navigate('/dashboard', { 
                state: { message: `You left "${group?.name || 'the group'}"` }
            });
        }
        // For other actions, could refresh group data if needed
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading Group...</div>;
    }

    if (!group) {
        return <div className="min-h-screen flex items-center justify-center text-white">Group not found.</div>;
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-6xl mx-auto">
                {/* 🔧 ENHANCED: Header with group actions */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">{group.name}</h1>
                        <p className="text-white/70">{group.description}</p>
                    </div>
                    
                    {/* 🔧 ADDED: Group management buttons for authenticated users */}
                    {user && group && (
                        <div className="flex items-center space-x-4">
                            <GroupActionButtons 
                                group={group} 
                                user={user} 
                                onGroupUpdate={handleGroupUpdate}
                            />
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main content area for voting and game lists */}
                    <div className="lg:col-span-2 space-y-8">
                        <QuickVote groupId={groupId} />
                        <div className="backdrop-blur-xl bg-white/10 p-6 rounded-2xl">
                           <CommonGamesList groupId={groupId} />
                        </div>
                    </div>

                    {/* Sidebar for invites and other info */}
                    <div className="space-y-6">
                        {/* Invite link component */}
                        <GroupInviteLink group={group} />
                        
                        {/* 🔧 ADDED: Enhanced Group Info Card */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                            <h3 className="text-white font-semibold mb-4 flex items-center">
                                <span className="text-xl mr-2">👥</span>
                                Group Info
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-white/70">Members:</span>
                                    <span className="text-white">{group.current_members}/{group.max_members}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/70">Creator:</span>
                                    <span className="text-white">{group.creator?.username || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/70">Created:</span>
                                    <span className="text-white">{new Date(group.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/70">Visibility:</span>
                                    <span className="text-white">{group.is_public ? 'Public' : 'Private'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/70">Invite Code:</span>
                                    <span className="text-white font-mono text-xs">{group.invite_code}</span>
                                </div>
                                
                                {/* 🔧 ADDED: Show creator badge if current user is the creator */}
                                {user && group.creator?.id === user.id && (
                                    <div className="pt-2 mt-3 border-t border-white/10">
                                        <span className="text-coral-300 text-xs flex items-center">
                                            <span className="mr-1">🏆</span>
                                            You are the group creator
                                        </span>
                                    </div>
                                )}
                                
                                {/* 🔧 ADDED: Show member status if current user is a regular member */}
                                {user && group.creator?.id !== user.id && (
                                    <div className="pt-2 mt-3 border-t border-white/10">
                                        <span className="text-blue-300 text-xs flex items-center">
                                            <span className="mr-1">👤</span>
                                            You are a group member
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 🔧 ADDED: Member List Card (basic version) */}
                        {group.members && group.members.length > 0 && (
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                                <h3 className="text-white font-semibold mb-4 flex items-center">
                                    <span className="text-xl mr-2">👥</span>
                                    Members ({group.current_members})
                                </h3>
                                <div className="space-y-2">
                                    {group.members.slice(0, 5).map((member, index) => (
                                        <div key={member.id || index} className="flex items-center justify-between py-2">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs font-bold">
                                                        {member.username?.[0]?.toUpperCase() || 'U'}
                                                    </span>
                                                </div>
                                                <span className="text-white text-sm">{member.username}</span>
                                            </div>
                                            {member.id === group.creator?.id && (
                                                <span className="text-coral-300 text-xs">Creator</span>
                                            )}
                                        </div>
                                    ))}
                                    {group.current_members > 5 && (
                                        <div className="text-white/60 text-xs pt-2">
                                            +{group.current_members - 5} more members
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupPage;