// src/front/store/authService.js - MINIMAL CRITICAL FIXES for race conditions

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
        this.initializationPromise = null; // 🔧 NEW: Prevent multiple initializations
        this.isInitializing = false; // 🔧 NEW: Track initialization state
        
        console.log('🔐 AuthService initialized');
    }

    setDispatch(dispatch) {
        console.log('✅ Dispatch function injected into AuthService.');
        this.dispatch = dispatch;
        
        // 🔧 CRITICAL FIX: Prevent multiple concurrent initializations
        if (this.isInitializing || this.authCheckCompleted) {
            console.log('🔍 Auth already initializing or completed, reusing existing state');
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
        
        console.log('🔍 Starting one-time auth check on startup...');
        
        if (this.dispatch) {
            this.dispatch({ type: 'set_loading', payload: true });
        }
        
        try {
            const accessToken = this.getAccessToken();
            const storedUser = this.getUser();
            
            // 🔧 ENHANCED: More thorough validation without breaking existing logic
            if (accessToken && storedUser && this.isValidTokenFormat(accessToken)) {
                console.log('🔍 Found stored credentials, verifying with server...');
                
                try {
                    // 🔧 IMPROVED: Add timeout and better error handling
                    const isValid = await Promise.race([
                        this.verifyToken(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Verification timeout')), 8000)
                        )
                    ]);
                    
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
                } catch (verifyError) {
                    console.log('⚠️ Token verification failed with error:', verifyError.message);
                    
                    // 🔧 IMPROVED: Better handling of network vs auth errors
                    if (verifyError.message.includes('timeout') || 
                        verifyError.message.includes('Network') || 
                        verifyError.message.includes('fetch')) {
                        console.log('⚠️ Network error during verification, keeping local auth temporarily');
                        if (this.dispatch) {
                            this.dispatch({ 
                                type: 'login_success',
                                payload: { 
                                    user: storedUser, 
                                    token: accessToken, 
                                    refreshToken: this.getRefreshToken() 
                                }
                            });
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
            this.clearAuth();
        } finally {
            // 🔧 CRITICAL: Always mark as completed and stop loading
            this.authCheckCompleted = true;
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: false });
            }
            
            console.log('🔍 Auth check completed');
        }
    }

    // 🔧 IMPROVED: Better token validation
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

    // 🔧 IMPROVED: Better token verification with timeout and retry
    async verifyToken() { 
        const token = this.getAccessToken(); 
        if (!token) {
            console.log('🚫 No token to verify');
            return false; 
        }
        
        // Check token format before making API call
        if (!this.isValidTokenFormat(token)) {
            console.log('🚫 Invalid token format, not making API call');
            return false;
        }
        
        try { 
            console.log('🔍 Verifying token with server...');
            
            // 🔧 IMPROVED: Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const res = await fetch(`${this.apiUrl}/api/auth/verify`, { 
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal
            }); 
            
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const data = await res.json();
                console.log('✅ Token verification successful');
                
                // 🔧 IMPROVED: Update user data if it changed, but don't trigger dispatch loops
                if (data.user && this.dispatch && data.user.id !== this.getUser()?.id) {
                    this.dispatch({ type: 'set_user', payload: data.user });
                }
                return true;
            } else if (res.status === 401) {
                console.log('❌ Token verification failed: 401 Unauthorized');
                return false;
            } else {
                console.log('❌ Token verification failed with status:', res.status);
                return false;
            }
        } catch (error) { 
            if (error.name === 'AbortError') {
                console.error('💥 Token verification timeout');
                throw new Error('Network timeout during token verification');
            } else {
                console.error('💥 Token verification error:', error);
                throw new Error('Network error during token verification');
            }
        } 
    }

    // 🔧 IMPROVED: More reliable authentication check
    isAuthenticated() { 
        const token = this.getAccessToken();
        const user = this.getUser();
        
        // 🔧 CRITICAL: If we're still checking auth, be conservative
        if (!this.authCheckCompleted) {
            console.log('🔍 AuthService.isAuthenticated(): Auth check not completed yet');
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

    // 🔧 IMPROVED: Better error handling in login
    async login(credentials, remember = false) {
        try {
            console.log('🔐 Starting login process...');
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: true });
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            const response = await fetch(`${this.apiUrl}/api/auth/login`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    login: credentials.email || credentials.login, 
                    password: credentials.password 
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
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
                }
                
                // 🔧 CRITICAL: Mark auth as completed
                this.authCheckCompleted = true;
                
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
            
            if (error.name === 'AbortError') {
                return { success: false, error: 'Login request timed out. Please try again.' };
            }
            
            return { success: false, error: error.message || 'Network error' }; 
        }
    }

    // 🔧 IMPROVED: Better registration flow
    async register(userData, remember = false) {
        try {
            console.log('📝 Starting registration process...');
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: true });
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(`${this.apiUrl}/api/auth/register`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(userData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
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
                }
                
                // Mark auth as completed
                this.authCheckCompleted = true;
                
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
            
            if (error.name === 'AbortError') {
                return { success: false, error: 'Registration request timed out. Please try again.' };
            }
            
            return { success: false, error: error.message || 'Network error' }; 
        }
    }

    // 🔧 IMPROVED: Better logout handling
    async logout() { 
        console.log('🚪 Starting logout process...');
        
        try { 
            const token = this.getAccessToken(); 
            if (token) { 
                // Don't wait for logout API call to complete - clear local state immediately
                fetch(`${this.apiUrl}/api/auth/logout`, { 
                    method: 'POST', 
                    headers: { 'Authorization': `Bearer ${token}` } 
                }).catch(error => {
                    console.log('⚠️ Logout API call failed (non-critical):', error);
                });
            } 
        } catch (error) { 
            console.error('Logout API call failed:', error); 
        }
        
        // Always clear local auth regardless of API call result
        this.clearAuth(); 
    }

    // 🔧 IMPROVED: Better token storage validation
    setTokens(accessToken, refreshToken, user, remember = false) { 
        const storage = remember ? localStorage : sessionStorage; 
        
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

    // 🔧 IMPROVED: Better auth clearing
    clearAuth() { 
        console.log('🧹 Clearing auth data...');
        
        [localStorage, sessionStorage].forEach(s => { 
            s.removeItem(this.tokenKey); 
            s.removeItem(this.refreshTokenKey); 
            s.removeItem(this.userKey); 
        }); 
        
        if (this.refreshTimer) { 
            clearTimeout(this.refreshTimer); 
            this.refreshTimer = null;
        } 
        
        if (this.dispatch) {
            this.dispatch({ type: 'logout' });
            this.dispatch({ type: 'set_loading', payload: false });
        }
        
        console.log('🧹 Auth cleared successfully'); 
    }

    // Utility methods (unchanged)
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
        return this.apiUrl;
    }

    // 🔧 NEW: Add method for waiting for initialization
    async waitForInitialization() {
        if (this.authCheckCompleted) {
            return;
        }
        
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        
        // Double check with timeout
        const maxWait = 5000; // 5 seconds max
        const startTime = Date.now();
        
        while (!this.authCheckCompleted && (Date.now() - startTime < maxWait)) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // 🔧 IMPROVED: Simplified authenticated fetch
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
            
            // Handle 401 with token refresh
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

    // Token refresh methods (unchanged but with better error handling)
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
}

const authService = new AuthService();
export default authService;
export { AuthService };