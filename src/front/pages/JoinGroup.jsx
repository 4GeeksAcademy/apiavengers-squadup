// src/front/pages/JoinGroup.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../store/authService';
import useGlobalReducer from '../hooks/useGlobalReducer';

const JoinGroup = () => {
    const { inviteCode } = useParams();
    const navigate = useNavigate();
    const { store } = useGlobalReducer();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [groupInfo, setGroupInfo] = useState(null);
    const [validating, setValidating] = useState(false);

    useEffect(() => {
        // Wait for auth to be ready before proceeding
        if (store.authLoading) {
            console.log('🔄 JoinGroup: Waiting for auth to complete...');
            return;
        }

        if (!store.isAuthenticated) {
            console.log('🚪 JoinGroup: User not authenticated, storing invite and redirecting to login');
            sessionStorage.setItem('pending_invite', inviteCode);
            navigate('/login', { 
                state: { 
                    from: { pathname: `/join/${inviteCode}` },
                    message: 'Please log in to join the group'
                } 
            });
            return;
        }

        // User is authenticated, proceed with joining
        handleAuthenticatedJoin();
    }, [inviteCode, store.isAuthenticated, store.authLoading, navigate]);

    const handleAuthenticatedJoin = async () => {
        console.log('🔗 JoinGroup: Authenticated user attempting to join group with code:', inviteCode);
        
        setLoading(true);
        setError(null);

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            // First, validate the invite code and get group info
            console.log('🔍 Validating invite code...');
            const validateResponse = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/validate-invite/${inviteCode}`
            );

            if (!validateResponse.ok) {
                const errorData = await validateResponse.json();
                throw new Error(errorData.error || 'Invalid invite code');
            }

            const validateData = await validateResponse.json();
            console.log('✅ Invite code validated:', validateData);
            
            setGroupInfo(validateData.group);
            
            // Check user status
            if (validateData.user_status.is_member) {
                toast.success(`You're already a member of "${validateData.group.name}"`);
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
                return;
            }

            if (validateData.user_status.is_full) {
                setError(`Group "${validateData.group.name}" is full (${validateData.group.current_members}/${validateData.group.max_members} members)`);
                return;
            }

            // Proceed to join the group
            console.log('🎯 Attempting to join group...');
            const joinResponse = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/join/${inviteCode}`,
                { method: 'POST' }
            );

            const joinData = await joinResponse.json();

            if (joinResponse.ok && joinData.success) {
                console.log('🎉 Successfully joined group:', joinData.group.name);
                setGroupInfo(joinData.group);
                toast.success(`Successfully joined "${joinData.group.name}"!`);
                
                // Clear any pending invite
                sessionStorage.removeItem('pending_invite');
                
                // Redirect to dashboard after success
                setTimeout(() => {
                    navigate('/dashboard', { 
                        state: { 
                            message: `Successfully joined "${joinData.group.name}"!`,
                            newGroupId: joinData.group.id
                        } 
                    });
                }, 2000);
            } else {
                throw new Error(joinData.error || 'Failed to join group');
            }
        } catch (error) {
            console.error('❌ Error in handleAuthenticatedJoin:', error);
            
            let errorMessage = error.message || 'Unknown error occurred';
            
            // Enhanced error handling
            if (error.message.includes('Invalid invite code') || error.message.includes('404')) {
                errorMessage = 'This invite link is invalid or has expired';
            } else if (error.message.includes('400')) {
                errorMessage = 'Unable to join group - it may be full or you may already be a member';
            } else if (error.message.includes('403')) {
                errorMessage = 'You do not have permission to join this group';
            } else if (error.message.includes('Network')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            }
            
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        setError(null);
        handleAuthenticatedJoin();
    };

    const handleGoToDashboard = () => {
        navigate('/dashboard');
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
                    <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {store.authLoading ? 'Checking authentication...' : 'Joining group...'}
                    </h2>
                    <p className="text-white/60 text-sm">
                        Invite code: <span className="font-mono">{inviteCode}</span>
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Unable to Join Group</h2>
                    <p className="text-white/70 mb-6">{error}</p>
                    
                    {groupInfo && (
                        <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
                            <h3 className="text-white font-semibold mb-2">{groupInfo.name}</h3>
                            <p className="text-white/60 text-sm mb-2">{groupInfo.description || 'No description'}</p>
                            <p className="text-white/50 text-xs">
                                {groupInfo.current_members}/{groupInfo.max_members} members
                            </p>
                        </div>
                    )}
                    
                    <div className="space-y-3">
                        <button
                            onClick={handleRetry}
                            className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={handleGoToDashboard}
                            className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
                        >
                            Go to Dashboard
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white/70 font-medium rounded-xl transition-colors duration-200"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Success state (groupInfo is set)
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>
                <h2 className="text-2xl font-bold text-white mb-4">
                    Welcome to {groupInfo?.name || 'the group'}!
                </h2>
                <p className="text-white/70 mb-2">You've successfully joined the group.</p>
                <p className="text-white/60 text-sm mb-4">Redirecting to dashboard...</p>
                
                {groupInfo && (
                    <div className="bg-white/5 rounded-xl p-4 mb-4">
                        <div className="text-white/80 text-sm space-y-1">
                            <p><strong>Members:</strong> {groupInfo.current_members}/{groupInfo.max_members}</p>
                            {groupInfo.description && (
                                <p><strong>Description:</strong> {groupInfo.description}</p>
                            )}
                            {groupInfo.creator && (
                                <p><strong>Created by:</strong> {groupInfo.creator.username}</p>
                            )}
                        </div>
                    </div>
                )}
                
                <button
                    onClick={handleGoToDashboard}
                    className="px-4 py-2 text-white/60 hover:text-white text-sm transition-colors duration-200"
                >
                    Go to Dashboard Now →
                </button>
            </div>
        </div>
    );
};

export default JoinGroup;