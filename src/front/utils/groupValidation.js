// src/front/utils/groupValidation.js - Group validation utility functions

/**
 * Validates a group ID to ensure it's a valid integer
 * @param {any} groupId - The group ID to validate
 * @returns {object} - Validation result with isValid flag and normalized ID
 */
export const validateGroupId = (groupId) => {
  const errors = [];
  
  // Check for null, undefined, or empty string
  if (!groupId || groupId === 'undefined' || groupId === 'null' || groupId === '') {
    errors.push('Group ID is missing or invalid');
    return {
      isValid: false,
      error: 'Invalid group ID provided',
      errors,
      normalizedId: null
    };
  }
  
  // Convert to string for parsing
  const groupIdStr = String(groupId).trim();
  
  // Check if it's a valid number
  const parsed = parseInt(groupIdStr, 10);
  if (isNaN(parsed) || parsed <= 0) {
    errors.push('Group ID must be a positive integer');
    return {
      isValid: false,
      error: 'Group ID must be a positive integer',
      errors,
      normalizedId: null
    };
  }
  
  // Check if the parsed value matches the original (no decimals or extra chars)
  if (String(parsed) !== groupIdStr) {
    errors.push('Group ID contains invalid characters');
    return {
      isValid: false,
      error: 'Group ID contains invalid characters',
      errors,
      normalizedId: null
    };
  }
  
  return {
    isValid: true,
    error: null,
    errors: [],
    normalizedId: parsed
  };
};

/**
 * Validates a group object structure
 * @param {object} group - The group object to validate
 * @returns {object} - Validation result
 */
export const validateGroupObject = (group) => {
  const errors = [];
  
  if (!group || typeof group !== 'object') {
    errors.push('Group is not a valid object');
    return {
      isValid: false,
      errors
    };
  }
  
  // Validate required fields
  if (!group.id) {
    errors.push('Group ID is missing');
  } else {
    const idValidation = validateGroupId(group.id);
    if (!idValidation.isValid) {
      errors.push(...idValidation.errors);
    }
  }
  
  if (!group.name || typeof group.name !== 'string' || group.name.trim() === '') {
    errors.push('Group name is missing or invalid');
  }
  
  // Validate optional but expected fields
  if (group.creator && (!group.creator.id || !group.creator.username)) {
    errors.push('Group creator information is incomplete');
  }
  
  if (group.current_members !== undefined && (typeof group.current_members !== 'number' || group.current_members < 0)) {
    errors.push('Current members count is invalid');
  }
  
  if (group.max_members !== undefined && (typeof group.max_members !== 'number' || group.max_members <= 0)) {
    errors.push('Max members count is invalid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates user permissions for group operations
 * @param {object} user - The user object
 * @param {object} group - The group object  
 * @param {string} operation - The operation to validate ('leave', 'delete', 'edit', 'kick')
 * @returns {object} - Permission validation result
 */
export const validateGroupPermissions = (user, group, operation) => {
  if (!user || !user.id) {
    return {
      hasPermission: false,
      reason: 'User not authenticated'
    };
  }
  
  if (!group || !group.id) {
    return {
      hasPermission: false,
      reason: 'Invalid group'
    };
  }
  
  const isCreator = group.creator?.id === user.id;
  const isMember = group.members?.some(m => m.id === user.id) || isCreator;
  
  switch (operation) {
    case 'leave':
      if (!isMember) {
        return {
          hasPermission: false,
          reason: 'You are not a member of this group'
        };
      }
      return {
        hasPermission: true,
        reason: null
      };
      
    case 'delete':
      if (!isCreator) {
        return {
          hasPermission: false,
          reason: 'Only the group creator can delete the group'
        };
      }
      return {
        hasPermission: true,
        reason: null
      };
      
    case 'edit':
    case 'kick':
      if (!isCreator) {
        return {
          hasPermission: false,
          reason: 'Only the group creator can perform this action'
        };
      }
      return {
        hasPermission: true,
        reason: null
      };
      
    default:
      return {
        hasPermission: false,
        reason: 'Unknown operation'
      };
  }
};

/**
 * Safely execute a group operation with validation and error handling
 * @param {any} groupId - The group ID
 * @param {function} operation - The operation to execute (receives validated group ID)
 * @param {string} operationName - Name of the operation for logging
 * @returns {object} - Operation result
 */
export const safeGroupOperation = async (groupId, operation, operationName = 'group operation') => {
  console.log(`🔧 Starting safe ${operationName} for group:`, groupId);
  
  try {
    // Validate group ID first
    const validation = validateGroupId(groupId);
    if (!validation.isValid) {
      console.error(`❌ ${operationName} failed: ${validation.error}`);
      return {
        success: false,
        error: validation.error,
        data: null
      };
    }
    
    // Execute the operation with validated ID
    const result = await operation(validation.normalizedId);
    
    console.log(`✅ ${operationName} completed successfully`);
    return {
      success: true,
      error: null,
      data: result
    };
    
  } catch (error) {
    console.error(`❌ ${operationName} failed with error:`, error);
    
    // Provide user-friendly error messages
    let userFriendlyMessage = error.message;
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      userFriendlyMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
      userFriendlyMessage = 'Authentication expired. Please refresh the page and try again.';
    } else if (error.message.includes('403') || error.message.includes('forbidden')) {
      userFriendlyMessage = 'You do not have permission to perform this action.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      userFriendlyMessage = 'Group not found. It may have been deleted.';
    } else if (error.message.includes('timeout')) {
      userFriendlyMessage = 'Request timed out. Please try again.';
    }
    
    return {
      success: false,
      error: userFriendlyMessage,
      data: null,
      originalError: error
    };
  }
};

/**
 * Handle group-related errors with consistent logging and user feedback
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {object} groupInfo - Optional group information for logging
 * @returns {string} - User-friendly error message
 */
export const handleGroupError = (error, context = 'group operation', groupInfo = null) => {
  const errorId = Date.now().toString(36);
  
  console.group(`❌ Group Error [${errorId}]`);
  console.error(`Context: ${context}`);
  console.error(`Error:`, error);
  if (groupInfo) {
    console.error(`Group Info:`, groupInfo);
  }
  console.groupEnd();
  
  // Return user-friendly message based on error type
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'Network connection error. Please check your internet and try again.';
  }
  
  if (error.message.includes('401')) {
    return 'Your session has expired. Please refresh the page and try again.';
  }
  
  if (error.message.includes('403')) {
    return 'You do not have permission to access this group.';
  }
  
  if (error.message.includes('404')) {
    return 'Group not found. It may have been deleted or moved.';
  }
  
  if (error.message.includes('500')) {
    return 'Server error occurred. Please try again in a moment.';
  }
  
  // Generic fallback
  return error.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Validate invite code format
 * @param {string} inviteCode - The invite code to validate
 * @returns {object} - Validation result
 */
export const validateInviteCode = (inviteCode) => {
  if (!inviteCode || typeof inviteCode !== 'string') {
    return {
      isValid: false,
      error: 'Invite code is required'
    };
  }
  
  const trimmed = inviteCode.trim();
  
  // Check if it's a full URL or just the code
  let code = trimmed;
  if (trimmed.includes('/join/')) {
    const parts = trimmed.split('/join/');
    code = parts[parts.length - 1];
  }
  
  // Invite codes should be 8 characters, alphanumeric
  const codeRegex = /^[a-zA-Z0-9]{8}$/;
  if (!codeRegex.test(code)) {
    return {
      isValid: false,
      error: 'Invite code must be 8 characters long and contain only letters and numbers'
    };
  }
  
  return {
    isValid: true,
    error: null,
    normalizedCode: code
  };
};

export default {
  validateGroupId,
  validateGroupObject,
  validateGroupPermissions,
  safeGroupOperation,
  handleGroupError,
  validateInviteCode
};