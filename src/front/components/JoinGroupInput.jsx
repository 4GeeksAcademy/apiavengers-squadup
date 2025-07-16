// src/front/components/JoinGroupInput.jsx - NEW COMPONENT
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import authService from '../store/authService';

const JoinGroupInput = ({ onGroupJoined }) => {
    const [inviteInput, setInviteInput] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [showInput, setShowInput] = useState(false);

    const extractInviteCode = (input) => {
        // Handle full URLs like: https://domain.com/join/ABC123DEF
        const urlMatch = input.match(/\/join\/([A-Z0-9]{8})/i);
        if (urlMatch) {
            return urlMatch[1];
        }
        
        // Handle just the invite code: ABC123DEF
        const codeMatch = input.match(/^([A-Z0-9]{8})$/i);
        if (codeMatch) {
            return codeMatch[1];
        }
        
        return null;
    };

    const handleJoinGroup = async () => {
        if (!inviteInput.trim()) {
            toast.error('Please enter an invite link or code');
            return;
        }

        const inviteCode = extractInviteCode(inviteInput.trim());
        
        if (!inviteCode) {
            toast.error('Invalid invite link or code format');
            return;
        }

        setIsJoining(true);
        const loadingToast = toast.loading('Joining group...');

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            // First validate the invite code
            const validateResponse = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/validate-invite/${inviteCode}`
            );

            if (!validateResponse.ok) {
                const errorData = await validateResponse.json();
                throw new Error(errorData.error || 'Invalid invite code');
            }

            const validateData = await validateResponse.json();
            
            // Check if user can join
            if (validateData.user_status.is_member) {
                toast.dismiss(loadingToast);
                toast.success(`You're already a member of "${validateData.group.name}"`);
                setInviteInput('');
                setShowInput(false);
                return;
            }

            if (validateData.user_status.is_full) {
                toast.dismiss(loadingToast);
                toast.error(`Group "${validateData.group.name}" is full`);
                return;
            }

            // Proceed to join
            const joinResponse = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/join/${inviteCode}`,
                { method: 'POST' }
            );

            const joinData = await joinResponse.json();
            toast.dismiss(loadingToast);

            if (joinResponse.ok && joinData.success) {
                if (joinData.already_member) {
                    toast.success(joinData.message);
                } else {
                    toast.success(`🎉 Joined "${joinData.group.name}"!`);
                    
                    // Notify parent component
                    if (onGroupJoined) {
                        onGroupJoined(joinData.group);
                    }
                }
                
                setInviteInput('');
                setShowInput(false);
            } else {
                toast.error(joinData.error || 'Failed to join group');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error joining group:', error);
            toast.error(error.message || 'Network error occurred');
        } finally {
            setIsJoining(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleJoinGroup();
        }
    };

    const handleCancel = () => {
        setInviteInput('');
        setShowInput(false);
    };

    if (!showInput) {
        return (
            <button
                onClick={() => setShowInput(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200 flex items-center space-x-2"
            >
                <span>🔗</span>
                <span>Join Group</span>
            </button>
        );
    }

    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
                <span className="text-xl mr-2">🔗</span>
                Join a Group
            </h3>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-white/70 text-sm mb-2">
                        Invite Link or Code
                    </label>
                    <input
                        type="text"
                        value={inviteInput}
                        onChange={(e) => setInviteInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Paste invite link or enter code (e.g., ABC123DEF)"
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        disabled={isJoining}
                        autoFocus
                    />
                    <p className="text-white/50 text-xs mt-1">
                        You can paste the full invite link or just the 8-character code
                    </p>
                </div>
                
                <div className="flex space-x-3">
                    <button
                        onClick={handleJoinGroup}
                        disabled={isJoining || !inviteInput.trim()}
                        className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isJoining ? 'Joining...' : 'Join Group'}
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={isJoining}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinGroupInput;