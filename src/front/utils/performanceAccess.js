// src/front/utils/performanceAccess.js - Performance Monitor Access Control

/**
 * Determines the performance monitoring access level for a user
 * @param {Object} user - User object from store
 * @returns {string} - Access level: 'full', 'limited', 'read_only', or 'none'
 */
export const getPerformanceAccessLevel = (user) => {
  if (!user) return 'none';

  // Check role hierarchy
  if (user.role === 'super_admin') return 'full';
  if (user.role === 'admin') return 'limited';
  if (user.role === 'developer') return 'read_only';
  
  // Check for specific permissions
  if (user.permissions?.includes('performance_full')) return 'full';
  if (user.permissions?.includes('performance_limited')) return 'limited';
  if (user.permissions?.includes('performance_read')) return 'read_only';
  
  return 'none';
};

/**
 * Check if user is authorized for performance monitoring
 * @param {Object} user - User object from store
 * @returns {boolean} - True if user has any level of access
 */
export const isAuthorizedForPerformanceMonitor = (user) => {
  const accessLevel = getPerformanceAccessLevel(user);
  
  // Check environment variable override
  const enabledInEnv = import.meta.env.VITE_ENABLE_PERFORMANCE_MONITOR === 'true';
  const allowedRoles = import.meta.env.VITE_PERFORMANCE_ACCESS_ROLES?.split(',') || [];
  
  // In development, allow based on environment config
  if (import.meta.env.DEV && enabledInEnv) {
    if (allowedRoles.includes(user?.role) || allowedRoles.includes(user?.username)) {
      return true;
    }
  }
  
  // Production check - only allow if user has proper access level
  return accessLevel !== 'none';
};

/**
 * Get available features based on access level
 * @param {string} accessLevel - User's access level
 * @returns {Object} - Available features
 */
export const getPerformanceFeatures = (accessLevel) => {
  const features = {
    viewMetrics: false,
    viewAlerts: false,
    acknowledgeAlerts: false,
    exportData: false,
    configureThresholds: false,
    viewSystemHealth: false
  };

  switch (accessLevel) {
    case 'full':
      return {
        ...features,
        viewMetrics: true,
        viewAlerts: true,
        acknowledgeAlerts: true,
        exportData: true,
        configureThresholds: true,
        viewSystemHealth: true
      };
      
    case 'limited':
      return {
        ...features,
        viewMetrics: true,
        viewAlerts: true,
        acknowledgeAlerts: true,
        viewSystemHealth: true
      };
      
    case 'read_only':
      return {
        ...features,
        viewMetrics: true,
        viewAlerts: true,
        viewSystemHealth: true
      };
      
    default:
      return features;
  }
};

/**
 * Security audit log for performance monitor access
 * @param {Object} user - User object
 * @param {string} action - Action performed
 */
export const logPerformanceAccess = (user, action) => {
  if (import.meta.env.PROD) {
    // In production, log to your monitoring service
    console.log(`[SECURITY] Performance Monitor Access: ${user?.username} - ${action}`);
    
    // You could send this to your backend for security auditing
    // fetch('/api/security/audit', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     user_id: user?.id,
    //     username: user?.username,
    //     action,
    //     timestamp: new Date().toISOString(),
    //     feature: 'performance_monitor'
    //   })
    // });
  }
};