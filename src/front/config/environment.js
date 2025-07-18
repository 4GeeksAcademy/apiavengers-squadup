// src/config/environment.js - FIXED CONFIGURATION

/**
 * Environment configuration for GitHub Codespaces and local development
 * Handles dynamic URL detection and API configuration
 */

// 🔧 CRITICAL: Dynamic environment detection for Codespaces
const getEnvironmentConfig = () => {
    const isDevelopment = import.meta.env.DEV;
    
    // Better Codespace detection
    const currentHostname = window.location.hostname;
    const isCodespace = currentHostname.includes('.github.dev') || currentHostname.includes('.app.github.dev');
    
    // Extract codespace name from current URL
    let codespaceName = null;
    if (isCodespace) {
        // Extract from URL like: bookish-funicular-9754qgjjg9743pqr7-3000.app.github.dev
        const hostParts = currentHostname.split('.');
        if (hostParts.length >= 3) {
            const fullPrefix = hostParts[0]; // bookish-funicular-9754qgjjg9743pqr7-3000
            codespaceName = fullPrefix.replace(/-\d+$/, ''); // Remove port number: bookish-funicular-9754qgjjg9743pqr7
        }
    }
    
    // Use environment variable as fallback
    if (!codespaceName) {
        codespaceName = import.meta.env.VITE_CODESPACE_NAME;
    }
    
    const codespacesDomain = import.meta.env.VITE_GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
    
    let backendUrl;
    let frontendUrl;
    
    if (isCodespace && codespaceName) {
        // GitHub Codespaces URLs - ensure consistent domain
        const domain = currentHostname.includes('app.github.dev') ? 'app.github.dev' : 'github.dev';
        backendUrl = `https://${codespaceName}-3001.${domain}`;
        frontendUrl = `https://${codespaceName}-3000.${domain}`;
        
        console.log('🌐 Codespace Environment Detected:', {
            currentHostname,
            codespaceName,
            domain,
            backendUrl,
            frontendUrl
        });
    } else if (isDevelopment) {
        // Local development
        backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        frontendUrl = 'http://localhost:3000';
        
        console.log('💻 Local Development Environment:', {
            backendUrl,
            frontendUrl
        });
    } else {
        // Production - use environment variables or defaults
        backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
        frontendUrl = window.location.origin;
        
        console.log('🚀 Production Environment:', {
            backendUrl,
            frontendUrl
        });
    }
    
    return {
        isDevelopment,
        isCodespace,
        isProduction: !isDevelopment,
        codespaceName,
        codespacesDomain,
        backendUrl,
        frontendUrl,
        apiUrl: backendUrl
    };
};

// Get configuration once
const config = getEnvironmentConfig();

// Export configuration
export const {
    isDevelopment,
    isCodespace,
    isProduction,
    codespaceName,
    codespacesDomain,
    backendUrl,
    frontendUrl,
    apiUrl
} = config;

/**
 * Enhanced fetch wrapper with proper CORS and authentication headers
 */
export const fetchWithConfig = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${apiUrl}${endpoint}`;
    
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        },
        // 🔧 CRITICAL: Enable credentials for CORS
        credentials: 'include',
        ...options
    };

    console.log('📡 Making request:', {
        url,
        method: defaultOptions.method,
        hasAuth: !!defaultOptions.headers.Authorization,
        isCodespace,
        frontendOrigin: frontendUrl
    });

    try {
        const response = await fetch(url, defaultOptions);
        
        console.log('📡 Response received:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url
        });
        
        return response;
    } catch (error) {
        console.error('📡 Fetch error:', {
            url,
            error: error.message,
            isCodespace,
            config: isCodespace ? { codespaceName, codespacesDomain } : null
        });
        throw error;
    }
};

/**
 * API endpoint helpers
 */
export const getApiEndpoint = (path) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${apiUrl}${cleanPath}`;
};

/**
 * Test connectivity to backend
 */
export const testConnectivity = async () => {
    try {
        console.log('🔍 Testing backend connectivity...');
        
        const response = await fetchWithConfig('/api/status', {
            method: 'GET',
            // Add timeout for connectivity test
            signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend connectivity test passed:', data);
            return { success: true, data };
        } else {
            console.error('❌ Backend connectivity test failed:', response.status);
            return { success: false, error: `HTTP ${response.status}` };
        }
    } catch (error) {
        console.error('❌ Backend connectivity test error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * WebSocket configuration for live features
 */
export const getWebSocketConfig = () => {
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = apiUrl.replace(/^https?/, wsProtocol);
    
    return {
        wsUrl,
        options: {
            // Add authentication headers for WebSocket if needed
            ...(isCodespace && { origin: frontendUrl })
        }
    };
};

/**
 * CORS configuration helper
 */
export const getCorsConfig = () => {
    return {
        origin: frontendUrl,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin'
        ]
    };
};

/**
 * Debug information
 */
export const getDebugInfo = () => {
    return {
        ...config,
        userAgent: navigator.userAgent,
        location: {
            href: window.location.href,
            origin: window.location.origin,
            hostname: window.location.hostname
        },
        timestamp: new Date().toISOString()
    };
};

// 🔧 CRITICAL: Initialize environment on load
if (isDevelopment) {
    console.log('🔧 Environment Configuration:', getDebugInfo());
    
    // Test connectivity on startup in development
    testConnectivity().then(result => {
        if (result.success) {
            console.log('✅ Initial connectivity test passed');
        } else {
            console.warn('⚠️ Initial connectivity test failed:', result.error);
        }
    });
}

// Export default configuration
export default config;