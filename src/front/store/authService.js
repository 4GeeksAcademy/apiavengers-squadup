// src/front/store/authService.js

class AuthService {
    constructor() {
        this.apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        this.tokenKey = 'squadup_access_token';
        this.refreshTokenKey = 'squadup_refresh_token';
        this.userKey = 'squadup_user';
        
        this.dispatch = () => console.warn('Dispatch function has not been set yet.');
        
        this.isRefreshing = false;
        this.failedQueue = [];
        this.refreshTimer = null;
        
        this.init();
    }

    setDispatch(dispatch) {
        console.log('✅ Dispatch function injected into AuthService.');
        this.dispatch = dispatch;
    }

    init() { this.checkAuthOnStartup(); this.setupAutoRefresh(); console.log('🔐 AuthService initialized'); }

    async checkAuthOnStartup() {
        const accessToken = this.getAccessToken();
        const refreshToken = this.getRefreshToken();
        const user = this.getUser();
        
        if (accessToken && user) {
            try {
                const isValid = await this.verifyToken();
                if (isValid) {
                    this.dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: accessToken, refreshToken } });
                    this.scheduleTokenRefresh(accessToken);
                } else { this.clearAuth(); }
            } catch (error) { console.error('Token verification failed on startup:', error); this.clearAuth(); }
        }
    }

    getAccessToken() { return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey); }
    getRefreshToken() { return localStorage.getItem(this.refreshTokenKey) || sessionStorage.getItem(this.refreshTokenKey); }
    getUser() { const userStr = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey); try { return userStr ? JSON.parse(userStr) : null; } catch (e) { return null; } }

    setTokens(accessToken, refreshToken, user, remember = false) { const storage = remember ? localStorage : sessionStorage; storage.setItem(this.tokenKey, accessToken); if (refreshToken) { storage.setItem(this.refreshTokenKey, refreshToken); } storage.setItem(this.userKey, JSON.stringify(user)); this.scheduleTokenRefresh(accessToken); }

    clearAuth() { [localStorage, sessionStorage].forEach(s => { s.removeItem(this.tokenKey); s.removeItem(this.refreshTokenKey); s.removeItem(this.userKey); }); if (this.refreshTimer) { clearTimeout(this.refreshTimer); } this.dispatch({ type: 'LOGOUT' }); console.log('🧹 Auth cleared'); }

    scheduleTokenRefresh(accessToken) { /* Your existing logic */ }
    async refreshTokenSilently() { /* Your existing logic */ }
    processQueue(error, token = null) { /* Your existing logic */ }
    setupAutoRefresh() { /* Your existing logic */ }
    isTokenExpiringSoon(token) { /* Your existing logic */ }

    async login(credentials, remember = false) {
        try {
            const response = await fetch(`${this.apiUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: credentials.email || credentials.login, password: credentials.password }) });
            const data = await response.json();
            if (response.ok && data.success) {
                const { access_token: accessToken, refresh_token: refreshToken } = data.tokens || {};
                if (!accessToken) throw new Error('No access token');
                this.setTokens(accessToken, refreshToken, data.user, remember);
                this.dispatch({ type: 'LOGIN_SUCCESS', payload: { user: data.user, token: accessToken, refreshToken: refreshToken } });
                return { success: true, user: data.user };
            } else { return { success: false, error: data.error || 'Login failed' }; }
        } catch (error) { return { success: false, error: error.message || 'Network error' }; }
    }

    async register(userData, remember = false) {
        try {
            const response = await fetch(`${this.apiUrl}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
            const data = await response.json();
            if (response.ok && data.success) {
                const { access_token: accessToken, refresh_token: refreshToken } = data.tokens || {};
                if (!accessToken) throw new Error('No access token');
                this.setTokens(accessToken, refreshToken, data.user, remember);
                this.dispatch({ type: 'LOGIN_SUCCESS', payload: { user: data.user, token: accessToken, refreshToken: refreshToken } });
                return { success: true, user: data.user };
            } else { return { success: false, error: data.error || 'Registration failed' }; }
        } catch (error) { return { success: false, error: error.message || 'Network error' }; }
    }

    async logout() { try { const token = this.getAccessToken(); if (token) { await fetch(`${this.apiUrl}/api/auth/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }); } } catch (error) { console.error('Logout failed:', error); } finally { this.clearAuth(); } }
    
    async verifyToken() { const token = this.getAccessToken(); if (!token) return false; try { const res = await fetch(`${this.apiUrl}/api/auth/verify`, { headers: { 'Authorization': `Bearer ${token}` } }); return res.ok; } catch { return false; } }
    
    isAuthenticated() { return !!(this.getAccessToken() && this.getUser()); }
    getCurrentUser() { return this.getUser(); }

    async authenticatedFetch(url, options = {}) { /* Your existing logic */ }
}

const authService = new AuthService();
export default authService;
export { AuthService };