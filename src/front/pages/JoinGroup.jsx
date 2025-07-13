import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // Add for user feedback (install if needed: npm i react-hot-toast)

const JoinGroup = () => {
    const { inviteCode } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [groupInfo, setGroupInfo] = useState(null);

    useEffect(() => {
        checkAuthAndJoin();
    }, [inviteCode]);

    const checkAuthAndJoin = async () => {
        const token = localStorage.getItem('squadup_access_token') || sessionStorage.getItem('squadup_access_token');
        
        if (!token) {
            sessionStorage.setItem('pending_invite', inviteCode);
            navigate('/login', { state: { from: `/join/${inviteCode}` } });
            return;
        }

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await fetch(`${backendUrl}/api/gaming/groups/join/${inviteCode}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                setGroupInfo(data.group);
                toast.success(`Successfully joined ${data.group.name}!`);
                // Clear pending invite if it exists
                sessionStorage.removeItem('pending_invite');
                // Redirect after short delay
                setTimeout(() => {
                    navigate('/dashboard', { 
                        state: { 
                            message: `Successfully joined ${data.group.name}!` 
                        } 
                    });
                }, 2000);
            } else {
                setError(data.error || 'Failed to join group');
                toast.error(data.error || 'Failed to join group');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center" role="status" aria-live="polite">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Joining group...</p>
                    <p className="text-white/60 text-sm mt-2">Invite code: {inviteCode}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Unable to Join Group</h2>
                    <p className="text-white/70 mb-6">{error}</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-all duration-300"
                        >
                            Go to Dashboard
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (groupInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
                    <div className="text-6xl mb-4 animate-bounce">🎉</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Welcome to {groupInfo.name}!</h2>
                    <p className="text-white/70 mb-2">You've successfully joined the group.</p>
                    <p className="text-white/60 text-sm">Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    return null;
};

export default JoinGroup;