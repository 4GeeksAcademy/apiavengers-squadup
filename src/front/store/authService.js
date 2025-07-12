/**
 * FIXED: Frontend AuthService with Defensive Response Handling
 * ============================================================
 * - Handles both old and new response formats
 * - Better error handling and logging
 * - Defensive token extraction
 */

class AuthService {
    constructor() {
        this.apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        this.tokenKey = 'squadup_access_token';
        this.refreshTokenKey = 'squadup_refresh_token';
        this.userKey = 'squadup_user';
        
        // Token refresh management
        this.isRefreshing = false;
        this.failedQueue = [];
        this.refreshTimer = null;
        
        // Initialize service
        this.init();
    }

    // ============================================================================
    // INITIALIZATION & SETUP
    // ============================================================================

    init() {
        // Check for existing authentication on startup
        this.checkAuthOnStartup();
        
        // Setup automatic token refresh
        this.setupAutoRefresh();
        
        console.log('🔐 AuthService initialized');
    }

    async checkAuthOnStartup() {
        const token = this.getAccessToken();
        const user = this.getUser();
        
        if (token && user) {
            // Verify token is still valid
            try {
                const isValid = await this.verifyToken();
                if (!isValid) {
                    this.clearAuth();
                }
            } catch (error) {
                console.warn('Token verification failed on startup:', error);
                this.clearAuth();
            }
        }
    }

    // ============================================================================
    // TOKEN MANAGEMENT
    // ============================================================================

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
            console.error('Failed to parse user data:', e);
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
        
        // Setup automatic refresh based on token expiration
        this.scheduleTokenRefresh(accessToken);
        
        console.log('✅ Tokens stored successfully');
    }

    clearAuth() {
        // Clear from both storage types
        [localStorage, sessionStorage].forEach(storage => {
            storage.removeItem(this.tokenKey);
            storage.removeItem(this.refreshTokenKey);
            storage.removeItem(this.userKey);
        });
        
        // Clear refresh timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        console.log('🧹 Authentication cleared');
    }

    // ============================================================================
    // AUTOMATIC TOKEN REFRESH
    // ============================================================================

    scheduleTokenRefresh(accessToken) {
        try {
            // Decode JWT payload to get expiration
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            const timeUntilRefresh = expirationTime - currentTime - (5 * 60 * 1000); // Refresh 5 minutes before expiry
            
            if (timeUntilRefresh > 0) {
                this.refreshTimer = setTimeout(() => {
                    this.refreshTokenSilently();
                }, timeUntilRefresh);
                
                console.log(`🔄 Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
            } else {
                // Token expires soon, refresh immediately
                this.refreshTokenSilently();
            }
        } catch (error) {
            console.error('Failed to schedule token refresh:', error);
        }
    }

    async refreshTokenSilently() {
        if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject });
            });
        }

        this.isRefreshing = true;

        try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch(`${this.apiUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                // FIXED: Defensive token extraction
                let newAccessToken;
                if (data.tokens && data.tokens.access_token) {
                    newAccessToken = data.tokens.access_token;
                } else if (data.access_token) {
                    newAccessToken = data.access_token;
                } else {
                    throw new Error('No access token in refresh response');
                }
                
                // Update access token
                const storage = localStorage.getItem(this.tokenKey) ? localStorage : sessionStorage;
                storage.setItem(this.tokenKey, newAccessToken);
                
                // Schedule next refresh
                this.scheduleTokenRefresh(newAccessToken);
                
                // Process any queued requests
                this.processQueue(null, newAccessToken);
                
                console.log('🔄 Token refreshed silently');
                return newAccessToken;
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Silent token refresh failed:', error);
            this.processQueue(error, null);
            this.clearAuth();
            
            // Redirect to login if not already there
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            
            throw error;
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

    setupAutoRefresh() {
        // Check token validity every 30 seconds
        setInterval(() => {
            const token = this.getAccessToken();
            if (token && this.isTokenExpiringSoon(token)) {
                this.refreshTokenSilently();
            }
        }, 30000);
    }

    isTokenExpiringSoon(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.exp * 1000;
            const currentTime = Date.now();
            const timeUntilExpiry = expirationTime - currentTime;
            
            // Consider token expiring soon if less than 10 minutes left
            return timeUntilExpiry < (10 * 60 * 1000);
        } catch (error) {
            return true; // If we can't parse the token, consider it expiring
        }
    }

    // ============================================================================
    // AUTHENTICATION METHODS
    // ============================================================================

    async login(credentials, remember = false) {
        try {
            console.log('🔐 Attempting login with:', { login: credentials.email || credentials.login });
            
            const response = await fetch(`${this.apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    login: credentials.email || credentials.login,
                    password: credentials.password
                })
            });

            const data = await response.json();
            
            console.log('📥 Login response:', { 
                status: response.status, 
                success: data.success,
                hasTokens: !!(data.tokens || data.access_token),
                user: data.user?.username
            });

            if (response.ok && data.success) {
                // FIXED: Defensive token extraction - handle both formats
                let accessToken, refreshToken;
                
                if (data.tokens) {
                    // New format: tokens in 'tokens' object
                    accessToken = data.tokens.access_token;
                    refreshToken = data.tokens.refresh_token;
                } else {
                    // Old format: tokens directly in response
                    accessToken = data.access_token;
                    refreshToken = data.refresh_token;
                }
                
                if (!accessToken) {
                    throw new Error('No access token received from server');
                }

                this.setTokens(accessToken, refreshToken, data.user, remember);

                console.log('✅ Login successful');
                return { success: true, user: data.user };
            } else {
                console.error('❌ Login failed:', data.error);
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            return { success: false, error: error.message || 'Network error occurred' };
        }
    }

    async register(userData, remember = false) {
        try {
            console.log('🚀 Attempting registration for:', userData.username);
            
            const response = await fetch(`${this.apiUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            
            console.log('📥 Registration response:', { 
                status: response.status, 
                success: data.success,
                hasTokens: !!(data.tokens || data.access_token),
                user: data.user?.username
            });

            if (response.ok && data.success) {
                // FIXED: Defensive token extraction - handle both formats
                let accessToken, refreshToken;
                
                if (data.tokens) {
                    // New format: tokens in 'tokens' object
                    accessToken = data.tokens.access_token;
                    refreshToken = data.tokens.refresh_token;
                } else {
                    // Old format: tokens directly in response
                    accessToken = data.access_token;
                    refreshToken = data.refresh_token;
                }
                
                if (!accessToken) {
                    throw new Error('No access token received from server');
                }

                this.setTokens(accessToken, refreshToken, data.user, remember);

                console.log('✅ Registration successful');
                return { success: true, user: data.user };
            } else {
                console.error('❌ Registration failed:', data.error);
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            return { success: false, error: error.message || 'Network error occurred' };
        }
    }

    async logout() {
        try {
            const token = this.getAccessToken();
            if (token) {
                await fetch(`${this.apiUrl}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout request failed:', error);
        } finally {
            this.clearAuth();
            console.log('✅ Logged out successfully');
        }
    }

    async verifyToken() {
        try {
            const token = this.getAccessToken();
            if (!token) return false;

            const response = await fetch(`${this.apiUrl}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    isAuthenticated() {
        const token = this.getAccessToken();
        const user = this.getUser();
        return !!(token && user);
    }

    getCurrentUser() {
        return this.getUser();
    }

    // Make authenticated requests
    async authenticatedFetch(url, options = {}) {
        const token = this.getAccessToken();
        
        if (!token) {
            throw new Error('No authentication token available');
        }

        const authOptions = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, authOptions);
            
            if (response.status === 401) {
                // Try to refresh token and retry
                await this.refreshTokenSilently();
                const newToken = this.getAccessToken();
                
                authOptions.headers.Authorization = `Bearer ${newToken}`;
                return fetch(url, authOptions);
            }
            
            return response;
        } catch (error) {
            console.error('Authenticated fetch failed:', error);
            throw error;
        }
    }
}

// Create and export singleton instance
const authService = new AuthService();
export default authService;

// Also export class for testing
export { AuthService };