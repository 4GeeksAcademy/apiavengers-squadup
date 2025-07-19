// src/front/config/environment.js - Missing environment configuration

/**
 * Environment configuration for SquadUp frontend
 * Handles development, production, and GitHub Codespaces environments
 */

// Check if we're running in GitHub Codespaces
export const isCodespace = !!(
  import.meta.env.VITE_CODESPACE_NAME || 
  import.meta.env.CODESPACE_NAME ||
  typeof window !== 'undefined' && window.__CODESPACE_NAME__
);

// Check if we're in development mode
export const isDevelopment = import.meta.env.DEV;

// Check if we're in production mode
export const isProduction = import.meta.env.PROD;

// Get the backend URL with fallback logic
export const apiUrl = (() => {
  // Priority 1: Explicit backend URL from environment
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // Priority 2: Codespace auto-detection
  if (isCodespace) {
    const codespaceName = import.meta.env.VITE_CODESPACE_NAME || 
                         import.meta.env.CODESPACE_NAME ||
                         window.__CODESPACE_NAME__;
    const domain = import.meta.env.VITE_GITHUB_CODESPACES_DOMAIN || 
                   import.meta.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ||
                   window.__GITHUB_CODESPACES_DOMAIN__;
    
    if (codespaceName && domain) {
      return `https://${codespaceName}-3001.${domain}`;
    }
  }
  
  // Priority 3: Development fallback
  if (isDevelopment) {
    return 'http://localhost:3001';
  }
  
  // Priority 4: Production fallback (same origin)
  return window.location.origin;
})();

// Get the frontend URL with fallback logic
export const frontendUrl = (() => {
  // Priority 1: Explicit frontend URL from environment
  if (import.meta.env.VITE_FRONTEND_URL) {
    return import.meta.env.VITE_FRONTEND_URL;
  }
  
  // Priority 2: Codespace auto-detection
  if (isCodespace) {
    const codespaceName = import.meta.env.VITE_CODESPACE_NAME || 
                         import.meta.env.CODESPACE_NAME ||
                         window.__CODESPACE_NAME__;
    const domain = import.meta.env.VITE_GITHUB_CODESPACES_DOMAIN || 
                   import.meta.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ||
                   window.__GITHUB_CODESPACES_DOMAIN__;
    
    if (codespaceName && domain) {
      return `https://${codespaceName}-3000.${domain}`;
    }
  }
  
  // Priority 3: Browser current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Priority 4: Development fallback
  return 'http://localhost:3000';
})();

/**
 * Enhanced fetch wrapper with automatic configuration for different environments
 * Handles CORS, credentials, and headers properly for Codespaces and local development
 */
export const fetchWithConfig = async (url, options = {}) => {
  // Determine if this is a cross-origin request
  const isCrossOrigin = url.startsWith('http') && !url.startsWith(frontendUrl);
  
  // Default headers
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers
  };
  
  // Add CORS headers for Codespaces
  if (isCodespace && isCrossOrigin) {
    defaultHeaders['Origin'] = frontendUrl;
    defaultHeaders['Access-Control-Request-Method'] = options.method || 'GET';
  }
  
  // Default fetch options
  const defaultOptions = {
    method: 'GET',
    credentials: 'include', // Always include credentials for authentication
    headers: defaultHeaders,
    ...options
  };
  
  // Special handling for FormData (remove Content-Type to let browser set it)
  if (options.body instanceof FormData) {
    delete defaultOptions.headers['Content-Type'];
  }
  
  try {
    console.log(`🌐 Making ${defaultOptions.method} request to:`, url);
    console.log(`🏠 Environment: ${isCodespace ? 'Codespace' : isDevelopment ? 'Development' : 'Production'}`);
    
    const response = await fetch(url, defaultOptions);
    
    console.log(`📡 Response: ${response.status} ${response.statusText}`);
    
    return response;
  } catch (error) {
    console.error(`❌ Fetch error for ${url}:`, error);
    
    // Enhanced error messages for common issues
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Check your internet connection.');
    }
    
    if (error.message.includes('CORS')) {
      throw new Error('CORS error: Server configuration issue. Please contact support.');
    }
    
    throw error;
  }
};

/**
 * Create a configured fetch function for API calls
 * Automatically prepends the API URL if needed
 */
export const createApiClient = (baseUrl = apiUrl) => {
  return (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    return fetchWithConfig(url, options);
  };
};

// Default API client instance
export const apiClient = createApiClient();

/**
 * Environment-specific configuration object
 */
export const config = {
  // URLs
  apiUrl,
  frontendUrl,
  
  // Environment flags
  isCodespace,
  isDevelopment,
  isProduction,
  
  // Feature flags based on environment
  features: {
    // Enable debug logs in development
    debugLogs: isDevelopment,
    
    // Enable service worker in production
    serviceWorker: isProduction,
    
    // Enable hot reload in development
    hotReload: isDevelopment,
    
    // Enable analytics in production
    analytics: isProduction,
    
    // Enable error reporting in production
    errorReporting: isProduction,
    
    // Enable Steam integration (always on for now)
    steamIntegration: true,
    
    // Enable live voting features
    liveVoting: true,
    
    // Enable admin features (could be based on user role)
    adminFeatures: isDevelopment
  },
  
  // API configuration
  api: {
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000,
    
    // Steam API specific config
    steam: {
      // Steam Web API has rate limits
      rateLimit: {
        requests: 100,
        window: 300000 // 5 minutes
      }
    }
  },
  
  // UI configuration
  ui: {
    // Animation preferences
    animations: {
      enabled: true,
      duration: 300,
      easing: 'ease-in-out'
    },
    
    // Toast notification settings
    notifications: {
      position: 'top-center',
      duration: 5000,
      maxVisible: 3
    },
    
    // Loading states
    loading: {
      minDuration: 500, // Minimum loading time to prevent flicker
      timeout: 10000    // Maximum loading time before error
    }
  }
};

/**
 * Log current environment configuration (development only)
 */
if (isDevelopment) {
  console.group('🌐 Environment Configuration');
  console.log('API URL:', apiUrl);
  console.log('Frontend URL:', frontendUrl);
  console.log('Is Codespace:', isCodespace);
  console.log('Is Development:', isDevelopment);
  console.log('Is Production:', isProduction);
  console.log('Features:', config.features);
  console.groupEnd();
}

// Export everything as default as well for convenience
export default {
  isCodespace,
  isDevelopment,
  isProduction,
  apiUrl,
  frontendUrl,
  fetchWithConfig,
  createApiClient,
  apiClient,
  config
};