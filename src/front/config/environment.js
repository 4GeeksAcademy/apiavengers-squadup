// src/front/config/environment.js - COMPLETE ENHANCED VERSION

/**
 * Complete environment configuration for SquadUp frontend
 * Handles JWT authentication, development, production, and GitHub Codespaces environments
 */

// Check if we're running in GitHub Codespaces
export const isCodespace = !!(
  import.meta.env.VITE_CODESPACE_NAME || 
  import.meta.env.CODESPACE_NAME ||
  (typeof window !== 'undefined' && window.__CODESPACE_NAME__)
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
                         (typeof window !== 'undefined' && window.__CODESPACE_NAME__);
    const domain = import.meta.env.VITE_GITHUB_CODESPACES_DOMAIN || 
                   import.meta.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ||
                   (typeof window !== 'undefined' && window.__GITHUB_CODESPACES_DOMAIN__);
    
    if (codespaceName && domain) {
      return `https://${codespaceName}-3001.${domain}`;
    }
  }
  
  // Priority 3: Development fallback
  if (isDevelopment) {
    return 'http://localhost:3001';
  }
  
  // Priority 4: Production fallback (same origin)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return 'http://localhost:3001';
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
                         (typeof window !== 'undefined' && window.__CODESPACE_NAME__);
    const domain = import.meta.env.VITE_GITHUB_CODESPACES_DOMAIN || 
                   import.meta.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ||
                   (typeof window !== 'undefined' && window.__GITHUB_CODESPACES_DOMAIN__);
    
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
 * and comprehensive JWT/authentication support
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
    if (options.method && options.method !== 'GET') {
      defaultHeaders['Access-Control-Request-Method'] = options.method;
    }
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
  
  // Construct full URL if relative
  const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url}`;
  
  try {
    console.log(`🌐 Making ${defaultOptions.method} request to:`, fullUrl);
    if (isDevelopment) {
      console.log(`🏠 Environment: ${isCodespace ? 'Codespace' : 'Development'}`);
      console.log(`📡 Headers:`, Object.keys(defaultOptions.headers));
    }
    
    const response = await fetch(fullUrl, defaultOptions);
    
    if (isDevelopment) {
      console.log(`📡 Response: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ Fetch error for ${fullUrl}:`, error);
    
    // Enhanced error messages for common issues
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Check your internet connection.');
    }
    
    if (error.message.includes('CORS')) {
      throw new Error('CORS error: Server configuration issue. Please contact support.');
    }
    
    if (error.name === 'AbortError') {
      throw new Error('Request was cancelled or timed out.');
    }
    
    throw error;
  }
};

/**
 * Test backend connectivity
 */
export const testConnectivity = async () => {
  try {
    console.log('🔍 Testing backend connectivity...');
    
    const response = await fetchWithConfig('/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend connectivity confirmed:', data);
      return { 
        success: true, 
        status: data.status,
        timestamp: data.timestamp,
        jwtConfigured: data.jwt_configured,
        environment: data.environment
      };
    } else {
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Backend connectivity test failed:', error);
    return { 
      success: false, 
      error: error.message,
      recommendation: getConnectivityRecommendation(error)
    };
  }
};

/**
 * Get connectivity troubleshooting recommendations
 */
const getConnectivityRecommendation = (error) => {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Check your internet connection and try refreshing the page.';
  }
  
  if (message.includes('cors')) {
    return 'This appears to be a server configuration issue. Please contact support.';
  }
  
  if (message.includes('timeout') || message.includes('cancelled')) {
    return 'The server is taking too long to respond. Try again in a moment.';
  }
  
  if (message.includes('404')) {
    return 'The backend service was not found. Please contact support.';
  }
  
  if (message.includes('500')) {
    return 'The server encountered an error. Please try again later.';
  }
  
  return 'Please try refreshing the page or contact support if the problem continues.';
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
 * JWT Configuration for frontend
 */
export const jwtConfig = {
  // Token storage keys
  accessTokenKey: 'squadup_access_token',
  refreshTokenKey: 'squadup_refresh_token',
  userKey: 'squadup_user',
  rememberKey: 'squadup_remember_me',
  
  // HTTP headers
  headerName: 'Authorization',
  headerType: 'Bearer',
  
  // Token management
  refreshThreshold: 5 * 60 * 1000, // Refresh 5 minutes before expiry
  maxRetries: 3,
  retryDelay: 1000,
  
  // Security settings
  requireHttps: isProduction,
  sameSite: 'lax',
  
  // Validation
  validateTokenFormat: true,
  checkExpiration: true
};

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
  
  // JWT configuration
  jwt: jwtConfig,
  
  // Feature flags based on environment
  features: {
    // Enable debug logs in development
    debugLogs: isDevelopment,
    
    // Enhanced logging for Codespaces
    verboseLogging: isCodespace,
    
    // Enable service worker in production
    serviceWorker: isProduction,
    
    // Enable hot reload in development
    hotReload: isDevelopment,
    
    // Enable analytics in production
    analytics: isProduction,
    
    // Enable error reporting in production
    errorReporting: isProduction,
    
    // Enable Steam integration
    steamIntegration: true,
    
    // Enable live voting features
    liveVoting: true,
    
    // Enable admin features (could be based on user role)
    adminFeatures: isDevelopment,
    
    // Token auto-refresh
    autoRefreshTokens: true,
    
    // Connection monitoring
    connectionMonitoring: true,
    
    // Offline support
    offlineSupport: true
  },
  
  // API configuration
  api: {
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000,
    
    // Health check configuration
    healthCheck: {
      interval: 60000, // 1 minute
      timeout: 10000,  // 10 seconds
      retries: 3
    },
    
    // Authentication specific config
    auth: {
      loginTimeout: 15000,
      registerTimeout: 15000,
      verifyTimeout: 10000,
      refreshTimeout: 10000
    },
    
    // Steam API specific config
    steam: {
      rateLimit: {
        requests: 100,
        window: 300000 // 5 minutes
      },
      syncTimeout: 60000, // 1 minute for library sync
      connectionTimeout: 30000
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
      maxVisible: 3,
      
      // Auto-dismiss settings
      autoDismiss: {
        success: 4000,
        error: 8000,
        warning: 6000,
        info: 5000
      }
    },
    
    // Loading states
    loading: {
      minDuration: 500, // Minimum loading time to prevent flicker
      timeout: 10000,   // Maximum loading time before error
      spinnerDelay: 200 // Delay before showing spinner
    },
    
    // Form validation
    validation: {
      debounceDelay: 300,
      showErrorsImmediately: false,
      validateOnBlur: true
    }
  },
  
  // Security configuration
  security: {
    // Token security
    tokenRefreshThreshold: jwtConfig.refreshThreshold,
    maxTokenAge: 24 * 60 * 60 * 1000, // 24 hours
    
    // Request security
    csrfProtection: isProduction,
    
    // Storage security
    encryptLocalStorage: isProduction,
    clearOnUnload: false
  },
  
  // Development configuration
  development: {
    // Debugging
    enableDebugMode: isDevelopment,
    showAuthDebugInfo: isDevelopment,
    logNetworkRequests: isDevelopment,
    
    // Testing
    enableTestEndpoints: isDevelopment,
    mockMode: false,
    
    // Performance
    enablePerformanceMonitoring: isDevelopment
  }
};

/**
 * Environment validation
 */
export const validateEnvironment = () => {
  const warnings = [];
  const errors = [];
  
  // Check critical URLs
  if (!apiUrl) {
    errors.push('API URL could not be determined');
  }
  
  if (!frontendUrl) {
    warnings.push('Frontend URL could not be determined');
  }
  
  // Check for HTTPS in production
  if (isProduction && !apiUrl.startsWith('https://')) {
    warnings.push('API URL should use HTTPS in production');
  }
  
  // Check Codespace configuration
  if (isCodespace) {
    const hasCodespaceName = !!(import.meta.env.VITE_CODESPACE_NAME || import.meta.env.CODESPACE_NAME);
    const hasDomain = !!(import.meta.env.VITE_GITHUB_CODESPACES_DOMAIN || import.meta.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN);
    
    if (!hasCodespaceName) {
      warnings.push('Codespace name not found in environment');
    }
    
    if (!hasDomain) {
      warnings.push('GitHub Codespaces domain not found in environment');
    }
  }
  
  // Log results
  if (errors.length > 0) {
    console.error('🚨 Environment validation errors:', errors);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Environment validation warnings:', warnings);
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment validation passed');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
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
  console.log('JWT Config:', jwtConfig);
  console.log('Features:', config.features);
  console.groupEnd();
  
  // Validate environment
  validateEnvironment();
}

// Export everything as default as well for convenience
export default {
  isCodespace,
  isDevelopment,
  isProduction,
  apiUrl,
  frontendUrl,
  fetchWithConfig,
  testConnectivity,
  createApiClient,
  apiClient,
  jwtConfig,
  config,
  validateEnvironment
};