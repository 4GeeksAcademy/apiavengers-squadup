// src/front/store/authService.js - ENHANCED VERSION with proper JWT handling

import { fetchWithConfig, apiUrl, frontendUrl, isCodespace } from '../config/environment.js';

class AuthService {
    constructor() {
        this.tokenKey = 'squadup_access_token';
        this.refreshTokenKey = 'squadup_refresh_token';
        this.userKey = 'squadup_user';
        this.rememberKey = 'squadup_remember_me';
        
        this.dispatch = null;
        this.isRefreshing = false;
        this.failedQueue = [];
        this.refreshTimer = null;
        
        // Enhanced initialization tracking
        this.authCheckCompleted = false;
        this.initializationPromise = null;
        this.isInitializing = false;
        
        // JWT Configuration
        this.jwtConfig = {
            headerName: 'Authorization',
            headerType: 'Bearer',
            tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
            maxRetries: 3,
            retryDelay: 1000
        };
        
        console.log('🔐 Enhanced AuthService initialized:', { 
            apiUrl, 
            frontendUrl, 
            isCodespace,
            jwtConfig: this.jwtConfig
        });
    }

    // ============================================================================
    // JWT VALIDATION AND PARSING
    // ============================================================================

    /**
     * Parse and validate JWT token structure
     */
    parseJWT(token) {
        if (!token || typeof token !== 'string') return null;
        
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));
            
            return {
                header,
                payload,
                signature: parts[2],
                raw: token
            };
        } catch (error) {
            console.warn('🔍 JWT parsing failed:', error);
            return null;
        }
    }

    /**
     * Validate JWT token format and expiration
     */
    isValidTokenFormat(token) {
        const parsed = this.parseJWT(token);
        if (!parsed) return false;
        
        const { payload } = parsed;
        
        // Check required claims
        if (!payload.sub || !payload.exp || !payload.iat) {
            console.warn('🔍 JWT missing required claims');
            return false;
        }
        
        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp <= now) {
            console.warn('🔍 JWT is expired');
            return false;
        }
        
        // Check not before (if present)
        if (payload.nbf && payload.nbf > now) {
            console.warn('🔍 JWT not yet valid (nbf claim)');
            return false;
        }
        
        return true;
    }

    /**
     * Get token expiration time in milliseconds
     */
    getTokenExpiry(token) {
        const parsed = this.parseJWT(token);
        return parsed ? parsed.payload.exp * 1000 : null;
    }

    /**
     * Check if token needs refresh
     */
    needsRefresh(token) {
        const expiry = this.getTokenExpiry(token);
        if (!expiry) return true;
        
        return (expiry - Date.now()) < this.jwtConfig.tokenRefreshThreshold;
    }

    // ============================================================================
    // ENHANCED AUTHENTICATION FLOW
    // ============================================================================

    setDispatch(dispatch) {
        console.log('✅ Enhanced dispatch function injected into AuthService');
        this.dispatch = dispatch;
        
        if (this.isInitializing || this.authCheckCompleted) {
            console.log('🔍 Auth check already in progress or completed, skipping...');
            return this.initializationPromise || Promise.resolve();
        }
        
        if (!this.initializationPromise) {
            this.isInitializing = true;
            this.initializationPromise = this.checkAuthOnStartup()
                .finally(() => {
                    this.isInitializing = false;
                });
        }
        
        return this.initializationPromise;
    }

    async checkAuthOnStartup() {
        if (this.authCheckCompleted) {
            console.log('🔍 Auth check already completed, skipping...');
            return;
        }
        
        console.log('🔍 Starting enhanced auth check on startup...');
        
        if (this.dispatch) {
            this.dispatch({ type: 'set_loading', payload: true });
        }
        
        try {
            const accessToken = this.getAccessToken();
            const refreshToken = this.getRefreshToken();
            const storedUser = this.getUser();
            
            if (accessToken && storedUser && this.isValidTokenFormat(accessToken)) {
                console.log('🔍 Found valid stored credentials');
                
                // Check if token needs refresh
                if (this.needsRefresh(accessToken) && refreshToken) {
                    console.log('🔄 Token needs refresh, attempting...');
                    try {
                        await this.refreshTokenSilently();
                    } catch (refreshError) {
                        console.warn('⚠️ Token refresh failed during startup:', refreshError);
                        this.clearAuth();
                        return;
                    }
                }
                
                // Verify token with server
                try {
                    const isValid = await this.verifyTokenWithServer(accessToken);
                    if (isValid) {
                        if (this.dispatch) {
                            this.dispatch({ 
                                type: 'login_success',
                                payload: { 
                                    user: storedUser, 
                                    token: accessToken, 
                                    refreshToken: refreshToken || this.getRefreshToken()
                                }
                            });
                            this.scheduleTokenRefresh(accessToken);
                        }
                    } else {
                        throw new Error('Token verification failed');
                    }
                } catch (verifyError) {
                    console.warn('⚠️ Token verification failed:', verifyError);
                    
                    // Try refresh if available
                    if (refreshToken) {
                        try {
                            await this.refreshTokenSilently();
                        } catch (refreshError) {
                            console.warn('⚠️ Refresh also failed, clearing auth');
                            this.clearAuth();
                        }
                    } else {
                        this.clearAuth();
                    }
                }
            } else {
                console.log('🚫 No valid stored credentials found');
                if (this.dispatch) {
                    this.dispatch({ type: 'logout' });
                }
            }
        } catch (error) {
            console.error('💥 Auth startup check error:', error);
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: false });
            }
        } finally {
            this.authCheckCompleted = true;
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: false });
            }
            
            console.log('🔍 Enhanced auth check completed');
        }
    }

    /**
     * Verify token with server
     */
    async verifyTokenWithServer(token) {
        try {
            const response = await fetchWithConfig('/api/auth/verify', {
                method: 'GET',
                headers: {
                    [this.jwtConfig.headerName]: `${this.jwtConfig.headerType} ${token}`
                },
                signal: AbortSignal.timeout(10000)
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.valid === true;
            }
            
            return false;
        } catch (error) {
            console.warn('Token verification request failed:', error);
            return false;
        }
    }

    isAuthenticated() { 
        const token = this.getAccessToken();
        const user = this.getUser();
        
        const hasValidToken = token && this.isValidTokenFormat(token);
        const hasValidUser = user && typeof user === 'object' && user.id;
        
        return !!(hasValidToken && hasValidUser);
    }

    // ============================================================================
    // ENHANCED LOGIN/REGISTER WITH PROPER JWT HANDLING
    // ============================================================================

    async login(credentials, remember = false) {
        try {
            console.log('🔐 Starting enhanced login process...');
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: true });
            }
            
            const response = await fetchWithConfig('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    login: credentials.email || credentials.login, 
                    password: credentials.password 
                }),
                signal: AbortSignal.timeout(15000)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                const { access_token: accessToken, refresh_token: refreshToken } = data.tokens || {};
                
                if (!accessToken) {
                    throw new Error('No access token received');
                }
                
                // Validate received token
                if (!this.isValidTokenFormat(accessToken)) {
                    throw new Error('Received invalid access token format');
                }
                
                console.log('✅ Login successful, storing tokens...');
                const tokensStored = this.setTokens(accessToken, refreshToken, data.user, remember);
                
                if (!tokensStored) {
                    throw new Error('Failed to store authentication tokens');
                }
                
                if (this.dispatch) {
                    this.dispatch({ 
                        type: 'login_success',
                        payload: { 
                            user: data.user, 
                            token: accessToken, 
                            refreshToken: refreshToken 
                        } 
                    });
                }
                
                this.authCheckCompleted = true;
                this.scheduleTokenRefresh(accessToken);
                
                return { success: true, user: data.user };
            } else { 
                const errorMessage = this.getErrorMessage(data, response.status);
                if (this.dispatch) {
                    this.dispatch({ type: 'set_loading', payload: false });
                }
                return { success: false, error: errorMessage }; 
            }
        } catch (error) { 
            console.error('Login error:', error);
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: false });
            }
            
            return { success: false, error: this.getErrorMessage(error) }; 
        }
    }

    async register(userData, remember = false) {
        try {
            console.log('📝 Starting enhanced registration process...');
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: true });
            }
            
            const response = await fetchWithConfig('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(userData),
                signal: AbortSignal.timeout(15000)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                const { access_token: accessToken, refresh_token: refreshToken } = data.tokens || {};
                
                if (!accessToken) {
                    throw new Error('No access token received');
                }
                
                // Validate received token
                if (!this.isValidTokenFormat(accessToken)) {
                    throw new Error('Received invalid access token format');
                }
                
                console.log('✅ Registration successful, storing tokens...');
                const tokensStored = this.setTokens(accessToken, refreshToken, data.user, remember);
                
                if (!tokensStored) {
                    throw new Error('Failed to store authentication tokens');
                }
                
                if (this.dispatch) {
                    this.dispatch({ 
                        type: 'login_success',
                        payload: { 
                            user: data.user, 
                            token: accessToken, 
                            refreshToken: refreshToken 
                        } 
                    });
                }
                
                this.authCheckCompleted = true;
                this.scheduleTokenRefresh(accessToken);
                
                return { success: true, user: data.user };
            } else { 
                const errorMessage = this.getErrorMessage(data, response.status);
                if (this.dispatch) {
                    this.dispatch({ type: 'set_loading', payload: false });
                }
                return { success: false, error: errorMessage }; 
            }
        } catch (error) { 
            console.error('Registration error:', error);
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: false });
            }
            
            return { success: false, error: this.getErrorMessage(error) }; 
        }
    }

    // ============================================================================
    // ENHANCED TOKEN MANAGEMENT
    // ============================================================================

    async logout() { 
        console.log('🚪 Starting enhanced logout process...');
        
        try { 
            const token = this.getAccessToken(); 
            if (token) { 
                const response = await fetchWithConfig('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        [this.jwtConfig.headerName]: `${this.jwtConfig.headerType} ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('📡 Logout API response:', response.status);
            } 
        } catch (error) { 
            console.error('Logout API call failed:', error); 
        }
        
        this.clearAuth(); 
    }

    setTokens(accessToken, refreshToken, user, remember = false) { 
        // Determine storage type based on remember preference
        const storage = remember ? localStorage : sessionStorage; 
        
        // Also check if user explicitly set remember me previously
        const wasRemembered = localStorage.getItem(this.rememberKey) === 'true';
        const useLocalStorage = remember || wasRemembered;
        const finalStorage = useLocalStorage ? localStorage : sessionStorage;
        
        if (!accessToken || !user) {
            console.error('❌ Invalid tokens or user data provided');
            return false;
        }
        
        // Validate token before storing
        if (!this.isValidTokenFormat(accessToken)) {
            console.error('❌ Invalid token format provided');
            return false;
        }
        
        try {
            // Clear from both storages first
            [localStorage, sessionStorage].forEach(s => {
                s.removeItem(this.tokenKey);
                s.removeItem(this.refreshTokenKey);
                s.removeItem(this.userKey);
            });
            
            // Store in the chosen storage
            finalStorage.setItem(this.tokenKey, accessToken); 
            if (refreshToken) { 
                finalStorage.setItem(this.refreshTokenKey, refreshToken); 
            } 
            finalStorage.setItem(this.userKey, JSON.stringify(user));
            
            // Store remember preference
            if (remember) {
                localStorage.setItem(this.rememberKey, 'true');
            } else {
                localStorage.removeItem(this.rememberKey);
            }
            
            this.scheduleTokenRefresh(accessToken);
            console.log('✅ Tokens stored successfully in', useLocalStorage ? 'localStorage' : 'sessionStorage');
            return true;
        } catch (error) {
            console.error('❌ Error storing tokens:', error);
            return false;
        }
    }

    scheduleTokenRefresh(accessToken) {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        
        try {
            const expiry = this.getTokenExpiry(accessToken);
            if (!expiry) return;
            
            const timeToRefresh = expiry - Date.now() - this.jwtConfig.tokenRefreshThreshold;
            
            if (timeToRefresh > 0) {
                this.refreshTimer = setTimeout(() => {
                    console.log('⏰ Automatic token refresh triggered');
                    this.refreshTokenSilently();
                }, timeToRefresh);
                
                console.log(`⏰ Token refresh scheduled in ${Math.round(timeToRefresh / 1000 / 60)} minutes`);
            } else {
                console.log('⚠️ Token expires soon, scheduling immediate refresh');
                setTimeout(() => this.refreshTokenSilently(), 1000);
            }
        } catch (error) {
            console.error('Error scheduling token refresh:', error);
        }
    }

    async refreshTokenSilently() {
        if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject });
            });
        }

        this.isRefreshing = true;
        const refreshToken = this.getRefreshToken();

        if (!refreshToken) {
            console.warn('🔄 No refresh token available');
            this.clearAuth();
            this.processQueue(new Error('No refresh token'), null);
            return;
        }

        try {
            console.log('🔄 Attempting silent token refresh...');
            
            const response = await fetchWithConfig('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    [this.jwtConfig.headerName]: `${this.jwtConfig.headerType} ${refreshToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const { access_token: newAccessToken } = data.tokens || {};
                
                if (newAccessToken && this.isValidTokenFormat(newAccessToken)) {
                    const user = this.getUser();
                    const remember = !!localStorage.getItem(this.tokenKey);
                    this.setTokens(newAccessToken, refreshToken, user, remember);
                    
                    if (this.dispatch) {
                        this.dispatch({
                            type: 'set_token',
                            payload: newAccessToken
                        });
                    }
                    
                    this.processQueue(null, newAccessToken);
                    console.log('✅ Token refreshed successfully');
                } else {
                    throw new Error('Invalid token received from refresh');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuth();
            this.processQueue(error, null);
        } finally {
            this.isRefreshing = false;
        }
    }

    // ============================================================================
    // ENHANCED AUTHENTICATED REQUESTS
    // ============================================================================

    async authenticatedFetch(url, options = {}) {
        const token = this.getAccessToken();
        
        if (!token) {
            throw new Error('No authentication token available');
        }

        // Check if token needs refresh before making request
        if (this.needsRefresh(token)) {
            const refreshToken = this.getRefreshToken();
            if (refreshToken && !this.isRefreshing) {
                try {
                    await this.refreshTokenSilently();
                } catch (refreshError) {
                    throw new Error('Authentication failed');
                }
            }
        }

        const currentToken = this.getAccessToken();
        const config = {
            ...options,
            headers: {
                [this.jwtConfig.headerName]: `${this.jwtConfig.headerType} ${currentToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            }
        };

        try {
            const response = await fetchWithConfig(url, config);
            
            // Handle 401 with token refresh (but don't create loops)
            if (response.status === 401 && !this.isRefreshing) {
                try {
                    await this.refreshTokenSilently();
                    const newToken = this.getAccessToken();
                    if (newToken) {
                        config.headers[this.jwtConfig.headerName] = `${this.jwtConfig.headerType} ${newToken}`;
                        return await fetchWithConfig(url, config);
                    }
                } catch (refreshError) {
                    this.clearAuth();
                    throw new Error('Authentication failed');
                }
            }
            
            return response;
        } catch (error) {
            throw error;
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    clearAuth() { 
        console.log('🧹 Clearing enhanced auth data...');
        
        [localStorage, sessionStorage].forEach(s => { 
            s.removeItem(this.tokenKey); 
            s.removeItem(this.refreshTokenKey); 
            s.removeItem(this.userKey); 
        }); 
        
        localStorage.removeItem(this.rememberKey);
        
        if (this.refreshTimer) { 
            clearTimeout(this.refreshTimer); 
            this.refreshTimer = null;
        } 
        
        this.authCheckCompleted = true;
        
        if (this.dispatch) {
            this.dispatch({ type: 'logout' });
            this.dispatch({ type: 'set_loading', payload: false });
        }
        
        console.log('🧹 Enhanced auth cleared successfully'); 
    }

    processQueue(error, token = null) {
        this.failedQueue.forEach(({ resolve, reject }) => {
            if (error) {
                reject(error);
            } else {
                resolve(token);
            }
        });
        this.failedQueue = [];
    }

    getErrorMessage(error, statusCode = null) {
        if (!error) return 'An unknown error occurred';
        
        // Handle response data with error field
        if (error.error) return error.error;
        
        // Handle different error types
        const message = error.message || error.toString() || '';
        
        // Handle HTTP status codes
        if (statusCode) {
            switch (statusCode) {
                case 400: return 'Invalid request data';
                case 401: return 'Invalid credentials';
                case 403: return 'Access denied';
                case 404: return 'Service not found';
                case 409: return 'Account already exists';
                case 429: return 'Too many requests. Please try again later.';
                case 500: return 'Server error. Please try again later.';
                default: break;
            }
        }
        
        // Handle specific error patterns
        if (message.includes('AbortError') || message.includes('TimeoutError')) {
            return 'Request timed out. Please try again.';
        }
        
        if (message.includes('fetch') || message.includes('network')) {
            return 'Network error. Please check your connection.';
        }
        
        return message || 'An unexpected error occurred. Please try again.';
    }

    // Standard getter methods
    getAccessToken() { 
        return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey); 
    }
    
    getRefreshToken() { 
        return localStorage.getItem(this.refreshTokenKey) || sessionStorage.getItem(this.refreshTokenKey); 
    }
    
    getUser() { 
        const userStr = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey); 
        try { 
            return userStr ? JSON.parse(userStr) : null; 
        } catch (e) { 
            console.error('Error parsing user data:', e);
            this.clearUserData();
            return null; 
        } 
    }

    clearUserData() {
        [localStorage, sessionStorage].forEach(s => {
            s.removeItem(this.userKey);
        });
    }

    getCurrentUser() { 
        return this.getUser(); 
    }

    getApiUrl() {
        return apiUrl;
    }

    async waitForInitialization() {
        if (this.authCheckCompleted) {
            return;
        }
        
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        
        const maxWait = 5000;
        const startTime = Date.now();
        
        while (!this.authCheckCompleted && (Date.now() - startTime < maxWait)) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

const authService = new AuthService();
export default authService;
export { AuthService };