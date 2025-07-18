// src/front/components/ProtectedRoute.jsx - FIXED VERSION

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import LoadingState from './LoadingState';

const ProtectedRoute = ({ children }) => {
    const { store } = useGlobalReducer();
    const location = useLocation();
    const [authCheckComplete, setAuthCheckComplete] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const initializeAuth = async () => {
            // 🔧 CRITICAL: Only initialize once
            if (hasInitialized) {
                console.log('🔍 ProtectedRoute: Auth already initialized, skipping...');
                return;
            }

            console.log('🔍 ProtectedRoute: Initializing auth check...');
            setHasInitialized(true);

            try {
                // Wait for auth service to complete its check
                await authService.waitForInitialization?.() || Promise.resolve();
                
                if (isMounted) {
                    console.log('🔍 ProtectedRoute: Auth check complete');
                    setAuthCheckComplete(true);
                }
            } catch (error) {
                console.error('❌ ProtectedRoute: Auth initialization error:', error);
                if (isMounted) {
                    setAuthCheckComplete(true);
                }
            }
        };

        initializeAuth();

        return () => {
            isMounted = false;
        };
    }, []); // 🔧 CRITICAL: Empty dependency array - only run once

    // 🔧 CRITICAL: Don't check auth state until initialization is complete
    if (!authCheckComplete) {
        console.log('🔍 ProtectedRoute: Waiting for auth check to complete...');
        return <LoadingState message="Checking authentication..." />;
    }

    // Now check the authentication state
    const isAuthenticated = store.isAuthenticated;
    const authLoading = store.authLoading;

    console.log('🔍 ProtectedRoute: Auth state:', {
        isAuthenticated,
        authLoading,
        authCheckComplete,
        hasUser: !!store.user,
        hasToken: !!store.token,
        pathname: location.pathname
    });

    // Still loading authentication
    if (authLoading) {
        console.log('🔍 ProtectedRoute: Auth still loading...');
        return <LoadingState message="Authenticating..." />;
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        console.log('🚫 ProtectedRoute: Not authenticated, redirecting to login');
        return (
            <Navigate 
                to="/login" 
                state={{ from: location.pathname }} 
                replace 
            />
        );
    }

    // Authenticated - render the protected content
    console.log('✅ ProtectedRoute: Authenticated, rendering protected content');
    return children;
};

export default ProtectedRoute;