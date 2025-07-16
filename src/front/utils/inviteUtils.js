// src/front/utils/inviteUtils.js - NEW FILE
// Utility functions for handling invite links and codes

/**
 * Extract invite code from various input formats
 * @param {string} input - Full URL or invite code
 * @returns {string|null} - Extracted 8-character invite code or null
 */
export const extractInviteCode = (input) => {
    if (!input || typeof input !== 'string') return null;
    
    const trimmed = input.trim();
    
    // Handle full URLs like: https://domain.com/join/ABC123DEF
    const urlMatch = trimmed.match(/\/join\/([A-Z0-9]{8})/i);
    if (urlMatch) {
        return urlMatch[1].toUpperCase();
    }
    
    // Handle just the invite code: ABC123DEF (with or without spaces/special chars)
    const cleanCode = trimmed.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (cleanCode.length === 8 && /^[A-Z0-9]{8}$/.test(cleanCode)) {
        return cleanCode;
    }
    
    return null;
};

/**
 * Validate if a string is a valid invite code format
 * @param {string} code - The code to validate
 * @returns {boolean} - True if valid format
 */
export const isValidInviteCode = (code) => {
    if (!code || typeof code !== 'string') return false;
    return /^[A-Z0-9]{8}$/.test(code.trim().toUpperCase());
};

/**
 * Generate a shareable invite link
 * @param {string} inviteCode - The 8-character invite code
 * @returns {string} - Full shareable URL
 */
export const generateInviteLink = (inviteCode) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join/${inviteCode}`;
};

/**
 * Format invite code for display (adds spaces for readability)
 * @param {string} code - The invite code
 * @returns {string} - Formatted code like "ABC1 23DE"
 */
export const formatInviteCode = (code) => {
    if (!code || code.length !== 8) return code;
    return `${code.slice(0, 4)} ${code.slice(4, 8)}`;
};

/**
 * Copy invite link to clipboard with error handling
 * @param {string} inviteCode - The invite code
 * @returns {Promise<boolean>} - Success status
 */
export const copyInviteToClipboard = async (inviteCode) => {
    const inviteLink = generateInviteLink(inviteCode);
    
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(inviteLink);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = inviteLink;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        }
    } catch (error) {
        console.error('Failed to copy invite link:', error);
        return false;
    }
};

/**
 * Validate and normalize invite input
 * @param {string} input - User input
 * @returns {object} - {isValid: boolean, code: string|null, error: string|null}
 */
export const validateInviteInput = (input) => {
    if (!input || typeof input !== 'string') {
        return {
            isValid: false,
            code: null,
            error: 'Please enter an invite link or code'
        };
    }
    
    const code = extractInviteCode(input);
    
    if (!code) {
        return {
            isValid: false,
            code: null,
            error: 'Invalid invite format. Expected 8-character code or full invite link.'
        };
    }
    
    return {
        isValid: true,
        code: code,
        error: null
    };
};