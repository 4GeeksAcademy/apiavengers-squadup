// src/front/config/environment.js
const config = {
  // API Configuration - Based on your .env
  API_BASE_URL: import.meta.env.VITE_BACKEND_URL || 'https://bookish-funicular-9754qgjjg9743pqr7-3001.app.github.dev',
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'https://bookish-funicular-9754qgjjg9743pqr7-3001.app.github.dev',
  FRONTEND_URL: 'https://bookish-funicular-9754qgjjg9743pqr7-3000.app.github.dev',
  
  // Steam Integration
  STEAM_API_KEY: import.meta.env.STEAM_API_KEY || 'FE4F894B4C7123C43A839431C7441F66',
  STEAM_WEB_API_URL: 'https://api.steampowered.com',
  STEAM_CALLBACK_URL: 'https://bookish-funicular-9754qgjjg9743pqr7-3001.app.github.dev/api/auth/steam/callback',
  
  // App Configuration
  appName: import.meta.env.VITE_APP_NAME || 'SquadUp',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  basename: import.meta.env.VITE_BASENAME || '/',
  
  // GitHub Codespaces Configuration
  codespace: {
    name: import.meta.env.VITE_CODESPACE_NAME || 'bookish-funicular-9754qgjjg9743pqr7',
    domain: import.meta.env.VITE_GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'
  },
  
  // Feature Flags
  features: {
    steamIntegration: import.meta.env.VITE_ENABLE_STEAM_INTEGRATION === 'true',
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    connectionMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITOR === 'true',
    performanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITOR === 'true',
    debugLogs: import.meta.env.NODE_ENV === 'development',
    verboseLogging: import.meta.env.VITE_VERBOSE_LOGGING === 'true',
    sessionPersistence: true, // Based on your backend config
    voteConflictResolution: true // Based on your backend config
  },
  
  // API Configuration
  api: {
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
    maxUploadSize: parseInt(import.meta.env.VITE_MAX_UPLOAD_SIZE) || 5242880,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // Performance Configuration
  performance: {
    slowRequestThreshold: 2000, // ms
    maxStoredMetrics: 100,
    memoryWarningThreshold: 80, // percentage
    accessRoles: (import.meta.env.VITE_PERFORMANCE_ACCESS_ROLES || 'admin,super_admin,developer').split(',')
  },
  
  // SSE Configuration
  sse: {
    connectionTimeout: 30000,
    queueSize: 50,
    autoReconnectAttempts: 5,
    reconnectBackoffMax: 30000
  },
  
  // Session Configuration
  session: {
    persistenceEnabled: true,
    ttl: 3600,
    maxRetryAttempts: 3,
    conflictBackoffBase: 100
  },
  
  // Environment Detection
  isDevelopment: import.meta.env.NODE_ENV === 'development',
  isProduction: import.meta.env.NODE_ENV === 'production',
  isCodespaces: !!import.meta.env.VITE_CODESPACE_NAME
};

// Export the config object and individual values for compatibility
export { config };

// Individual exports for backward compatibility
export const apiUrl = config.API_BASE_URL;
export const backendUrl = config.BACKEND_URL;
export const frontendUrl = config.FRONTEND_URL;
export const steamApiKey = config.STEAM_API_KEY;
export const appName = config.appName;
export const version = config.version;
export const features = config.features;
export const isCodespace = config.isCodespaces;

// Additional exports for compatibility
export const getBackendURL = () => config.BACKEND_URL;

// Enhanced fetch function with automatic base URL and error handling
export const fetchWithConfig = async (url, options = {}) => {
  // Ensure URL is absolute or prepend base URL
  const fullUrl = url.startsWith('http') ? url : `${config.BACKEND_URL}${url}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    credentials: 'include', // Important for cookie-based sessions
    ...options
  };

  try {
    const response = await fetch(fullUrl, defaultOptions);
    
    // Log request details in development
    if (config.features.debugLogs) {
      console.log(`🌐 ${options.method || 'GET'} ${fullUrl}:`, response.status);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ Fetch failed for ${fullUrl}:`, error);
    throw error;
  }
};