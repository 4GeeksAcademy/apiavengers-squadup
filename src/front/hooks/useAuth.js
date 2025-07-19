// src/front/hooks/useAuth.js - FIXED VERSION with proper compatibility

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGlobalReducer from './useGlobalReducer';
import authService from '../store/authService';
import { testConnectivity } from '../config/environment';

/**
 * Enhanced authentication hook with proper state management
 * and full compatibility with global store
 */
export const useAuth = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();
    const location = useLocation();
    const initializationRef = useRef(false);
    const connectivityTestedRef = useRef(false);

    // Extract auth state with proper defaults
    const {
        isAuthenticated = false,
        user = null,
        authLoading = false,
        authError = null,
        token = null
    } = store || {};

    // CRITICAL: Initialize auth service with dispatch on first render
    useEffect(() => {
        if (!initializationRef.current && dispatch) {
            console.log('🔗 Initializing auth service with dispatch...');
            initializationRef.current = true;
            
            // Set dispatch and let authService handle the auth check
            authService.setDispatch(dispatch);
        }
    }, [dispatch]);

    // Test connectivity on mount for GitHub Codespaces
    useEffect(() => {
        if (!connectivityTestedRef.current) {
            connectivityTestedRef.current = true;
            
            const testConnection = async () => {
                try {
                    const result = await testConnectivity();
                    if (!result.success) {
                        console.warn('⚠️ Backend connectivity issue:', result.error);
                        dispatch({
                            type: 'set_error',
                            payload: `Connection issue: ${result.error}`
                        });
                    } else {
                        console.log('✅ Backend connectivity confirmed');
                    }
                } catch (error) {
                    console.error('❌ Connectivity test failed:', error);
                }
            };

            // Test connectivity after a brief delay
            setTimeout(testConnection, 1000);
        }
    }, [dispatch]);

    // Enhanced login function with proper error handling
    const login = useCallback(async (credentials, remember = false) => {
        console.log('🔐 useAuth.login called');
        
        try {
            dispatch({ type: 'set_loading', payload: true });
            dispatch({ type: 'clear_error' });
            
            const result = await authService.login(credentials, remember);
            
            if (result.success) {
                console.log('✅ Login successful in useAuth hook');
                
                // Navigate after a brief delay to ensure state is updated
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
            const errorMessage = 'Login failed. Please try again.';
            dispatch({ 
                type: 'set_error', 
                payload: errorMessage 
            });
            return { success: false, error: errorMessage };
        } finally {
            dispatch({ type: 'set_loading', payload: false });
        }
    }, [dispatch, navigate, location.state]);

    // Enhanced register function
    const register = useCallback(async (userData, remember = false) => {
        console.log('📝 useAuth.register called');
        
        try {
            dispatch({ type: 'set_loading', payload: true });
            dispatch({ type: 'clear_error' });
            
            const result = await authService.register(userData, remember);
            
            if (result.success) {
                console.log('✅ Registration successful in useAuth hook');
                
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
            const errorMessage = 'Registration failed. Please try again.';
            dispatch({ 
                type: 'set_error', 
                payload: errorMessage 
            });
            return { success: false, error: errorMessage };
        } finally {
            dispatch({ type: 'set_loading', payload: false });
        }
    }, [dispatch, navigate]);

    // Enhanced logout function
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

    // Refresh token function
    const refreshToken = useCallback(async () => {
        try {
            await authService.refreshTokenSilently();
            return { success: true };
        } catch (error) {
            console.error('Token refresh failed:', error);
            return { success: false, error: error.message };
        }
    }, []);

    // Update user profile function
    const updateUser = useCallback((updatedUser) => {
        console.log('👤 Updating user in useAuth hook:', updatedUser);
        dispatch({
            type: 'set_user',
            payload: updatedUser
        });
    }, [dispatch]);

    // Clear auth error function
    const clearError = useCallback(() => {
        dispatch({ type: 'clear_error' });
    }, [dispatch]);

    // Check if user has specific permissions
    const hasPermission = useCallback((permission) => {
        if (!user) return false;
        
        // Add your permission logic here
        switch (permission) {
            case 'admin':
                return user.role === 'admin';
            case 'steam_connected':
                return user.steam_connected || user.is_steam_connected;
            default:
                return false;
        }
    }, [user]);

    // Get authentication status with details
    const getAuthStatus = useCallback(() => {
        return {
            isAuthenticated,
            isLoading: authLoading,
            hasError: !!authError,
            error: authError,
            user,
            token: !!token,
            steamConnected: user?.steam_connected || user?.is_steam_connected || false
        };
    }, [isAuthenticated, authLoading, authError, user, token]);

    // Wait for auth initialization
    const waitForAuth = useCallback(async () => {
        if (authService.authCheckCompleted) {
            return getAuthStatus();
        }
        
        await authService.waitForInitialization();
        return getAuthStatus();
    }, [getAuthStatus]);

    return {
        // State
        isAuthenticated,
        user,
        authLoading,
        authError,
        token: !!token,
        
        // Actions
        login,
        register,
        logout,
        refreshToken,
        updateUser,
        clearError,
        
        // Utilities
        hasPermission,
        getAuthStatus,
        waitForAuth,
        
        // Direct access to auth service (for advanced usage)
        authService
    };
};

export default useAuth;