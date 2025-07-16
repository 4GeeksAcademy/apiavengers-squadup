import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useGlobalReducer from './useGlobalReducer';
import authService from '../store/authService';
import { logIn, logOut, signUp, verifyAuthStatus, updateUserData } from '../store/actions';

export const useOptimizedAuth = () => {
  const { store, dispatch, actions } = useGlobalReducer();
  const navigate = useNavigate();

  // Optimized login with automatic redirect
  const login = useCallback(async (credentials, rememberMe = true, redirectTo = '/dashboard') => {
    try {
      const result = await logIn(credentials, rememberMe)(dispatch);
      
      if (result?.success) {
        navigate(redirectTo, { replace: true });
        return { success: true };
      } else {
        return { success: false, error: result?.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }, [dispatch, navigate]);

  // Optimized register with automatic redirect
  const register = useCallback(async (userData, redirectTo = '/dashboard') => {
    try {
      const result = await signUp(userData)(dispatch);
      
      if (result?.success) {
        navigate(redirectTo, { replace: true });
        return { success: true };
      } else {
        return { success: false, error: result?.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }, [dispatch, navigate]);

  // Optimized logout with redirect
  const logout = useCallback(async (redirectTo = '/') => {
    try {
      await logOut()(dispatch);
      navigate(redirectTo, { replace: true });
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Logout failed' };
    }
  }, [dispatch, navigate]);

  // Optimized auth verification (uses throttling)
  const verifyAuth = useCallback(async (force = false) => {
    try {
      const isAuthenticated = await verifyAuthStatus(force)(dispatch);
      return { success: true, isAuthenticated };
    } catch (error) {
      console.error('Auth verification error:', error);
      return { success: false, error: 'Verification failed' };
    }
  }, [dispatch]);

  // Update user data in both store and localStorage
  const updateUser = useCallback((userData) => {
    updateUserData(userData)(dispatch);
  }, [dispatch]);

  // Make authenticated API requests
  const makeAuthenticatedRequest = useCallback(async (url, options = {}) => {
    try {
      // Ensure we have a valid token before making the request
      const isAuthenticated = await authService.checkAuthStatus(false);
      
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }

      // Use the authService to make the request with automatic token refresh
      return await authService.makeAuthenticatedRequest(url, options);
    } catch (error) {
      console.error('Authenticated request error:', error);
      throw error;
    }
  }, []);

  return {
    // State
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.authLoading,
    error: store.authError,
    
    // Actions
    login,
    register,
    logout,
    verifyAuth,
    updateUser,
    makeAuthenticatedRequest,
    
    // Direct access to actions for advanced use cases
    actions,
    dispatch
  };
}; 