// src/front/store/authService.js - FIXED VERSION to prevent loops

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
        
        // 🔧 CRITICAL FIXES for preventing loops
        this.authCheckCompleted = false;
        this.initializationPromise = null;
        this.isInitializing = false;
        this.lastAuthCheck = 0; // Prevent rapid auth checks
        this.AUTH_CHECK_COOLDOWN = 5000; // 5 second cooldown between auth checks
        
        console.log('🔐 AuthService initialized');
    }

    setDispatch(dispatch) {
        console.log('✅ Dispatch function injected into AuthService.');
        this.dispatch = dispatch;
        
        // 🔧 CRITICAL: Prevent multiple concurrent initializations
        const now = Date.now();
        if (this.isInitializing || 
            this.authCheckCompleted || 
            (now - this.lastAuthCheck < this.AUTH_CHECK_COOLDOWN)) {
            console.log('🔍 Auth check skipped - already in progress or completed recently');
            return this.initializationPromise || Promise.resolve();
        }
        
        if (!this.initializationPromise) {
            this.isInitializing = true;
            this.lastAuthCheck = now;
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
        
        console.log('🔍 Starting ONE-TIME auth check on startup...');
        
        if (this.dispatch) {
            this.dispatch({ type: 'set_loading', payload: true });
        }
        
        try {
            const accessToken = this.getAccessToken();
            const storedUser = this.getUser();
            
            if (accessToken && storedUser && this.isValidTokenFormat(accessToken)) {
                console.log('🔍 Found stored credentials, verifying with server...');
                
                try {
                    // 🔧 CRITICAL: Add timeout and prevent multiple verification attempts
                    const isValid = await Promise.race([
                        this.verifyTokenOnce(), // Use single-use verification
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
                    console.log('⚠️ Token verification failed:', verifyError.message);
                    
                    // Keep local auth for network errors, clear for auth errors
                    if (verifyError.message.includes('timeout') || 
                        verifyError.message.includes('Network')) {
                        console.log('⚠️ Network error, keeping local auth temporarily');
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
            
            console.log('🔍 Auth check completed - NO MORE AUTO CHECKS');
        }
    }

    // 🔧 NEW: Single-use token verification to prevent loops
    async verifyTokenOnce() {
        if (this.isVerifying) {
            console.log('🔍 Already verifying token, skipping...');
            return false;
        }
        
        this.isVerifying = true;
        
        try {
            const token = this.getAccessToken();
            if (!token || !this.isValidTokenFormat(token)) {
                return false;
            }
            
            console.log('🔍 Verifying token with server (single attempt)...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const res = await fetch(`${this.apiUrl}/api/auth/verify`, { 
                headers: { 
                    // 🔧 CRITICAL: Use both header formats for better CORS compatibility
                    'authorization': `Bearer ${token}`,  // lowercase for some CORS setups
                    'Authorization': `Bearer ${token}`   // standard capitalized version
                },
                signal: controller.signal
            }); 
            
            clearTimeout(timeoutId);
            
            if (res.ok) {
                console.log('✅ Token verification successful');
                return true;
            } else {
                console.log('❌ Token verification failed with status:', res.status);
                return false;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Network timeout during token verification');
            } else {
                throw new Error('Network error during token verification');
            }
        } finally {
            this.isVerifying = false;
        }
    }

    isValidTokenFormat(token) {
        if (!token || typeof token !== 'string') return false;
        
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            const payload = JSON.parse(atob(parts[1]));
            
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

    // 🔧 CRITICAL: More reliable authentication check
    isAuthenticated() { 
        const token = this.getAccessToken();
        const user = this.getUser();
        
        // 🔧 CRITICAL: If we're still checking auth, be conservative but don't block
        if (!this.authCheckCompleted && this.isInitializing) {
            console.log('🔍 Auth check in progress, using stored state');
            return !!(token && user);
        }
        
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

    async login(credentials, remember = false) {
        try {
            console.log('🔐 Starting login process...');
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: true });
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
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
                
                // 🔧 CRITICAL: Mark auth as completed after successful login
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

    async logout() { 
        console.log('🚪 Starting logout process...');
        
        try { 
            const token = this.getAccessToken(); 
            if (token) { 
                fetch(`${this.apiUrl}/api/auth/logout`, { 
                    method: 'POST', 
                    headers: { 
                        // 🔧 CRITICAL: Use both header formats for logout too
                        'authorization': `Bearer ${token}`,
                        'Authorization': `Bearer ${token}`
                    } 
                }).catch(error => {
                    console.log('⚠️ Logout API call failed (non-critical):', error);
                });
            } 
        } catch (error) { 
            console.error('Logout API call failed:', error); 
        }
        
        // Always clear local auth
        this.clearAuth(); 
    }

    setTokens(accessToken, refreshToken, user, remember = false) { 
        const storage = remember ? localStorage : sessionStorage; 
        
        if (!accessToken || !user) {
            console.error('❌ Invalid tokens or user data provided');
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
        
        [localStorage, sessionStorage].forEach(s => { 
            s.removeItem(this.tokenKey); 
            s.removeItem(this.refreshTokenKey); 
            s.removeItem(this.userKey); 
        }); 
        
        if (this.refreshTimer) { 
            clearTimeout(this.refreshTimer); 
            this.refreshTimer = null;
        } 
        
        // 🔧 CRITICAL: Reset auth state flags
        this.authCheckCompleted = true; // Prevent new checks after logout
        this.isVerifying = false;
        
        if (this.dispatch) {
            this.dispatch({ type: 'logout' });
            this.dispatch({ type: 'set_loading', payload: false });
        }
        
        console.log('🧹 Auth cleared successfully'); 
    }

    // Utility methods remain the same
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

    // 🔧 NEW: Method for components to wait for initialization
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

    // 🔧 CRITICAL: Enhanced authenticatedFetch with CORS-compatible headers
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
                // 🔧 CRITICAL: Use both header formats for better CORS compatibility
                'authorization': `Bearer ${token}`,  // lowercase for some CORS setups
                'Authorization': `Bearer ${token}`   // standard capitalized version
            }
        };

        try {
            const response = await fetch(url, config);
            
            // Handle 401 with token refresh (but don't create loops)
            if (response.status === 401 && !this.isRefreshing) {
                try {
                    await this.refreshTokenSilently();
                    const newToken = this.getAccessToken();
                    if (newToken) {
                        config.headers['authorization'] = `Bearer ${newToken}`;
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
            const refreshTime = timeToExpiry - (5 * 60 * 1000);
            
            if (refreshTime > 0) {
                this.refreshTimer = setTimeout(() => {
                    this.refreshTokenSilently();
                }, refreshTime);
                console.log(`⏰ Token refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`);
            } else {
                console.log('⚠️ Token expires soon or is expired');
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
                    // 🔧 CRITICAL: Use both header formats for refresh too
                    'authorization': `Bearer ${refreshToken}`,
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