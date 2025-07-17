// src/front/components/GroupActionButtons.jsx
// Enhanced component with proper Leave vs Delete buttons

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import authService from '../store/authService';
import { leaveGroup, deleteGroup, transferGroupOwnership } from '../store/actions.js';

const GroupActionButtons = ({ group, user, onGroupUpdate, className = "" }) => {
    const [loading, setLoading] = useState(false);
    const isCreator = group.creator?.id === user.id;
    const memberCount = group.current_members || 0;

    const handleLeaveGroup = async () => {
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
                        toast.success(data.message);
                }
                
                // Update the parent component
                onGroupUpdate('left', data.group_deleted);
                
            } else {
                toast.error(`Failed to leave group: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error leaving group:', error);
            toast.error("Network error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGroup = async () => {
        const warningMessage = `⚠️ DELETE "${group.name}" PERMANENTLY?\n\n` +
                              `This will:\n` +
                              `• Remove ALL ${memberCount} members\n` +
                              `• Delete ALL game sessions\n` +
                              `• Cannot be undone\n\n` +
                              `Type "DELETE" to confirm:`;

        const confirmation = prompt(warningMessage);
        
        if (confirmation !== 'DELETE') {
            if (confirmation !== null) { // Only show message if they didn't cancel
                toast.error('You must type "DELETE" exactly to confirm.');
            }
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading("Deleting group...");
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${group.id}/delete`, {
                method: 'DELETE'
            });

            const data = await response.json();
            toast.dismiss(loadingToast);

            if (response.ok && data.success) {
                toast.success(`🗑️ Group "${group.name}" deleted successfully.`);
                
                // Update the parent component
                onGroupUpdate('deleted', true);
                
            } else {
                toast.error(`Failed to delete group: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error deleting group:', error);
            toast.error("Network error occurred.");
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