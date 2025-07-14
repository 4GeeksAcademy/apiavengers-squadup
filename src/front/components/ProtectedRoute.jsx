import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { logOut } from '../store/actions';
import { ACTION_TYPES } from '../store/store';

// Reusable Loading Spinner component
const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div 
    className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center"
    role="status"
    aria-live="polite"
  >
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-white/70">{message}</p>
    </div>
  </div>
);

export const ProtectedRoute = ({ children }) => {  
  const location = useLocation();
  const { store } = useGlobalReducer();

  const {
    isAuthenticated = false,
    authLoading = false,
    user = null
  } = store || {};

  // AuthService comparison for debugging
  const authServiceCheck = authService.isAuthenticated();
  const authServiceUser = authService.getCurrentUser();
  const authServiceToken = authService.getAccessToken();

  console.log('🛡️ ProtectedRoute check:', {
    globalStore_isAuthenticated: isAuthenticated,
    globalStore_authLoading: authLoading,
    globalStore_hasUser: !!user,
    globalStore_user: user?.username,
    authService_isAuthenticated: authServiceCheck,
    authService_hasUser: !!authServiceUser,
    authService_hasToken: !!authServiceToken,
    authService_user: authServiceUser?.username,
    currentPath: location.pathname,
    mismatch: authServiceCheck !== isAuthenticated
  });

  // Handle mismatch (log in all envs, but alert/toast only in dev)
  if (authServiceCheck !== isAuthenticated) {
    console.error('🚨 AUTH MISMATCH DETECTED!', {
      authService: authServiceCheck,
      globalStore: isAuthenticated,
      action: 'This is likely the source of the redirect loop'
    });
    if (import.meta.env.DEV) {
      // Optional: Add toast or alert in dev mode
      // toast.error('Auth mismatch detected! Check console.');
export const ProtectedRoute = ({ children }) => {
  const { store: { isAuthenticated }, dispatch } = useGlobalReducer();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {

        const ok = await authService.checkAuthStatus(false); 
        
        if (cancelled) return;

        if (ok) {

          const user = authService.getCurrentUser();
          dispatch({ type: ACTION_TYPES.SET_USER, payload: user });
          dispatch({ type: ACTION_TYPES.SET_TOKEN, payload: authService.getAccessToken() });
          setAllowed(true);
        } else {
          dispatch({ type: ACTION_TYPES.LOGOUT });
          setAllowed(false);
        }
      } catch (error) {
        console.error('ProtectedRoute auth check error:', error);
        if (!cancelled) {
          dispatch({ type: ACTION_TYPES.LOGOUT });
          setAllowed(false);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    // If were already authed.... use it
    if (isAuthenticated && authService.getCurrentUser() && authService.getAccessToken()) {
      setAllowed(true);
      setChecking(false);
    } else {
      checkAuth();
    }
  }

  if (authLoading) {
    console.log('⏳ ProtectedRoute: Auth is loading, showing loading screen');
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (!authLoading && !isAuthenticated) {
    console.log('🚪 ProtectedRoute: Not authenticated. Redirecting to login.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAuthenticated) {
    console.log('✅ ProtectedRoute: Authenticated. Rendering protected content.');
    return children;
  }

  // Fallback (rarely reached)
  console.log('⚠️ ProtectedRoute: Fallback loading state');
  return <LoadingSpinner />;
};
    return () => { cancelled = true; };
  }, [dispatch, isAuthenticated]);

  const redirectToLogin = () => {

    navigate('/login')
  };

  // Show loading spinner while checking authentication
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!allowed && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content if authenticated
  return children;
};
