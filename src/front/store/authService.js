// src/front/services/authService.js
// Complete Frontend Authentication Service - Optimized for 429 Prevention

// ✅ CORRECT: Use import.meta.env for Vite (not process.env)
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

class AuthService {
    constructor() {
        this.apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        this.tokenKey = 'squadup_access_token';
        this.refreshTokenKey = 'squadup_refresh_token';
        this.userKey = 'squadup_user';
        
        this.dispatch = null;
        this.isRefreshing = false;
        this.failedQueue = [];
        this.refreshTimer = null;
        this.authCheckCompleted = false;
        
        console.log('🔧 AuthService initialized with API URL:', API_BASE_URL);
        
        // Setup automatic token refresh with reduced frequency
        this.setupTokenRefresh();
    }
    
    #verifyLatch = null; 
    #verifiedAt = 0;       
    #verificationThrottle = 60000; 
    
    // Request deduplication for concurrent calls
    #pendingRequests = new Map();

    async checkAuthStatus(force = false) {
        // local check first – fast
        if (!this.isAuthenticated()) return false;

        // throttle network hit to once every 60 s unless forced
        const now = Date.now();
        if (!force && now - this.#verifiedAt < this.#verificationThrottle) {
            console.log('🚀 Using cached auth status (throttled)');
            return true;
        }

        // reuse ongoing request
        if (this.#verifyLatch) {
            console.log('🔄 Reusing existing verification request');
            return this.#verifyLatch;
        }

        console.log('🌐 Making network auth verification');
        
        // real network verify
        this.#verifyLatch = fetch(`${API_BASE_URL}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${this.getAccessToken()}` },
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
                localStorage.setItem('user', JSON.stringify(data.user));
                this.#verifiedAt = Date.now();
                console.log('✅ Auth verification successful');
                return true;
            })
            .catch((error) => {
                console.log('❌ Auth verification failed:', error);
                return false;
            })
            .finally(() => { 
                this.#verifyLatch = null; 
            });

        return this.#verifyLatch;
    }

    setDispatch(dispatch) {
        console.log('✅ Dispatch function injected into AuthService.');
        this.dispatch = dispatch;
        
        // CRITICAL FIX: Only run auth check once per session
        if (!this.authCheckCompleted) {
            this.checkAuthOnStartup();
        }
    }

    async checkAuthOnStartup() {
        if (this.authCheckCompleted) {
            console.log('🔍 Auth check already completed, skipping...');
            return;
        }
        
        console.log('🔍 Starting auth check on startup...');
        
        if (this.dispatch) {
            this.dispatch({ type: 'set_loading', payload: true });
        }
        
        console.log('✅ Tokens stored successfully');
        return true;
    }

    getAccessToken() {
        return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    }

    getRefreshToken() {
        return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
    }

    getTokenExpiration() {
        const expiration = localStorage.getItem('token_expiration');
        return expiration ? parseInt(expiration) : null;
    }

    isTokenExpired(bufferMinutes = 5) {
        const expiration = this.getTokenExpiration();
        if (!expiration) return true;
        
        // Consider token expired buffer minutes before actual expiration
        return Date.now() > (expiration - bufferMinutes * 60 * 1000);
    }

    clearTokens() {
        localStorage.removeItem('access_token');
        sessionStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expiration');
        localStorage.removeItem('user');
        this.#verifiedAt = 0; // Reset verification timestamp
        console.log('🧹 Tokens cleared');
    }

    // ============================================================================
    // AUTOMATIC TOKEN REFRESH - Optimized
    // ============================================================================

    setupTokenRefresh() {
        // Check token every 10 minutes (increased from 5 to reduce API calls)
        setInterval(() => {
            this.checkAndRefreshToken();
        }, 10 * 60 * 1000);

        // Check immediately when service is created
        setTimeout(() => {
            this.checkAndRefreshToken();
        }, 2000); // Increased delay to avoid immediate refresh
    }

    async checkAndRefreshToken() {
        const accessToken = this.getAccessToken();
        const storedUser = this.getUser();
        
        // ENHANCED: More thorough validation
        if (accessToken && storedUser && this.isValidTokenFormat(accessToken)) {
            try {
                console.log('🔍 Found stored credentials, verifying with server...');
                const isValid = await this.verifyToken();
                
                if (isValid && this.dispatch) {
                    console.log('✅ Token verified, setting authenticated state');
                    this.dispatch({ 
                        type: 'login_success',
                        payload: { 
                            user: storedUser, 
                            token: accessToken, 
                            refreshToken: this.getRefreshToken() 
                        }
                    });
                    this.scheduleTokenRefresh(accessToken);
                } else {
                    console.log('❌ Token verification failed, clearing auth');
                    this.clearAuth();
                }
            } catch (error) {
                console.error('💥 Auth verification error:', error);
                this.clearAuth();
            }
        } else {
            console.log('🚫 No valid stored credentials found');
            if (this.dispatch) {
                this.dispatch({ type: 'logout' });
            }
        }
        
        // CRITICAL: Mark as completed
        this.authCheckCompleted = true;
        
        if (this.dispatch) {
            this.dispatch({ type: 'set_loading', payload: false });

        // Only refresh if token is actually expired or about to expire
        if (this.isTokenExpired(10)) { // 10 minute buffer
            console.log('🔄 Token expired, attempting refresh...');
            return await this.refreshAccessToken();
        }
        
        console.log('🔍 Auth check completed');
    }

    // NEW: Validate token format before making API calls
    isValidTokenFormat(token) {
        if (!token || typeof token !== 'string') return false;
        
        try {
            // JWT tokens have 3 parts separated by dots
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            // Try to decode the payload to check if it's valid JSON
            const payload = JSON.parse(atob(parts[1]));
            
            // Check if token has expiry and it's not expired
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                console.log('🚫 Token is expired');
                return false;
            }
            
            return true;
        } catch (error) {
            console.log('🚫 Invalid token format:', error);
            return false;
        }
    }

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
            // ENHANCED: Clear corrupted user data
            this.clearUserData();
            return null; 
        } 
    }

    clearUserData() {
        [localStorage, sessionStorage].forEach(s => {
            s.removeItem(this.userKey);
        });
    }

    setTokens(accessToken, refreshToken, user, remember = false) { 
        const storage = remember ? localStorage : sessionStorage; 
        
        // ENHANCED: Validate inputs before storing
        if (!accessToken || !user) {
            console.error('❌ Invalid tokens or user data provided to setTokens');
            return false;
        }
        
        try {
            storage.setItem(this.tokenKey, accessToken); 
            if (refreshToken) { 
                storage.setItem(this.refreshTokenKey, refreshToken); 
            } 
            storage.setItem(this.userKey, JSON.stringify(user)); 
            this.scheduleTokenRefresh(accessToken);
            return true;
        } catch (error) {
            console.error('❌ Error storing tokens:', error);
            return false;
        }
    }

    clearAuth() { 
        console.log('🧹 Clearing auth data...');
        
        // Clear storage
        [localStorage, sessionStorage].forEach(s => { 
            s.removeItem(this.tokenKey); 
            s.removeItem(this.refreshTokenKey); 
            s.removeItem(this.userKey); 
        }); 
        
        // Clear refresh timer
        if (this.refreshTimer) { 
            clearTimeout(this.refreshTimer); 
            this.refreshTimer = null;
        } 
        
        // Update global state
        if (this.dispatch) {
            this.dispatch({ type: 'logout' });
            this.dispatch({ type: 'set_loading', payload: false });
            console.log('✅ Global state cleared with logout');
        }
        
        console.log('🧹 Auth cleared successfully'); 
    }

    scheduleTokenRefresh(accessToken) {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        
        try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const expiry = payload.exp * 1000;
            const now = Date.now();
            const timeToExpiry = expiry - now;
            const refreshTime = timeToExpiry - (5 * 60 * 1000); // 5 minutes before expiry
            
            if (refreshTime > 0) {
                this.refreshTimer = setTimeout(() => {
                    this.refreshTokenSilently();
                }, refreshTime);
                console.log(`⏰ Token refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`);
            } else {
                console.log('⚠️ Token is already expired or expires very soon');
                this.clearAuth();
            }
        } catch (error) {
            console.error('Error scheduling token refresh:', error);
            this.clearAuth();
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
            this.clearAuth();
            this.processQueue(new Error('No refresh token'), null);
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${refreshToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const { access_token: newAccessToken } = data.tokens || {};
                
                if (newAccessToken && this.dispatch) {
                    const user = this.getUser();
                    const remember = !!localStorage.getItem(this.tokenKey);
                    this.setTokens(newAccessToken, refreshToken, user, remember);
                    
                    this.dispatch({
                        type: 'set_token',
                        payload: newAccessToken
                    });
                    
                    this.processQueue(null, newAccessToken);
                    console.log('✅ Token refreshed successfully');
                } else {
                    throw new Error('No access token in refresh response');
                }
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuth();
            this.processQueue(error, null);
        } finally {
            this.isRefreshing = false;
        }
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

    // ============================================================================
    // API REQUEST HELPER WITH AUTO-REFRESH - Optimized with deduplication
    // ============================================================================

    async makeAuthenticatedRequest(url, options = {}) {
        const accessToken = this.getAccessToken();
        
        if (!accessToken) {
            throw new Error('No access token available');
        }

        // Create a unique key for this request to deduplicate
        const requestKey = `${options.method || 'GET'}:${url}`;
        
        // Check if we have a pending request for this URL
        if (this.#pendingRequests.has(requestKey)) {
            console.log('🔄 Reusing pending request:', requestKey);
            return this.#pendingRequests.get(requestKey);
        }

        // Check if token needs refresh
        if (this.isTokenExpired()) {
            if (this.isRefreshing) {
                // Wait for refresh to complete
                const refreshPromise = new Promise((resolve, reject) => {
                    this.failedQueue.push({ resolve, reject });
                });
                
                const token = await refreshPromise;
                return this.makeRequest(url, { ...options, token });
            } else {
                const refreshed = await this.refreshAccessToken();
                if (!refreshed) {
                    throw new Error('Unable to refresh token');
                }
            }
            
            const response = await fetch(`${this.apiUrl}/api/auth/login`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    login: credentials.email || credentials.login, 
                    password: credentials.password 
                }) 
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                const { access_token: accessToken, refresh_token: refreshToken } = data.tokens || {};
                
                if (!accessToken) {
                    throw new Error('No access token received');
                }
                
                console.log('✅ Login successful, storing tokens and updating global state...');
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
                    console.log('✅ Global state updated after login');
                }
                
                return { success: true, user: data.user };
            } else { 
                if (this.dispatch) {
                    this.dispatch({ type: 'set_loading', payload: false });
                }
                return { success: false, error: data.error || 'Login failed' }; 
            }
        } catch (error) { 
            console.error('Login error:', error);
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: false });
            }
            return { success: false, error: error.message || 'Network error' }; 
        }

        // Create the request promise
        const requestPromise = this.makeRequest(url, { ...options, token: this.getAccessToken() });
        
        // Store it for deduplication
        this.#pendingRequests.set(requestKey, requestPromise);
        
        // Clean up after request completes
        requestPromise.finally(() => {
            this.#pendingRequests.delete(requestKey);
        });

        return requestPromise;
    }

    async register(userData, remember = false) {
        try {
            console.log('📝 Starting registration process...');
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: true });
            }
            
            const response = await fetch(`${this.apiUrl}/api/auth/register`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(userData) 
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                const { access_token: accessToken, refresh_token: refreshToken } = data.tokens || {};
                
                if (!accessToken) {
                    throw new Error('No access token received');
                }
                
                console.log('✅ Registration successful, storing tokens and updating global state...');
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
                    console.log('✅ Global state updated after registration');
                }
                
                return { success: true, user: data.user };
            } else { 
                if (this.dispatch) {
                    this.dispatch({ type: 'set_loading', payload: false });
                }
                return { success: false, error: data.error || 'Registration failed' }; 
            }
        } catch (error) { 
            console.error('Registration error:', error);
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: false });
            }
            return { success: false, error: error.message || 'Network error' }; 
        }
    }

    async logout() { 
        try { 
            const token = this.getAccessToken(); 
            if (token) { 
                await fetch(`${this.apiUrl}/api/auth/logout`, { 
                    method: 'POST', 
                    headers: { 'Authorization': `Bearer ${token}` } 
                }); 
            } 
        } catch (error) { 
            console.error('Logout API call failed:', error); 
        } finally { 
            this.clearAuth(); 
        } 
    }
    
    async verifyToken() { 
        const token = this.getAccessToken(); 
        if (!token) {
            console.log('🚫 No token to verify');
            return false; 
        }
        
        // ENHANCED: Check token format before making API call
        if (!this.isValidTokenFormat(token)) {
            console.log('🚫 Invalid token format, not making API call');
            return false;
        }
        
        try { 
            console.log('🔍 Verifying token with server...');
            const res = await fetch(`${this.apiUrl}/api/auth/verify`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            }); 
            
            if (res.ok) {
                const data = await res.json();
                console.log('✅ Token verification successful');
                
                // Update user data if it changed
                if (data.user && this.dispatch) {
                    this.dispatch({ type: 'set_user', payload: data.user });
                }
                return true;
            } else if (res.status === 401) {
                console.log('❌ Token verification failed: 401 Unauthorized (expired/invalid token)');
                return false;
            } else {
                console.log('❌ Token verification failed with status:', res.status);
                return false;
            }
        } catch (error) { 
            console.error('💥 Token verification error:', error);
            return false; 
        } 
    }
    
    // ENHANCED: More reliable authentication check
    isAuthenticated() { 
        const token = this.getAccessToken();
        const user = this.getUser();
        
        // If we're still checking auth, don't claim to be authenticated yet
        if (!this.authCheckCompleted) {
            console.log('🔍 AuthService.isAuthenticated(): Auth check not completed yet, returning false');
            return false;
        }
        
        // Enhanced validation
        const hasValidToken = token && this.isValidTokenFormat(token);
        const hasValidUser = user && typeof user === 'object' && user.id;
        
        const result = !!(hasValidToken && hasValidUser);
        console.log('🔍 AuthService.isAuthenticated():', { 
            hasToken: !!token, 
            hasValidToken,
            hasUser: !!user,
            hasValidUser,
            authCheckCompleted: this.authCheckCompleted,
            result 
        });
        return result; 
    }
    
    getCurrentUser() { 
        return this.getUser(); 
    }

    getApiUrl() {
        return this.apiUrl;
    }

    async authenticatedFetch(url, options = {}) {
        const token = this.getAccessToken();
        
        if (!token) {
            throw new Error('No authentication token available');
        }

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                try {
                    await this.refreshTokenSilently();
                    const newToken = this.getAccessToken();
                    if (newToken) {
                        config.headers['Authorization'] = `Bearer ${newToken}`;
                        return await fetch(url, config);
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

    // ENHANCED: Steam integration with better error handling
    async connectSteam(steamId) {
        if (!steamId) {
            throw new Error('Steam ID is required');
        }

        try {
            const response = await this.authenticatedFetch(`${this.apiUrl}/api/auth/steam/connect`, {
                method: 'POST',
                body: JSON.stringify({ steam_id: steamId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to connect Steam account');
            }

            const data = await response.json();
            
            // Update user in store if backend returns updated user
            if (data.user && this.dispatch) {
                this.dispatch({ 
                    type: 'set_user',
                    payload: data.user 
                });
            }

            return data;
        } catch (error) {
            console.error('Steam connection failed:', error);
            throw error;
        }
    }

            if (response.ok) {
                const tokensSet = this.setTokens(data.access_token, data.refresh_token);
                if (tokensSet) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    console.log('✅ Login successful');
                    return { success: true, user: data.user };
                } else {
                    return { success: false, error: 'Failed to store authentication tokens' };
                }
            } else {
                console.log('❌ Login failed:', data.error);
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            return { success: false, error: 'Network error occurred' };
        }
    }

    async logout() {
        try {
            console.log('🚪 Logging out...');
            
            // Clear all tokens and user data
            this.clearTokens();
            
            console.log('✅ Logout successful');
            return { success: true };
        } catch (error) {
            console.error('❌ Logout error:', error);
            return { success: false, error: 'Logout failed' };
        }
    }

    async verifyToken() {
        try {
            const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/auth/verify`);
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('user', JSON.stringify(data.user));
                return { valid: true, user: data.user };
            } else {
                return { valid: false };
            }
        } catch (error) {
            console.error('Token verification error:', error);
            return { valid: false };
        }
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    isAuthenticated() {
        const accessToken = this.getAccessToken();
        const user = this.getCurrentUser();
        return !!(accessToken && user);
    }

    getApiUrl() {
        return API_BASE_URL;
    }

    getUserInfo() {
        return this.getCurrentUser();
    }

    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.roles && user.roles.includes(role);
    }
}

const authService = new AuthService();
export default authService;
export { AuthService };