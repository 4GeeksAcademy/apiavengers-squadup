import React, { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { useLocation, Navigate } from 'react-router-dom';
import authService from '../store/authService.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { logOut }     from '../store/actions';
import useGlobalReducer from '../hooks/useGlobalReducer';
import { ACTION_TYPES } from '../store/store';

gsap.registerPlugin(ScrollTrigger);

export const ProtectedRoute = ({ children }) => {
  const { store: { isAuthenticated }, dispatch } = useGlobalReducer();
  const location = useLocation();
  const [checking, setChecking] = useState(true)
  const [allowed,  setAllowed]  = useState(false)


  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await authService.checkAuthStatus();    // will refresh if needed
      if (cancelled) return;

      if (ok) {
        /* sync freshest user/token into the store */
        dispatch({ type: ACTION_TYPES.SET_USER, payload: authService.getCurrentUser() });
        dispatch({ type: ACTION_TYPES.SET_TOKEN, payload: authService.getAccessToken() });
        setAllowed(true);
      } else {
        dispatch({ type: ACTION_TYPES.LOGOUT });
        setAllowed(false)
      }
      setChecking(false);
    })();

    return () => { cancelled = true; };
  }, [dispatch]);

    const redirectToLogin = () => {
        // In actual implementation, use react-router navigation
        window.location.href = '/login';
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
    if (!allowed && !isAuthenticated)  {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Render protected content if authenticated
    return children;
};
