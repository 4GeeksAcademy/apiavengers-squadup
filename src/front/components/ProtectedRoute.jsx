import React, { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { useLocation, Navigate } from 'react-router-dom';
import authService from '../store/authService.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { logOut } from '../store/actions';
import useGlobalReducer from '../hooks/useGlobalReducer';
import { ACTION_TYPES } from '../store/store';

gsap.registerPlugin(ScrollTrigger);

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
    if (isAuthenticated && authService.getCurrentUser()) {
      setAllowed(true);
      setChecking(false);
    } else {
      checkAuth();
    }

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
