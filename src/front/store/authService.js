// src/front/services/authService.js
// Complete Frontend Authentication Service

// ✅ CORRECT: Use import.meta.env for Vite (not process.env)
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://bookish-funicular-9754qgjjg9743pqr7-3001.app.github.dev';

class AuthService {
    constructor() {
        this.isRefreshing = false;
        this.failedQueue = [];
        
        console.log('🔧 AuthService initialized with API URL:', API_BASE_URL);
        
        // Setup automatic token refresh
        this.setupTokenRefresh();
    }

    // ============================================================================
    // TOKEN MANAGEMENT
    // ============================================================================

    setTokens(accessToken, refreshToken) {
        if (!accessToken || !refreshToken) {
            console.error('❌ Invalid tokens provided');
            return false;
        }

        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        
        // Set expiration time (1 hour from now)
        const expirationTime = Date.now() + (60 * 60 * 1000);
        localStorage.setItem('token_expiration', expirationTime.toString());
        
        console.log('✅ Tokens stored successfully');
        return true;
    }

    getAccessToken() {
        return localStorage.getItem('access_token');
    }

    getRefreshToken() {
        return localStorage.getItem('refresh_token');
    }

    getTokenExpiration() {
        const expiration = localStorage.getItem('token_expiration');
        return expiration ? parseInt(expiration) : null;
    }

    isTokenExpired() {
        const expiration = this.getTokenExpiration();
        if (!expiration) return true;
        
        // Consider token expired 5 minutes before actual expiration
        return Date.now() > (expiration - 5 * 60 * 1000);
    }

    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expiration');
        localStorage.removeItem('user');
        console.log('🧹 Tokens cleared');
    }

    // ============================================================================
    // AUTOMATIC TOKEN REFRESH
    // ============================================================================

    setupTokenRefresh() {
        // Check token every 10 minutes
        setInterval(() => {
            this.checkAndRefreshToken();
        }, 10 * 60 * 1000);

        // Check immediately when service is created
        setTimeout(() => {
            this.checkAndRefreshToken();
        }, 1000);
    }

    async checkAndRefreshToken() {
        const accessToken = this.getAccessToken();
        const refreshToken = this.getRefreshToken();

        if (!accessToken || !refreshToken) {
            return false;
        }

        if (this.isTokenExpired()) {
            console.log('🔄 Token expired, attempting refresh...');
            return await this.refreshAccessToken();
        }

        return true;
    }

    async refreshAccessToken() {
        const refreshToken = this.getRefreshToken();
        
        if (!refreshToken || this.isRefreshing) {
            return false;
        }

        this.isRefreshing = true;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update tokens (keep the same refresh token)
                this.setTokens(data.access_token, refreshToken);
                
                console.log('✅ Token refreshed successfully');
                
                // Process any queued requests
                this.processQueue(null, data.access_token);
                
                return true;
            } else {
                console.log('❌ Token refresh failed');
                this.handleRefreshFailure();
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.handleRefreshFailure();
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    handleRefreshFailure() {
        this.clearTokens();
        this.processQueue(new Error('Token refresh failed'), null);
        
        // Redirect to login if on a protected page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
            console.log('🔄 Redirecting to login due to auth failure');
            window.location.href = '/login';
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
    // API REQUEST HELPER WITH AUTO-REFRESH
    // ============================================================================

    async makeAuthenticatedRequest(url, options = {}) {
        const accessToken = this.getAccessToken();
        
        if (!accessToken) {
            throw new Error('No access token available');
        }

        // Check if token needs refresh
        if (this.isTokenExpired()) {
            if (this.isRefreshing) {
                // Wait for refresh to complete
                return new Promise((resolve, reject) => {
                    this.failedQueue.push({ resolve, reject });
                }).then(token => {
                    return this.makeRequest(url, { ...options, token });
                });
            } else {
                const refreshed = await this.refreshAccessToken();
                if (!refreshed) {
                    throw new Error('Unable to refresh token');
                }
            }
        }

        return this.makeRequest(url, { ...options, token: this.getAccessToken() });
    }

    async makeRequest(url, { token, ...options }) {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        if (response.status === 401) {
            // Token is invalid, try refresh
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                // Retry the request with new token
                return fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAccessToken()}`,
                        ...options.headers
                    }
                });
            } else {
                throw new Error('Authentication failed');
            }
        }

        return response;
    }

    // ============================================================================
    // AUTHENTICATION METHODS
    // ============================================================================

    async register(userData) {
        try {
            console.log('📝 Attempting registration...');
            
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                const tokensSet = this.setTokens(data.access_token, data.refresh_token);
                if (tokensSet) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    console.log('✅ Registration successful');
                    return { success: true, user: data.user };
                } else {
                    return { success: false, error: 'Failed to store authentication tokens' };
                }
            } else {
                console.log('❌ Registration failed:', data.error);
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            return { success: false, error: 'Network error occurred' };
        }
    }

    async login(credentials) {
        try {
            console.log('🔐 Attempting login...');
            
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

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
            console.log('👋 Logging out...');
            const accessToken = this.getAccessToken();
            
            if (accessToken) {
                // Tell backend to blacklist the token
                await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
        } finally {
            // Always clear local tokens
            this.clearTokens();
            console.log('✅ Logged out successfully');
            return { success: true };
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

    // ============================================================================
    // USER STATE MANAGEMENT
    // ============================================================================

    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    isAuthenticated() {
        const accessToken = this.getAccessToken();
        const user = this.getCurrentUser();
        return !!(accessToken && user);
    }

    // ============================================================================
    // PROTECTED ROUTE HELPER
    // ============================================================================

    async checkAuthStatus() {
        if (!this.isAuthenticated()) {
            return false;
        }

        // Verify token is still valid
        const verification = await this.verifyToken();
        return verification.valid;
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    getApiUrl() {
        return API_BASE_URL;
    }

    // Get user info without API call
    getUserInfo() {
        return this.getCurrentUser();
    }

    // Check if user has specific role (for future use)
    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.roles && user.roles.includes(role);
    }
}

// Create singleton instance
const authService = new AuthService();

// Export as default
export default authService;