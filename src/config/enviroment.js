// src/services/authService.js
import { fetchWithConfig, getApiEndpoint, testConnectivity } from '../config/environment.js';

class AuthService {
  constructor() {
    this.token = null;
    this.user = null;
    this.isInitialized = false;
    
    // Test connectivity on initialization
    this.testConnection();
  }

  async testConnection() {
    console.log('🔧 AuthService: Testing API connection...');
    const result = await testConnectivity();
    if (result.success) {
      console.log('✅ AuthService: API connection successful');
    } else {
      console.error('❌ AuthService: API connection failed:', result.error);
    }
  }

  async login(email, password) {
    console.log('🔐 Starting login process...');
    
    try {
      const response = await fetchWithConfig('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      console.log('📡 Login response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Login failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Login successful:', data);

      if (data.access_token) {
        this.token = data.access_token;
        this.user = data.user;
        
        // Store in localStorage
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        console.log('💾 Token and user stored in localStorage');
        
        return { success: true, user: this.user, token: this.token };
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async register(userData) {
    console.log('📝 Starting registration process...');
    
    try {
      const response = await fetchWithConfig('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      console.log('📡 Registration response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Registration failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Registration successful:', data);

      if (data.access_token) {
        this.token = data.access_token;
        this.user = data.user;
        
        // Store in localStorage
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        return { success: true, user: this.user, token: this.token };
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  async logout() {
    console.log('👋 Starting logout process...');
    
    try {
      // Call logout endpoint if we have a token
      if (this.token) {
        await fetchWithConfig('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Logout endpoint call failed:', error);
      // Continue with local cleanup even if server call fails
    }

    // Clear local state
    this.token = null;
    this.user = null;
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    console.log('✅ Logout completed');
    return { success: true };
  }

  async refreshToken() {
    console.log('🔄 Attempting to refresh token...');
    
    try {
      const response = await fetchWithConfig('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      if (data.access_token) {
        this.token = data.access_token;
        localStorage.setItem('token', this.token);
        console.log('✅ Token refreshed successfully');
        return { success: true, token: this.token };
      } else {
        throw new Error('No new token received');
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      // Clear invalid token
      this.logout();
      return { success: false, error: error.message };
    }
  }

  async validateToken(token = null) {
    const tokenToValidate = token || this.token;
    
    if (!tokenToValidate) {
      console.log('🔍 No token to validate');
      return { valid: false, error: 'No token provided' };
    }

    try {
      const response = await fetchWithConfig('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`
        }
      });

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      const userData = await response.json();
      console.log('✅ Token validated successfully');
      
      // Update user data
      this.user = userData;
      localStorage.setItem('user', JSON.stringify(userData));
      
      return { valid: true, user: userData };
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      return { valid: false, error: error.message };
    }
  }

  async initializeAuth() {
    console.log('🏗️ Initializing authentication...');
    
    try {
      // Get stored token and user
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        this.token = storedToken;
        try {
          this.user = JSON.parse(storedUser);
        } catch (e) {
          console.warn('⚠️ Failed to parse stored user data');
          this.user = null;
        }
        
        console.log('📦 Found stored auth data, validating...');
        
        // Validate the stored token
        const validation = await this.validateToken(storedToken);
        
        if (validation.valid) {
          console.log('✅ Stored token is valid');
          this.isInitialized = true;
          return { success: true, user: this.user };
        } else {
          console.log('❌ Stored token is invalid, clearing...');
          this.logout();
        }
      } else {
        console.log('📭 No stored auth data found');
      }
      
      this.isInitialized = true;
      return { success: false, error: 'No valid authentication found' };
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
      this.isInitialized = true;
      return { success: false, error: error.message };
    }
  }

  isAuthenticated() {
    const hasToken = !!this.token;
    const hasUser = !!this.user;
    const result = hasToken && hasUser;
    
    console.log('🔍 AuthService.isAuthenticated():', {
      hasToken,
      hasValidToken: hasToken ? 'needs validation' : null,
      hasUser,
      hasValidUser: hasUser ? 'assumed valid' : null,
      authCheckCompleted: this.isInitialized,
      result
    });
    
    return result;
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  // Helper method to make authenticated requests
  async authenticatedFetch(url, options = {}) {
    if (!this.token) {
      throw new Error('No authentication token available');
    }

    return fetchWithConfig(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      }
    });
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;