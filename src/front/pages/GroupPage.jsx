import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CommonGamesList from '../components/CommonGamesList';
import QuickVote from '../components/QuickVote';
// 1. IMPORT THE GroupInviteLink COMPONENT
import GroupInviteLink from '../components/GroupInviteLink'; 
import authService from '../store/authService';

const GroupPage = () => {
    const { groupId } = useParams();
    // 2. ADD STATE TO HOLD THE GROUP'S DETAILS
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);

    // 3. FETCH THE GROUP'S DATA WHEN THE PAGE LOADS
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

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading Group...</div>;
    }

    if (!group) {
        return <div className="min-h-screen flex items-center justify-center text-white">Group not found.</div>;
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-6xl mx-auto">
                {/* Use the fetched group name in the title */}
                <h1 className="text-4xl font-bold text-white mb-2">{group.name}</h1>
                <p className="text-white/70 mb-8">{group.description}</p>
                
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
                        {/* 4. PLACE THE INVITE LINK COMPONENT */}
                        <GroupInviteLink group={group} />
                        {/* You could add a member list component here in the future */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupPage;