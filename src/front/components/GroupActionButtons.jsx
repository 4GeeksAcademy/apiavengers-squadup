// src/front/components/GroupActionButtons.jsx - ENHANCED with validation helpers

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import authService from '../store/authService';
import { 
    validateGroupId, 
    validateGroupObject, 
    validateGroupPermissions, 
    safeGroupOperation,
    handleGroupError 
} from '../utils/groupValidation';

const GroupActionButtons = ({ group, user, onGroupUpdate, className = "" }) => {
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({});
    
    // 🔧 ENHANCED: Comprehensive validation before proceeding
    const validation = React.useMemo(() => {
        const errors = [];
        
        // Validate group
        if (!group) {
            errors.push('Group object is missing');
        } else {
            const groupValidation = validateGroupObject(group);
            if (!groupValidation.isValid) {
                errors.push(...groupValidation.errors);
            }
        }
        
        // Validate user
        if (!user || !user.id) {
            errors.push('User not authenticated');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }, [group, user]);
    
    // Early return for invalid props
    if (!validation.isValid) {
        console.error('❌ GroupActionButtons: Validation failed', validation.errors);
        return (
            <div className={`text-red-300 text-sm p-2 border border-red-500/30 rounded-lg bg-red-500/10 ${className}`}>
                <div className="flex items-center space-x-2">
                    <span>⚠️</span>
                    <div>
                        <div className="font-medium">Invalid Data</div>
                        <div className="text-xs text-red-200">
                            {validation.errors.slice(0, 2).join(', ')}
                            {validation.errors.length > 2 && ` (+${validation.errors.length - 2} more)`}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    const isCreator = group.creator?.id === user.id;
    const memberCount = group.current_members || group.members?.length || 0;

    // 🔧 ENHANCED: Better leave group handling with atomic operations
    const handleLeaveGroup = async () => {
        // Validate permissions
        const permissionCheck = validateGroupPermissions(user, group, 'leave');
        if (!permissionCheck.hasPermission) {
            toast.error(permissionCheck.reason);
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

        // Use safe operation wrapper
        const result = await safeGroupOperation(
            group.id,
            async (validatedGroupId) => {
                setLoading(true);
                setActionLoading(prev => ({ ...prev, leave: true }));
                
                const loadingToast = toast.loading(isCreator ? "Processing..." : "Leaving group...");
                
                try {
                    const backendUrl = import.meta.env.VITE_BACKEND_URL;
                    const response = await authService.authenticatedFetch(
                        `${backendUrl}/api/gaming/groups/${validatedGroupId}/leave`,
                        { method: 'POST' }
                    );

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
                        
                        return {
                            action: data.action,
                            groupDeleted: data.group_deleted,
                            newCreator: data.new_creator
                        };
                    } else {
                        throw new Error(data.error || `HTTP ${response.status}`);
                    }
                } finally {
                    toast.dismiss(loadingToast);
                    setLoading(false);
                    setActionLoading(prev => ({ ...prev, leave: false }));
                }
            },
            'leave group'
        );

        if (result.success && onGroupUpdate) {
            onGroupUpdate(result.data.action, result.data.groupDeleted, group.id);
        }
    };

    // 🔧 ENHANCED: Better delete group handling with atomic operations
    const handleDeleteGroup = async () => {
        // Validate permissions
        const permissionCheck = validateGroupPermissions(user, group, 'delete');
        if (!permissionCheck.hasPermission) {
            toast.error(permissionCheck.reason);
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

        // Use safe operation wrapper
        const result = await safeGroupOperation(
            group.id,
            async (validatedGroupId) => {
                setLoading(true);
                setActionLoading(prev => ({ ...prev, delete: true }));
                
                const loadingToast = toast.loading("Deleting group...");
                
                try {
                    const backendUrl = import.meta.env.VITE_BACKEND_URL;
                    const response = await authService.authenticatedFetch(
                        `${backendUrl}/api/gaming/groups/${validatedGroupId}`,
                        { method: 'DELETE' }
                    );

                    const data = await response.json();
                    toast.dismiss(loadingToast);

                    if (response.ok && data.success) {
                        toast.success(`🗑️ Group "${group.name}" deleted successfully.`);
                        return { action: 'deleted', groupDeleted: true };
                    } else {
                        throw new Error(data.error || `HTTP ${response.status}`);
                    }
                } finally {
                    toast.dismiss(loadingToast);
                    setLoading(false);
                    setActionLoading(prev => ({ ...prev, delete: false }));
                }
            },
            'delete group'
        );

        if (result.success && onGroupUpdate) {
            onGroupUpdate('deleted', true, group.id);
        }
    };

    // 🔧 NEW: Handle refresh group data
    const handleRefreshGroup = async () => {
        const result = await safeGroupOperation(
            group.id,
            async (validatedGroupId) => {
                setActionLoading(prev => ({ ...prev, refresh: true }));
                
                try {
                    const backendUrl = import.meta.env.VITE_BACKEND_URL;
                    const response = await authService.authenticatedFetch(
                        `${backendUrl}/api/gaming/groups/${validatedGroupId}`
                    );

                    if (response.ok) {
                        const data = await response.json();
                        toast.success('Group data refreshed');
                        return data.group;
                    } else {
                        throw new Error('Failed to refresh group data');
                    }
                } finally {
                    setActionLoading(prev => ({ ...prev, refresh: false }));
                }
            },
            'refresh group data'
        );

        if (result.success && onGroupUpdate) {
            onGroupUpdate('refreshed', false, result.data);
        }
    };

    // 🔧 ENHANCED: Better loading states
    const isAnyActionLoading = loading || Object.values(actionLoading).some(Boolean);

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {/* REFRESH BUTTON - Available to all members */}
            <button
                onClick={handleRefreshGroup}
                disabled={isAnyActionLoading}
                className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-300 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                title="Refresh group data"
            >
                <span className={actionLoading.refresh ? 'animate-spin' : ''}>🔄</span>
                <span className="hidden sm:inline">{actionLoading.refresh ? 'Syncing...' : 'Refresh'}</span>
            </button>

            {/* LEAVE BUTTON - Available to everyone */}
            <button
                onClick={handleLeaveGroup}
                disabled={isAnyActionLoading}
                className="flex-1 min-w-0 px-3 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/30 text-yellow-300 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                title={isCreator ? "Leave group (may transfer ownership or delete if empty)" : "Leave group"}
            >
                <span>👋</span>
                <span className="truncate">
                    {actionLoading.leave ? 'Leaving...' : 'Leave'}
                </span>
            </button>

            {/* DELETE BUTTON - Only for creators */}
            {isCreator && (
                <button
                    onClick={handleDeleteGroup}
                    disabled={isAnyActionLoading}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-300 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                    title="Delete group permanently (creator only)"
                >
                    <span>{actionLoading.delete ? '⏳' : '🗑️'}</span>
                    <span className="hidden sm:inline">
                        {actionLoading.delete ? 'Deleting...' : 'Delete'}
                    </span>
                </button>
            )}

            {/* 🔧 NEW: Additional Creator Actions */}
            {isCreator && (
                <div className="flex gap-2">
                    <button
                        onClick={() => toast.info('Edit group feature coming soon!')}
                        disabled={isAnyActionLoading}
                        className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-300 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center"
                        title="Edit group settings (coming soon)"
                    >
                        <span>⚙️</span>
                        <span className="hidden lg:inline ml-1">Settings</span>
                    </button>
                </div>
            )}
            
            {/* 🔧 ENHANCED: Action Status Indicator */}
            {isAnyActionLoading && (
                <div className="flex items-center text-white/60 text-xs">
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-1"></div>
                    <span>Processing...</span>
                </div>
            )}
        </div>
    );
};

export default GroupActionButtons;