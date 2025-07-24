// src/front/config/environment.js - CLEAN VERSION (no duplicates)

// Export individual values first
export const apiUrl = import.meta.env.VITE_BACKEND_URL || 'https://bookish-funicular-9754qgjjg9743pqr7-3001.app.github.dev';
export const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://bookish-funicular-9754qgjjg9743pqr7-3001.app.github.dev';
export const frontendUrl = 'https://bookish-funicular-9754qgjjg9743pqr7-3000.app.github.dev';
export const steamApiKey = import.meta.env.STEAM_API_KEY || 'FE4F894B4C7123C43A839431C7441F66';
export const appName = import.meta.env.VITE_APP_NAME || 'SquadUp';
export const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
export const isCodespace = !!import.meta.env.VITE_CODESPACE_NAME;

// Feature flags
export const features = {
  steamIntegration: import.meta.env.VITE_ENABLE_STEAM_INTEGRATION === 'true',
  analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  connectionMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITOR === 'true',
  performanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITOR === 'true',
  debugLogs: import.meta.env.NODE_ENV === 'development',
  verboseLogging: import.meta.env.VITE_VERBOSE_LOGGING === 'true',
  sessionPersistence: true,
  voteConflictResolution: true
};

// 🔥 CRITICAL: Fixed fetch function with proper CORS
export const fetchWithConfig = async (url, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;
  
  const defaultOptions = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    credentials: 'include', // 🔥 CRITICAL
    mode: 'cors',           // 🔥 CRITICAL
    ...options
  };

  try {
    console.log(`🌐 Making ${defaultOptions.method} request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, defaultOptions);
    
    console.log(`🌐 ${defaultOptions.method} ${fullUrl}: ${response.status} ${response.statusText}`);
    
    return response;
  } catch (error) {
    console.error(`❌ Fetch failed for ${fullUrl}:`, error);
    throw error;
  }
};

// Config object (declared ONCE)
export const config = {
  API_BASE_URL: apiUrl,
  BACKEND_URL: backendUrl,
  FRONTEND_URL: frontendUrl,
  STEAM_API_KEY: steamApiKey,
  appName,
  version,
  features,
  isCodespaces: isCodespace,
  
  api: {
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
    maxUploadSize: parseInt(import.meta.env.VITE_MAX_UPLOAD_SIZE) || 5242880,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  isDevelopment: import.meta.env.NODE_ENV === 'development',
  isProduction: import.meta.env.NODE_ENV === 'production'
};

// Additional exports
export const getBackendURL = () => backendUrl;

// Default export
export default config;