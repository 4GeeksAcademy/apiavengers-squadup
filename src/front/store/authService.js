// src/front/services/authService.js
// Complete Frontend Authentication Service - Optimized for 429 Prevention

// ✅ CORRECT: Use import.meta.env for Vite (not process.env)
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

class AuthService {
    constructor() {
        // Ensure API URL doesn't end with a slash to prevent double slashes
        const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        this.apiUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
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
    #verificationThrottle = 300000; // 5 minutes instead of 1 minute
    
    // Request deduplication for concurrent calls
    #pendingRequests = new Map();

    async checkAuthStatus(force = false) {
        // local check first – fast
        if (!this.isAuthenticated()) return false;

        // throttle network hit to once every 5 minutes unless forced
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
        this.#verifyLatch = fetch(`${this.apiUrl}/api/auth/verify`, {
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
        
        // CRITICAL FIX: Always run auth check when dispatch is available
        this.checkAuthOnStartup();
    }

    async checkAuthOnStartup() {
        if (this.authCheckCompleted) {
            console.log('⚠️ Auth check already completed, skipping');
            return;
        }

        console.log('🔍 Starting auth check on startup...');
        
        // CRITICAL FIX: Set loading state immediately
        if (this.dispatch) {
            this.dispatch({ type: 'set_loading', payload: true }); // FIXED: lowercase
        }
        
        // Actually check for existing tokens and user data
        await this.checkAndRefreshToken();
        
        console.log('✅ Auth check on startup completed');
        return true;
    }

    getAccessToken() {
        const localToken = localStorage.getItem(this.tokenKey);
        const sessionToken = sessionStorage.getItem(this.tokenKey);
        const token = localToken || sessionToken;
        
        console.log('🔍 getAccessToken():', {
            tokenKey: this.tokenKey,
            localToken: !!localToken,
            sessionToken: !!sessionToken,
            finalToken: !!token
        });
        
        return token;
    }

    getRefreshToken() {
        return localStorage.getItem(this.refreshTokenKey) || sessionStorage.getItem(this.refreshTokenKey);
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
        localStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        sessionStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem('token_expiration');
        localStorage.removeItem(this.userKey);
        this.#verifiedAt = 0; // Reset verification timestamp
        console.log('🧹 Tokens cleared');
    }

    // ============================================================================
    // AUTOMATIC TOKEN REFRESH - Optimized
    // ============================================================================

    setupTokenRefresh() {
        // Check token every 15 minutes (increased to reduce API calls)
        setInterval(() => {
            this.checkAndRefreshToken();
        }, 15 * 60 * 1000);

        // Check immediately when service is created, but with longer delay to avoid rate limiting
        setTimeout(() => {
            this.checkAndRefreshToken();
        }, 10000); // Increased delay to 10 seconds to avoid rate limiting
    }

    async checkAndRefreshToken() {
        const accessToken = this.getAccessToken();
        const refreshToken = this.getRefreshToken();
        const user = this.getUser();
        
        console.log('🔍 Auth check data:', { 
            hasToken: !!accessToken, 
            hasUser: !!user,
            hasRefresh: !!refreshToken,
            hasDispatch: !!this.dispatch,
            authCheckCompleted: this.authCheckCompleted,
            user: user
        });
        
        if (accessToken && user) {
            // If auth check is already completed and we have valid data, skip verification
            if (this.authCheckCompleted && this.dispatch) {
                console.log('✅ Auth already verified, updating global state');
                this.dispatch({ 
                    type: 'login_success',
                    payload: { 
                        user, 
                        token: accessToken, 
                        refreshToken 
                    } 
                });
                this.scheduleTokenRefresh(accessToken);
                return;
            }
            
            try {
                console.log('🔐 Verifying existing token...');
                const isValid = await this.verifyToken();
                
                if (isValid) {
                    console.log('✅ Token valid, updating global state to authenticated');
                    if (this.dispatch) {
                        this.dispatch({ 
                            type: 'login_success', // FIXED: lowercase
                            payload: { 
                                user, 
                                token: accessToken, 
                                refreshToken 
                            } 
                        });
                        console.log('✅ Global state updated with login_success');
                    }
                    this.scheduleTokenRefresh(accessToken);
                } else {
                    console.log('❌ Token invalid or expired, clearing auth');
                    this.clearAuth();
                }
            } catch (error) { 
                console.error('💥 Token verification failed:', error); 
                this.clearAuth(); 
            }
        } else {
            console.log('🚫 No valid auth data found, setting unauthenticated state');
            if (this.dispatch) {
                this.dispatch({ type: 'logout' }); // FIXED: lowercase
                console.log('✅ Global state updated with logout');
            }
        }

        // Only refresh if token is actually expired or about to expire
        if (this.isTokenExpired(10)) { // 10 minute buffer
            console.log('🔄 Token expired, attempting refresh...');
            return await this.refreshTokenSilently();
        }
        
        this.authCheckCompleted = true;
        console.log('✅ Auth check completed, authCheckCompleted =', this.authCheckCompleted);
    }

    getUser() { 
        const userStr = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey); 
        try { 
            return userStr ? JSON.parse(userStr) : null; 
        } catch (e) { 
            console.error('Error parsing user data:', e);
            return null; 
        } 
    }

    setTokens(accessToken, refreshToken, user, remember = false) { 
        console.log('🔧 setTokens called:', {
            hasAccessToken: !!accessToken,
            accessTokenValue: accessToken,
            hasRefreshToken: !!refreshToken,
            hasUser: !!user,
            remember: remember,
            tokenKey: this.tokenKey
        });
        
        const storage = remember ? localStorage : sessionStorage; 
        console.log('🔧 Using storage:', remember ? 'localStorage' : 'sessionStorage');
        
        storage.setItem(this.tokenKey, accessToken); 
        if (refreshToken) { 
            storage.setItem(this.refreshTokenKey, refreshToken); 
        } 
        storage.setItem(this.userKey, JSON.stringify(user)); 
        this.scheduleTokenRefresh(accessToken); 
        
        console.log('✅ Tokens stored successfully');
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
            this.dispatch({ type: 'logout' }); // FIXED: lowercase
            this.dispatch({ type: 'set_loading', payload: false }); // FIXED: lowercase
            console.log('✅ Global state cleared with logout');
        }
        
        this.authCheckCompleted = false; // <-- Add this line
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
                        type: 'set_token', // FIXED: lowercase
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
        // Use the existing authenticatedFetch method instead
        return this.authenticatedFetch(url, options);
    }

    async login(credentials, remember = false) {
        try {
            console.log('🔐 Starting login process...');
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: true });
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
                this.setTokens(accessToken, refreshToken, data.user, remember);
                this.authCheckCompleted = true; // <-- Add this line
                
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
    }

    async register(userData, remember = false) {
        try {
            console.log('📝 Starting registration process...');
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: true }); // FIXED: lowercase
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
                this.setTokens(accessToken, refreshToken, data.user, remember);
                this.authCheckCompleted = true; // <-- Add this line
                
                if (this.dispatch) {
                    this.dispatch({ 
                        type: 'login_success', // FIXED: lowercase
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
                    this.dispatch({ type: 'set_loading', payload: false }); // FIXED: lowercase
                }
                return { success: false, error: data.error || 'Registration failed' }; 
            }
        } catch (error) { 
            console.error('Registration error:', error);
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: false }); // FIXED: lowercase
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
        
        // Rate limiting: Don't verify if we just verified recently
        const now = Date.now();
        if (now - this.#verifiedAt < this.#verificationThrottle) {
            console.log('🚀 Using cached verification (throttled)');
            return true;
        }
        
        try { 
            console.log('🔍 Verifying token with server...');
            const res = await fetch(`${this.apiUrl}/api/auth/verify`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            }); 
            
            if (res.ok) {
                const data = await res.json();
                console.log('✅ Token verification successful');
                this.#verifiedAt = now; // Update verification timestamp
                this.authCheckCompleted = true; // <-- Add this line
                
                // Update user data if it changed
                if (data.user && this.dispatch) {
                    this.dispatch({ type: 'set_user', payload: data.user }); // FIXED: lowercase
                }
                return true;
            } else if (res.status === 401) {
                console.log('❌ Token verification failed: 401 Unauthorized (expired/invalid token)');
                return false;
            } else if (res.status === 429) {
                console.log('⚠️ Token verification rate limited (429), will retry later');
                return true; // Assume token is still valid if rate limited
            } else {
                console.log('❌ Token verification failed with status:', res.status);
                return false;
            }
        } catch (error) { 
            console.error('💥 Token verification error:', error);
            return false; 
        } 
    }
    
    // FIXED: Only return true if token is valid AND not checking
    isAuthenticated() { 
        const token = this.getAccessToken();
        const user = this.getUser();
        
        // If we're still checking auth, don't claim to be authenticated yet
        if (!this.authCheckCompleted) {
            console.log('🔍 AuthService.isAuthenticated(): Auth check not completed yet, returning false');
            return false;
        }
        
        const result = !!(token && user);
        console.log('🔍 AuthService.isAuthenticated():', { 
            hasToken: !!token, 
            hasUser: !!user, 
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


}

const authService = new AuthService();
export default authService;
export { AuthService };