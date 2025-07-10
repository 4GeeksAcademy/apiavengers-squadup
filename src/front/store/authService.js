// src/front/services/authService.js
// Complete Frontend Authentication Service - Optimized for 429 Prevention

// ✅ CORRECT: Use import.meta.env for Vite (not process.env)
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

class AuthService {
    constructor() {
        this.isRefreshing = false;
        this.failedQueue = [];
        
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
        const refreshToken = this.getRefreshToken();

        if (!accessToken || !refreshToken) {
            return false;
        }

        // Only refresh if token is actually expired or about to expire
        if (this.isTokenExpired(10)) { // 10 minute buffer
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

// Create singleton instance
const authService = new AuthService();

// Export as default
export default authService;