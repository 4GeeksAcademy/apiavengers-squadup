// src/front/hooks/useAuth.js - ENHANCED VERSION with complete JWT integration

import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGlobalReducer from './useGlobalReducer';
import authService from '../store/authService';

/**
 * Enhanced authentication hook with comprehensive JWT handling
 * Features:
 * - Complete JWT token management
 * - Automatic token refresh
 * - Real-time auth state synchronization
 * - Enhanced error handling
 * - Connection status monitoring
 * - Remember me functionality
 */
export const useAuth = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();
    const location = useLocation();
    const initializationRef = useRef(false);
    const [connectionStatus, setConnectionStatus] = useState({
        isOnline: navigator.onLine,
        lastCheck: Date.now(),
        apiReachable: true
    });

    // Extract auth state with proper defaults
    const {
        isAuthenticated = false,
        user = null,
        authLoading = false,
        authError = null,
        token = null
    } = store || {};

    // ============================================================================
    // INITIALIZATION AND CONNECTION MONITORING
    // ============================================================================

    // Initialize auth service with dispatch on first render
    useEffect(() => {
        if (!initializationRef.current && dispatch) {
            console.log('🔗 Initializing enhanced auth service with dispatch...');
            initializationRef.current = true;
            
            authService.setDispatch(dispatch);
        }
    }, [dispatch]);

    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => {
            console.log('🌐 Connection restored');
            setConnectionStatus(prev => ({ ...prev, isOnline: true, lastCheck: Date.now() }));
            
            // Re-verify authentication when coming back online
            if (isAuthenticated) {
                verifyAuthenticationStatus();
            }
        };

        const handleOffline = () => {
            console.log('📴 Connection lost');
            setConnectionStatus(prev => ({ ...prev, isOnline: false, lastCheck: Date.now() }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [isAuthenticated]);

    // Periodic API reachability check
    useEffect(() => {
        if (!connectionStatus.isOnline) return;

        const checkApiReachability = async () => {
            try {
                const response = await fetch('/api/health', { 
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });
                
                const isReachable = response.ok;
                setConnectionStatus(prev => ({ 
                    ...prev, 
                    apiReachable: isReachable,
                    lastCheck: Date.now()
                }));
                
                if (!isReachable) {
                    console.warn('⚠️ API not reachable');
                }
            } catch (error) {
                console.warn('⚠️ API reachability check failed:', error);
                setConnectionStatus(prev => ({ 
                    ...prev, 
                    apiReachable: false,
                    lastCheck: Date.now()
                }));
            }
        };

        // Check immediately and then every 30 seconds
        checkApiReachability();
        const interval = setInterval(checkApiReachability, 30000);

        return () => clearInterval(interval);
    }, [connectionStatus.isOnline]);

    // ============================================================================
    // AUTHENTICATION FUNCTIONS
    // ============================================================================

    const login = useCallback(async (credentials, remember = false) => {
        console.log('🔐 useAuth.login called');
        
        try {
            dispatch({ type: 'set_loading', payload: true });
            dispatch({ type: 'clear_error' });
            
            const result = await authService.login(credentials, remember);
            
            if (result.success) {
                console.log('✅ Login successful in useAuth hook');
                
                // Update connection status on successful login
                setConnectionStatus(prev => ({ 
                    ...prev, 
                    apiReachable: true,
                    lastCheck: Date.now()
                }));
                
                // Navigate after state is properly updated
                setTimeout(() => {
                    const intendedPath = location.state?.from?.pathname || '/dashboard';
                    navigate(intendedPath, { replace: true });
                }, 100);
                
                return { success: true, user: result.user };
            } else {
                console.log('❌ Login failed in useAuth hook:', result.error);
                dispatch({ 
                    type: 'set_error', 
                    payload: result.error 
                });
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('💥 Login error in useAuth hook:', error);
            const errorMessage = getErrorMessage(error);
            dispatch({ 
                type: 'set_error', 
                payload: errorMessage 
            });
            return { success: false, error: errorMessage };
        } finally {
            dispatch({ type: 'set_loading', payload: false });
        }
    }, [dispatch, navigate, location.state]);

    const register = useCallback(async (userData, remember = false) => {
        console.log('📝 useAuth.register called');
        
        try {
            dispatch({ type: 'set_loading', payload: true });
            dispatch({ type: 'clear_error' });
            
            const result = await authService.register(userData, remember);
            
            if (result.success) {
                console.log('✅ Registration successful in useAuth hook');
                
                // Update connection status on successful registration
                setConnectionStatus(prev => ({ 
                    ...prev, 
                    apiReachable: true,
                    lastCheck: Date.now()
                }));
                
                // Navigate after state update
                setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                }, 100);
                
                return { success: true, user: result.user };
            } else {
                console.log('❌ Registration failed in useAuth hook:', result.error);
                dispatch({ 
                    type: 'set_error', 
                    payload: result.error 
                });
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('💥 Registration error in useAuth hook:', error);
            const errorMessage = getErrorMessage(error);
            dispatch({ 
                type: 'set_error', 
                payload: errorMessage 
            });
            return { success: false, error: errorMessage };
        } finally {
            dispatch({ type: 'set_loading', payload: false });
        }
    }, [dispatch, navigate]);

    const logout = useCallback(async () => {
        console.log('🚪 useAuth.logout called');
        
        try {
            await authService.logout();
            
            // Clear any errors and navigate to home
            dispatch({ type: 'clear_error' });
            navigate('/', { replace: true });
            
            return { success: true };
        } catch (error) {
            console.error('💥 Logout error in useAuth hook:', error);
            // Even if logout fails, clear local state
            dispatch({ type: 'logout' });
            navigate('/', { replace: true });
            return { success: false, error: error.message };
        }
    }, [dispatch, navigate]);

    // ============================================================================
    // TOKEN MANAGEMENT
    // ============================================================================

    const refreshToken = useCallback(async () => {
        try {
            await authService.refreshTokenSilently();
            return { success: true };
        } catch (error) {
            console.error('Token refresh failed:', error);
            return { success: false, error: error.message };
        }
    }, []);

    const verifyToken = useCallback(async () => {
        try {
            const token = authService.getAccessToken();
            if (!token) {
                return { valid: false, error: 'No token available' };
            }

            const response = await authService.authenticatedFetch('/api/auth/verify');
            
            if (response.ok) {
                const data = await response.json();
                return { valid: data.valid, user: data.user };
            } else {
                throw new Error('Token verification failed');
            }
        } catch (error) {
            console.error('Token verification error:', error);
            return { valid: false, error: error.message };
        }
    }, []);

    const getTokenInfo = useCallback(() => {
        const token = authService.getAccessToken();
        if (!token) return null;

        const parsed = authService.parseJWT(token);
        if (!parsed) return null;

        const expiry = new Date(parsed.payload.exp * 1000);
        const issuedAt = new Date(parsed.payload.iat * 1000);
        const timeUntilExpiry = expiry.getTime() - Date.now();

        return {
            header: parsed.header,
            payload: {
                ...parsed.payload,
                // Don't expose sensitive data
                sub: parsed.payload.sub,
                username: parsed.payload.username,
                email: parsed.payload.email,
                steam_connected: parsed.payload.steam_connected
            },
            expiry,
            issuedAt,
            timeUntilExpiry,
            isExpired: timeUntilExpiry <= 0,
            needsRefresh: authService.needsRefresh(token)
        };
    }, []);

    // ============================================================================
    // USER MANAGEMENT
    // ============================================================================

    const updateUser = useCallback((updatedUser) => {
        console.log('👤 Updating user in useAuth hook:', updatedUser);
        dispatch({
            type: 'set_user',
            payload: updatedUser
        });
    }, [dispatch]);

    const refreshUserProfile = useCallback(async () => {
        try {
            const response = await authService.authenticatedFetch('/api/auth/profile');
            
            if (response.ok) {
                const data = await response.json();
                updateUser(data.user);
                return { success: true, user: data.user };
            } else {
                throw new Error('Failed to refresh user profile');
            }
        } catch (error) {
            console.error('Error refreshing user profile:', error);
            return { success: false, error: error.message };
        }
    }, [updateUser]);

    // ============================================================================
    // STATUS AND VALIDATION
    // ============================================================================

    const verifyAuthenticationStatus = useCallback(async () => {
        try {
            const tokenInfo = getTokenInfo();
            if (!tokenInfo || tokenInfo.isExpired) {
                console.log('🔍 Token is expired or invalid');
                authService.clearAuth();
                return { authenticated: false, reason: 'token_expired' };
            }

            if (tokenInfo.needsRefresh) {
                console.log('🔄 Token needs refresh');
                try {
                    await authService.refreshTokenSilently();
                } catch (refreshError) {
                    console.error('🔄 Token refresh failed:', refreshError);
                    authService.clearAuth();
                    return { authenticated: false, reason: 'refresh_failed' };
                }
            }

            // Verify with server if online
            if (connectionStatus.isOnline && connectionStatus.apiReachable) {
                const verification = await verifyToken();
                if (!verification.valid) {
                    console.log('🔍 Server token verification failed');
                    authService.clearAuth();
                    return { authenticated: false, reason: 'server_rejected' };
                }
            }

            return { authenticated: true, user: user };
        } catch (error) {
            console.error('🔍 Auth verification error:', error);
            return { authenticated: false, reason: 'verification_error', error: error.message };
        }
    }, [getTokenInfo, user, connectionStatus, verifyToken]);

    const clearError = useCallback(() => {
        dispatch({ type: 'clear_error' });
    }, [dispatch]);

    const hasPermission = useCallback((permission) => {
        if (!user) return false;
        
        switch (permission) {
            case 'admin':
                return user.role === 'admin';
            case 'steam_connected':
                return user.steam_connected || user.is_steam_connected;
            case 'verified':
                return user.email_verified || user.is_verified;
            case 'active':
                return user.is_active;
            default:
                return false;
        }
    }, [user]);

    const getAuthStatus = useCallback(() => {
        const tokenInfo = getTokenInfo();
        
        return {
            isAuthenticated,
            isLoading: authLoading,
            hasError: !!authError,
            error: authError,
            user,
            token: !!authService.getAccessToken(),
            tokenInfo,
            connectionStatus,
            steamConnected: user?.steam_connected || user?.is_steam_connected || false,
            canRefreshToken: !!authService.getRefreshToken(),
            authService: {
                hasValidToken: tokenInfo && !tokenInfo.isExpired,
                needsRefresh: tokenInfo && tokenInfo.needsRefresh,
                timeUntilExpiry: tokenInfo ? tokenInfo.timeUntilExpiry : null
            }
        };
    }, [isAuthenticated, authLoading, authError, user, connectionStatus, getTokenInfo]);

    const waitForAuth = useCallback(async () => {
        if (authService.authCheckCompleted) {
            return getAuthStatus();
        }
        
        await authService.waitForInitialization();
        return getAuthStatus();
    }, [getAuthStatus]);

    // ============================================================================
    // ERROR HANDLING
    // ============================================================================

    const getErrorMessage = (error) => {
        if (!error) return 'An unknown error occurred';
        
        const message = error.message || error.toString() || '';
        
        // Connection-related errors
        if (!connectionStatus.isOnline) {
            return 'You are offline. Please check your internet connection.';
        }
        
        if (!connectionStatus.apiReachable) {
            return 'Unable to reach the server. Please try again later.';
        }
        
        // Authentication-specific errors
        if (message.includes('Invalid credentials')) {
            return 'Invalid email/username or password. Please check your credentials and try again.';
        }
        
        if (message.includes('rate_limit') || message.includes('too many')) {
            return 'Too many login attempts. Please wait a few minutes before trying again.';
        }
        
        if (message.includes('Account is deactivated')) {
            return 'Your account has been deactivated. Please contact support for assistance.';
        }
        
        if (message.includes('email already exists')) {
            return 'An account with this email already exists. Try logging in instead.';
        }
        
        if (message.includes('username already taken')) {
            return 'This username is already taken. Please choose a different one.';
        }
        
        if (message.includes('timeout') || message.includes('AbortError')) {
            return 'Request timed out. Please check your connection and try again.';
        }
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }
        
        return message || 'An unexpected error occurred. Please try again.';
    };

    // ============================================================================
    // ADMIN AND DEBUGGING FUNCTIONS
    // ============================================================================

    const getDebugInfo = useCallback(() => {
        if (process.env.NODE_ENV !== 'development') return null;
        
        const tokenInfo = getTokenInfo();
        
        return {
            // Auth state
            isAuthenticated,
            authLoading,
            authError,
            user: user ? { id: user.id, username: user.username, email: user.email } : null,
            
            // Token info
            hasAccessToken: !!authService.getAccessToken(),
            hasRefreshToken: !!authService.getRefreshToken(),
            tokenInfo: tokenInfo ? {
                isExpired: tokenInfo.isExpired,
                needsRefresh: tokenInfo.needsRefresh,
                timeUntilExpiry: tokenInfo.timeUntilExpiry,
                expiryDate: tokenInfo.expiry.toISOString()
            } : null,
            
            // Service state
            authServiceState: {
                authCheckCompleted: authService.authCheckCompleted,
                isRefreshing: authService.isRefreshing,
                hasDispatch: !!authService.dispatch
            },
            
            // Connection state
            connectionStatus,
            
            // Store state
            storeState: {
                hasStore: !!store,
                storeKeys: store ? Object.keys(store) : []
            }
        };
    }, [isAuthenticated, authLoading, authError, user, connectionStatus, store, getTokenInfo]);

    const forceTokenRefresh = useCallback(async () => {
        if (process.env.NODE_ENV !== 'development') {
            console.warn('forceTokenRefresh is only available in development mode');
            return { success: false, error: 'Not available in production' };
        }
        
        try {
            await authService.refreshTokenSilently();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }, []);

    const resetAuth = useCallback(() => {
        if (process.env.NODE_ENV !== 'development') {
            console.warn('resetAuth is only available in development mode');
            return;
        }
        
        authService.clearAuth();
        setConnectionStatus({
            isOnline: navigator.onLine,
            lastCheck: Date.now(),
            apiReachable: true
        });
    }, []);

    // ============================================================================
    // RETURN OBJECT
    // ============================================================================

    return {
        // Core authentication state
        isAuthenticated,
        user,
        authLoading,
        authError,
        token: !!authService.getAccessToken(),
        
        // Authentication actions
        login,
        register,
        logout,
        refreshToken,
        verifyToken,
        
        // User management
        updateUser,
        refreshUserProfile,
        
        // Status and validation
        verifyAuthenticationStatus,
        clearError,
        hasPermission,
        getAuthStatus,
        waitForAuth,
        
        // Token management
        getTokenInfo,
        
        // Connection monitoring
        connectionStatus,
        
        // Utility functions
        getErrorMessage,
        
        // Development/debugging (only in dev mode)
        ...(process.env.NODE_ENV === 'development' && {
            debugInfo: getDebugInfo(),
            forceTokenRefresh,
            resetAuth,
            authService // Direct access for debugging
        })
    };
};

// ============================================================================
// ADDITIONAL HOOKS FOR SPECIFIC USE CASES
// ============================================================================

/**
 * Hook specifically for token management
 */
export const useToken = () => {
    const { getTokenInfo, refreshToken, verifyToken } = useAuth();
    
    return {
        getTokenInfo,
        refreshToken,
        verifyToken,
        isValid: () => {
            const info = getTokenInfo();
            return info && !info.isExpired;
        },
        needsRefresh: () => {
            const info = getTokenInfo();
            return info && info.needsRefresh;
        }
    };
};

/**
 * Hook for permission checking
 */
export const usePermissions = () => {
    const { user, hasPermission } = useAuth();
    
    const can = useCallback((permission) => hasPermission(permission), [hasPermission]);
    const cannot = useCallback((permission) => !hasPermission(permission), [hasPermission]);
    
    const isRole = useCallback((role) => user?.role === role, [user]);
    const isOwner = useCallback((resource) => {
        if (!user || !resource) return false;
        return resource.creator_id === user.id || 
               resource.owner_id === user.id || 
               resource.user_id === user.id;
    }, [user]);
    
    return {
        user,
        can,
        cannot,
        isRole,
        isOwner,
        hasPermission
    };
};

/**
 * Hook for connection monitoring
 */
export const useConnectionStatus = () => {
    const { connectionStatus } = useAuth();
    
    return {
        ...connectionStatus,
        isConnected: connectionStatus.isOnline && connectionStatus.apiReachable,
        isOffline: !connectionStatus.isOnline,
        isServerUnreachable: connectionStatus.isOnline && !connectionStatus.apiReachable
    };
};

export default useAuth;