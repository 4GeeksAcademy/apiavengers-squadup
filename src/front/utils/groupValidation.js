// src/front/utils/groupValidation.js - NEW FILE: Enhanced group validation helpers

import toast from 'react-hot-toast';

/**
 * Validates group ID with detailed error reporting
 * @param {any} groupId - The group ID to validate
 * @returns {object} - {isValid: boolean, normalizedId: number|null, error: string|null}
 */
export const validateGroupId = (groupId) => {
    // Check for null, undefined, or string representations
    if (!groupId || groupId === 'undefined' || groupId === 'null' || groupId === '') {
        console.error('❌ Invalid group ID received:', groupId);
        return {
            isValid: false,
            normalizedId: null,
            error: 'Invalid group ID provided'
        };
    }
    
    // Try to parse as integer
    try {
        const parsed = parseInt(groupId);
        if (isNaN(parsed) || parsed <= 0) {
            console.error('❌ Group ID must be a positive integer:', groupId);
            return {
                isValid: false,
                normalizedId: null,
                error: 'Group ID must be a positive integer'
            };
        }
        
        return {
            isValid: true,
            normalizedId: parsed,
            error: null
        };
    } catch (error) {
        console.error('❌ Error parsing group ID:', error);
        return {
            isValid: false,
            normalizedId: null,
            error: 'Invalid group ID format'
        };
    }
};

/**
 * Safe wrapper for group operations with atomic error handling
 * @param {number} groupId - Validated group ID
 * @param {Function} operation - Async operation to perform
 * @param {string} operationName - Name for logging/error messages
 * @returns {Promise<object>} - {success: boolean, data: any, error: string|null}
 */
export const safeGroupOperation = async (groupId, operation, operationName = 'operation') => {
    // Validate group ID first
    const validation = validateGroupId(groupId);
    if (!validation.isValid) {
        const error = `${operationName} failed: ${validation.error}`;
        console.error('❌', error);
        toast.error(error);
        return {
            success: false,
            data: null,
            error: validation.error
        };
    }
    
    try {
        console.log(`🔄 Starting ${operationName} for group ${validation.normalizedId}`);
        const result = await operation(validation.normalizedId);
        console.log(`✅ ${operationName} completed successfully`);
        
        return {
            success: true,
            data: result,
            error: null
        };
    } catch (error) {
        const errorMessage = `${operationName} failed: ${error.message}`;
        console.error('❌', errorMessage, error);
        
        // Don't show toast here - let the calling component decide
        return {
            success: false,
            data: null,
            error: error.message || 'Unknown error occurred'
        };
    }
};

/**
 * Validates group object structure
 * @param {object} group - Group object to validate
 * @returns {object} - {isValid: boolean, errors: string[]}
 */
export const validateGroupObject = (group) => {
    const errors = [];
    
    if (!group || typeof group !== 'object') {
        errors.push('Group must be a valid object');
        return { isValid: false, errors };
    }
    
    // Required fields
    if (!group.id) errors.push('Group missing ID');
    if (!group.name || typeof group.name !== 'string') errors.push('Group missing valid name');
    if (!group.creator) errors.push('Group missing creator information');
    
    // Optional but important fields
    if (group.current_members !== undefined && (typeof group.current_members !== 'number' || group.current_members < 0)) {
        errors.push('Invalid current_members count');
    }
    
    if (group.max_members !== undefined && (typeof group.max_members !== 'number' || group.max_members < 1)) {
        errors.push('Invalid max_members count');
    }
    
    if (group.invite_code && (typeof group.invite_code !== 'string' || !/^[A-Z0-9]{8}$/i.test(group.invite_code))) {
        errors.push('Invalid invite code format');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validates user permissions for group operations
 * @param {object} user - Current user object
 * @param {object} group - Group object
 * @param {string} operation - Operation type: 'view', 'manage', 'delete', 'kick', 'transfer'
 * @returns {object} - {hasPermission: boolean, reason: string|null}
 */
export const validateGroupPermissions = (user, group, operation) => {
    if (!user || !user.id) {
        return {
            hasPermission: false,
            reason: 'User not authenticated'
        };
    }
    
    const groupValidation = validateGroupObject(group);
    if (!groupValidation.isValid) {
        return {
            hasPermission: false,
            reason: `Invalid group: ${groupValidation.errors.join(', ')}`
        };
    }
    
    const isCreator = group.creator?.id === user.id;
    const isMember = group.members ? group.members.some(m => m.id === user.id) : false;
    
    switch (operation) {
        case 'view':
            return {
                hasPermission: isMember,
                reason: isMember ? null : 'You are not a member of this group'
            };
            
        case 'manage':
        case 'delete':
        case 'transfer':
            return {
                hasPermission: isCreator,
                reason: isCreator ? null : 'Only the group creator can perform this action'
            };
            
        case 'kick':
            return {
                hasPermission: isCreator,
                reason: isCreator ? null : 'Only the group creator can kick members'
            };
            
        case 'leave':
            return {
                hasPermission: isMember,
                reason: isMember ? null : 'You are not a member of this group'
            };
            
        default:
            return {
                hasPermission: false,
                reason: `Unknown operation: ${operation}`
            };
    }
};

/**
 * Enhanced error handler for group operations
 * @param {Error|object} error - Error object or response
 * @param {string} operation - Operation name for context
 * @param {object} options - Additional options
 * @returns {string} - User-friendly error message
 */
export const handleGroupError = (error, operation = 'operation', options = {}) => {
    const { showToast = true, logError = true } = options;
    
    let userMessage = '';
    let technicalMessage = '';
    
    if (typeof error === 'string') {
        userMessage = error;
        technicalMessage = error;
    } else if (error?.message) {
        technicalMessage = error.message;
        
        // Convert technical errors to user-friendly messages
        if (error.message.includes('Invalid group ID') || error.message.includes('undefined')) {
            userMessage = 'Invalid group information. Please refresh the page.';
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
            userMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('Authentication')) {
            userMessage = 'Authentication required. Please log in again.';
        } else if (error.message.includes('Permission') || error.message.includes('403')) {
            userMessage = 'You do not have permission to perform this action.';
        } else if (error.message.includes('Not found') || error.message.includes('404')) {
            userMessage = 'Group not found. It may have been deleted.';
        } else if (error.message.includes('Group is full')) {
            userMessage = 'Cannot join group - it is full.';
        } else {
            userMessage = `Failed to ${operation}. Please try again.`;
        }
    } else {
        userMessage = `An unexpected error occurred during ${operation}.`;
        technicalMessage = JSON.stringify(error);
    }
    
    if (logError) {
        console.error(`❌ Group ${operation} error:`, technicalMessage);
    }
    
    if (showToast) {
        toast.error(userMessage);
    }
    
    return userMessage;
};

/**
 * Safe API call wrapper for group operations
 * @param {Function} apiCall - Function that returns a Promise
 * @param {string} operation - Operation name for error handling
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Standardized response format
 */
export const safeGroupApiCall = async (apiCall, operation, options = {}) => {
    const { 
        retries = 1, 
        retryDelay = 1000, 
        showErrorToast = true,
        showSuccessToast = false,
        successMessage = null
    } = options;
    
    let lastError = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await apiCall();
            
            if (showSuccessToast && successMessage) {
                toast.success(successMessage);
            }
            
            return {
                success: true,
                data: result,
                error: null,
                attempt: attempt + 1
            };
        } catch (error) {
            lastError = error;
            console.warn(`⚠️ Attempt ${attempt + 1} failed for ${operation}:`, error.message);
            
            // Don't retry on certain errors
            if (error.message.includes('404') || 
                error.message.includes('403') || 
                error.message.includes('Invalid group ID')) {
                break;
            }
            
            // Wait before retry (except on last attempt)
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
    
    // All attempts failed
    const errorMessage = handleGroupError(lastError, operation, { showToast: showErrorToast });
    
    return {
        success: false,
        data: null,
        error: errorMessage,
        attempt: retries + 1
    };
};

/**
 * Validate member object structure
 * @param {object} member - Member object to validate
 * @returns {object} - {isValid: boolean, errors: string[]}
 */
export const validateMemberObject = (member) => {
    const errors = [];
    
    if (!member || typeof member !== 'object') {
        errors.push('Member must be a valid object');
        return { isValid: false, errors };
    }
    
    if (!member.id) errors.push('Member missing ID');
    if (!member.username || typeof member.username !== 'string') errors.push('Member missing valid username');
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Check if group is at capacity
 * @param {object} group - Group object
 * @returns {object} - {isFull: boolean, spotsLeft: number, canJoin: boolean}
 */
export const checkGroupCapacity = (group) => {
    const validation = validateGroupObject(group);
    if (!validation.isValid) {
        return {
            isFull: true,
            spotsLeft: 0,
            canJoin: false,
            error: 'Invalid group data'
        };
    }
    
    const currentMembers = group.current_members || 0;
    const maxMembers = group.max_members || 10;
    const spotsLeft = Math.max(0, maxMembers - currentMembers);
    const isFull = spotsLeft === 0;
    
    return {
        isFull,
        spotsLeft,
        canJoin: !isFull,
        error: null
    };
};

/**
 * Generate user-friendly group status message
 * @param {object} group - Group object
 * @returns {string} - Status message
 */
export const getGroupStatusMessage = (group) => {
    const validation = validateGroupObject(group);
    if (!validation.isValid) {
        return 'Invalid group data';
    }
    
    const capacity = checkGroupCapacity(group);
    const memberCount = group.current_members || 0;
    
    if (capacity.isFull) {
        return `Group is full (${memberCount}/${group.max_members} members)`;
    } else if (memberCount === 1) {
        return `1 member (${capacity.spotsLeft} spots left)`;
    } else {
        return `${memberCount} members (${capacity.spotsLeft} spots left)`;
    }
};

// Export all utilities
export default {
    validateGroupId,
    safeGroupOperation,
    validateGroupObject,
    validateGroupPermissions,
    handleGroupError,
    safeGroupApiCall,
    validateMemberObject,
    checkGroupCapacity,
    getGroupStatusMessage
};