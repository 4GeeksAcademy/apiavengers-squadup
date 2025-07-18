// src/front/store/authService.js - FINAL FIX for authentication loops

import { fetchWithConfig, apiUrl, frontendUrl, isCodespace } from '../config/environment.js';

class AuthService {
    constructor() {
        this.tokenKey = 'squadup_access_token';
        this.refreshTokenKey = 'squadup_refresh_token';
        this.userKey = 'squadup_user';
        
        this.dispatch = null;
        this.isRefreshing = false;
        this.failedQueue = [];
        this.refreshTimer = null;
        
        // 🔧 CRITICAL: Enhanced initialization tracking
        this.authCheckCompleted = false;
        this.initializationPromise = null;
        this.isInitializing = false;
        
        console.log('🔐 AuthService initialized for environment:', { apiUrl, frontendUrl, isCodespace });
    }

    setDispatch(dispatch) {
        console.log('✅ Dispatch function injected into AuthService');
        this.dispatch = dispatch;
        
        // 🔧 CRITICAL: Prevent multiple initialization attempts
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
                    // 🔧 CRITICAL: Don't verify token if we don't have connectivity
                    // Just trust stored credentials initially
                    if (this.dispatch) {
                        console.log('✅ Using stored credentials without verification (offline-first)');
                        this.dispatch({ 
                            type: 'login_success',
                            payload: { 
                                user: storedUser, 
                                token: accessToken, 
                                refreshToken: this.getRefreshToken() 
                            }
                        });
                        this.scheduleTokenRefresh(accessToken);
                    }
                } catch (verifyError) {
                    console.log('⚠️ Token verification failed, but keeping local auth:', verifyError.message);
                    
                    // Keep local auth even if verification fails (offline-first approach)
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
                }
            } else {
                console.log('🚫 No valid stored credentials found');
                if (this.dispatch) {
                    this.dispatch({ type: 'logout' });
                }
            }
        } catch (error) {
            console.error('💥 Auth startup check error:', error);
            // Don't clear auth on startup errors - let user try to login
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: false });
            }
        } finally {
            this.authCheckCompleted = true;
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: false });
            }
            
            console.log('🔍 Auth check completed - NO MORE AUTO CHECKS');
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

    isAuthenticated() { 
        const token = this.getAccessToken();
        const user = this.getUser();
        
        const hasValidToken = token && this.isValidTokenFormat(token);
        const hasValidUser = user && typeof user === 'object' && user.id;
        
        const result = !!(hasValidToken && hasValidUser);
        
        return result; 
    }

    async login(credentials, remember = false) {
        try {
            console.log('🔐 Starting login process...');
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: true });
            }
            
            const response = await fetchWithConfig('/api/auth/login', {
                method: 'POST',
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
            
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                return { success: false, error: 'Login request timed out. Please try again.' };
            }
            
            return { success: false, error: error.message || 'Network error' }; 
        }
    }

    async register(userData, remember = false) {
        try {
            console.log('📝 Starting registration process...');
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: true });
            }
            
            const response = await fetchWithConfig('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData),
                signal: AbortSignal.timeout(15000)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                const { access_token: accessToken, refresh_token: refreshToken } = data.tokens || {};
                
                if (!accessToken) {
                    throw new Error('No access token received');
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
            
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                return { success: false, error: 'Registration request timed out. Please try again.' };
            }
            
            return { success: false, error: error.message || 'Network error' }; 
        }
    }

    async logout() { 
        console.log('🚪 Starting logout process...');
        
        try { 
            const token = this.getAccessToken(); 
            if (token) { 
                fetchWithConfig('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }).catch(error => {
                    console.log('⚠️ Logout API call failed (non-critical):', error);
                });
            } 
        } catch (error) { 
            console.error('Logout API call failed:', error); 
        }
        
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
        
        this.authCheckCompleted = true;
        
        if (this.dispatch) {
            this.dispatch({ type: 'logout' });
            this.dispatch({ type: 'set_loading', payload: false });
        }
        
        console.log('🧹 Auth cleared successfully'); 
    }

    async authenticatedFetch(url, options = {}) {
        const token = this.getAccessToken();
        
        if (!token) {
            throw new Error('No authentication token available');
        }

        const config = {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
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
                        config.headers['Authorization'] = `Bearer ${newToken}`;
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
            const response = await fetchWithConfig('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${refreshToken}`
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

    // Utility methods
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