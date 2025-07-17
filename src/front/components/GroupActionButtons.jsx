// src/front/components/GroupActionButtons.jsx
// FIXED VERSION - Addresses undefined group IDs and improves error handling

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import authService from '../store/authService';

const GroupActionButtons = ({ group, user, onGroupUpdate, className = "" }) => {
    const [loading, setLoading] = useState(false);
    
    // CRITICAL FIX: Validate inputs before proceeding
    if (!group || !group.id || !user || !user.id) {
        console.error('❌ GroupActionButtons: Missing required props', { 
            groupId: group?.id, 
            userId: user?.id,
            group: !!group,
            user: !!user
        });
        return (
            <div className={`text-red-300 text-sm p-2 ${className}`}>
                ⚠️ Invalid group data
            </div>
        );
    }
    
    const isCreator = group.creator?.id === user.id;
    const memberCount = group.current_members || 0;

    const handleLeaveGroup = async () => {
        // ENHANCED: Better validation before action
        if (!group.id || !user.id) {
            toast.error('Cannot leave group: Invalid group or user data');
            return;
        }

        const warningMessage = isCreator 
            ? `Are you sure you want to leave "${group.name}"?\n\n` +
              (memberCount > 1 
                ? `⚠️ As the creator, ownership will be transferred to another member.`
                : `⚠️ As the creator and last member, this group will be DELETED permanently.`)
            : `Are you sure you want to leave "${group.name}"?`;

        if (!window.confirm(warningMessage)) {
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading(isCreator ? "Processing..." : "Leaving group...");
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            // CRITICAL FIX: Ensure group.id is valid before making request
            if (!group.id || group.id === 'undefined') {
                throw new Error('Invalid group ID');
            }
            
            console.log('🚪 Leaving group:', group.id, 'User:', user.id);
            
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${group.id}/leave`, {
                method: 'POST'
            });

            const data = await response.json();
            toast.dismiss(loadingToast);

            if (response.ok && data.success) {
                // Handle different action types from backend
                switch (data.action) {
                    case 'left_with_transfer':
                        toast.success(`✅ Left group. Ownership transferred to ${data.new_creator}.`);
                        break;
                    case 'auto_deleted':
                    case 'auto_deleted_manual':
                        toast.success(`🗑️ Group was deleted (you were the last member).`);
                        break;
                    case 'member_left':
                        toast.success(`👋 Successfully left "${group.name}".`);
                        break;
                    default:
                        toast.success(data.message || 'Successfully left group');
                }
                
                // ENHANCED: Pass the actual group ID to parent
                if (onGroupUpdate) {
                    onGroupUpdate('left', data.group_deleted, group.id);
                }
                
            } else {
                const errorMessage = data.error || `HTTP ${response.status}`;
                toast.error(`Failed to leave group: ${errorMessage}`);
                console.error('Leave group failed:', response.status, data);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error leaving group:', error);
            
            // ENHANCED: Better error messages
            if (error.message.includes('Invalid group ID')) {
                toast.error("Invalid group data. Please refresh the page.");
            } else if (error.message.includes('Network')) {
                toast.error("Network error. Please check your connection.");
            } else {
                toast.error("An unexpected error occurred.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGroup = async () => {
        // ENHANCED: Better validation
        if (!group.id || !user.id || !isCreator) {
            toast.error('Cannot delete group: Invalid permissions or data');
            return;
        }

        const warningMessage = `⚠️ DELETE "${group.name}" PERMANENTLY?\n\n` +
                              `This will:\n` +
                              `• Remove ALL ${memberCount} members\n` +
                              `• Delete ALL game sessions\n` +
                              `• Cannot be undone\n\n` +
                              `Type "DELETE" to confirm:`;

        const confirmation = prompt(warningMessage);
        
        if (confirmation !== 'DELETE') {
            if (confirmation !== null) {
                toast.error('You must type "DELETE" exactly to confirm.');
            }
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading("Deleting group...");
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            // CRITICAL FIX: Validate group ID before request
            if (!group.id || group.id === 'undefined') {
                throw new Error('Invalid group ID');
            }
            
            console.log('🗑️ Deleting group:', group.id, 'by user:', user.id);
            
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${group.id}/delete`, {
                method: 'DELETE'
            });

            const data = await response.json();
            toast.dismiss(loadingToast);

            if (response.ok && data.success) {
                toast.success(`🗑️ Group "${group.name}" deleted successfully.`);
                
                // ENHANCED: Pass the actual group ID to parent
                if (onGroupUpdate) {
                    onGroupUpdate('deleted', true, group.id);
                }
                
            } else {
                const errorMessage = data.error || `HTTP ${response.status}`;
                toast.error(`Failed to delete group: ${errorMessage}`);
                console.error('Delete group failed:', response.status, data);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error deleting group:', error);
            
            // ENHANCED: Better error messages
            if (error.message.includes('Invalid group ID')) {
                toast.error("Invalid group data. Please refresh the page.");
            } else if (error.message.includes('Network')) {
                toast.error("Network error. Please check your connection.");
            } else {
                toast.error("An unexpected error occurred.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`flex space-x-2 ${className}`}>
            {/* LEAVE BUTTON - Available to everyone */}
            <button
                onClick={handleLeaveGroup}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/30 text-yellow-300 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                title={isCreator ? "Leave group (may transfer ownership or delete if empty)" : "Leave group"}
            >
                <span>👋</span>
                <span>{loading ? '...' : 'Leave'}</span>
            </button>

            {/* DELETE BUTTON - Only for creators */}
            {isCreator && (
                <button
                    onClick={handleDeleteGroup}
                    disabled={loading}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-300 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center"
                    title="Delete group permanently (creator only)"
                >
                    <span>{loading ? '⏳' : '🗑️'}</span>
                </button>
            )}
        </div>
    );
};

export default GroupActionButtons;