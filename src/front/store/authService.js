// src/front/store/authService.js - FIXED VERSION with correct action types

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
        
        console.log('🔐 AuthService initialized');
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
        
        const accessToken = this.getAccessToken();
        const refreshToken = this.getRefreshToken();
        const user = this.getUser();
        
        console.log('🔍 Auth check data:', { 
            hasToken: !!accessToken, 
            hasUser: !!user,
            hasRefresh: !!refreshToken,
            hasDispatch: !!this.dispatch,
            user: user
        });
        
        if (accessToken && user) {
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
        
        // CRITICAL FIX: Always clear loading state
        if (this.dispatch) {
            this.dispatch({ type: 'set_loading', payload: false }); // FIXED: lowercase
        }
        
        this.authCheckCompleted = true;
        console.log('✅ Auth check completed, authCheckCompleted =', this.authCheckCompleted);
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
            return null; 
        } 
    }

    setTokens(accessToken, refreshToken, user, remember = false) { 
        const storage = remember ? localStorage : sessionStorage; 
        storage.setItem(this.tokenKey, accessToken); 
        if (refreshToken) { 
            storage.setItem(this.refreshTokenKey, refreshToken); 
        } 
        storage.setItem(this.userKey, JSON.stringify(user)); 
        this.scheduleTokenRefresh(accessToken); 
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

    async login(credentials, remember = false) {
        try {
            console.log('🔐 Starting login process...');
            
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: true }); // FIXED: lowercase
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
                
                if (this.dispatch) {
                    this.dispatch({ 
                        type: 'login_success', // FIXED: lowercase
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
                    this.dispatch({ type: 'set_loading', payload: false }); // FIXED: lowercase
                }
                return { success: false, error: data.error || 'Login failed' }; 
            }
        } catch (error) { 
            console.error('Login error:', error);
            if (this.dispatch) {
                this.dispatch({ type: 'set_loading', payload: false }); // FIXED: lowercase
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
                    this.dispatch({ type: 'set_user', payload: data.user }); // FIXED: lowercase
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

// Added method for Steam integration
    async connectSteam(steamId) {
        if (!steamId) {
            throw new Error('Steam ID is required');
        }

        try {
            const response = await this.authenticatedFetch(`${this.apiUrl}/api/auth/steam/connect`, {  // FIXED: Added /auth/
                method: 'POST',
                body: JSON.stringify({ steam_id: steamId })
            });

            if (!response.ok) {
                throw new Error('Failed to connect Steam account');
            }

            const data = await response.json();
            
            // Update user in store if backend returns updated user
            if (data.user && this.dispatch) {
                this.dispatch({ 
                    type: 'set_user',  // Assuming your store has this action
                    payload: data.user 
                });
            }

            return data;
        } catch (error) {
            console.error('Steam connection failed:', error);
            throw error;
        }
    }
}

const authService = new AuthService();
export default authService;
export { AuthService };