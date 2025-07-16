// src/front/components/ProtectedRoute.jsx - FIXED to prevent infinite checking

import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';

const ProtectedRoute = ({ children }) => {
    const { store, dispatch } = useGlobalReducer();
    const location = useLocation();
    
    // CRITICAL FIX: Use refs to prevent infinite loops
    const checkCompleteRef = useRef(false);
    const lastAuthStateRef = useRef(null);
    
    const [authState, setAuthState] = useState({
        isChecking: true,
        isAuthenticated: false,
        error: null
    });

    useEffect(() => {
        // Create a stable auth state key for comparison
        const currentAuthState = `${store?.isAuthenticated}-${!!store?.user}-${store?.authLoading}-${authService.authCheckCompleted}`;
        
        // Only run if auth state actually changed or first time
        if (checkCompleteRef.current && lastAuthStateRef.current === currentAuthState) {
            console.log('🛡️ ProtectedRoute: Auth state unchanged, skipping check');
            return;
        }
        
        lastAuthStateRef.current = currentAuthState;
        console.log('🛡️ ProtectedRoute: Auth state changed, performing check for:', location.pathname);

        const performAuthCheck = async () => {
            try {
                // Wait for auth service to be ready if not already
                if (!authService.authCheckCompleted) {
                    console.log('⏳ ProtectedRoute: Waiting for auth service completion...');
                    await authService.waitForInitialization();
                }

                const serviceAuth = authService.isAuthenticated();
                const storeAuth = store?.isAuthenticated;
                const hasUser = !!store?.user;
                const isLoading = store?.authLoading;

                console.log('🔍 ProtectedRoute: Auth check state:', {
                    serviceAuth,
                    storeAuth, 
                    hasUser,
                    isLoading,
                    authCheckCompleted: authService.authCheckCompleted,
                    pathname: location.pathname
                });

                // If still loading, keep waiting
                if (isLoading || !authService.authCheckCompleted) {
                    console.log('⏳ ProtectedRoute: Still loading auth state...');
                    setAuthState({
                        isChecking: true,
                        isAuthenticated: false,
                        error: null
                    });
                    return;
                }

                // Check for auth state mismatches and fix them
                if (serviceAuth && !storeAuth && !isLoading) {
                    console.log('🔧 ProtectedRoute: Fixing auth state mismatch - service says auth but store doesn\'t');
                    const user = authService.getCurrentUser();
                    const token = authService.getAccessToken();
                    
                    if (user && token) {
                        dispatch({
                            type: 'login_success',
                            payload: { user, token, refreshToken: authService.getRefreshToken() }
                        });
                        
                        setAuthState({
                            isChecking: false,
                            isAuthenticated: true,
                            error: null
                        });
                        return;
                    }
                }

                // If both agree user is authenticated
                if (serviceAuth && storeAuth && hasUser) {
                    console.log('✅ ProtectedRoute: User authenticated');
                    setAuthState({
                        isChecking: false,
                        isAuthenticated: true,
                        error: null
                    });
                    return;
                }

                // If neither thinks user is authenticated
                if (!serviceAuth && !storeAuth) {
                    console.log('❌ ProtectedRoute: User not authenticated');
                    setAuthState({
                        isChecking: false,
                        isAuthenticated: false,
                        error: null
                    });
                    return;
                }

                // Handle edge cases
                console.log('⚠️ ProtectedRoute: Edge case - clearing inconsistent auth');
                authService.clearAuth();
                setAuthState({
                    isChecking: false,
                    isAuthenticated: false,
                    error: null
                });

            } catch (error) {
                console.error('💥 ProtectedRoute: Auth check error:', error);
                setAuthState({
                    isChecking: false,
                    isAuthenticated: false,
                    error: error.message
                });
            } finally {
                checkCompleteRef.current = true;
            }
        };

        performAuthCheck();
    }, [store?.isAuthenticated, store?.user?.id, store?.authLoading, location.pathname, dispatch]);

    // Handle loading state
    if (authState.isChecking) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Verifying access...</p>
                    <p className="text-white/60 text-sm mt-2">Please wait</p>
                </div>
            </div>
        );
    }

    // Handle unauthenticated state
    if (!authState.isAuthenticated) {
        console.log('🚪 ProtectedRoute: Redirecting to login from:', location.pathname);
        
        // Store the intended destination
        const redirectPath = location.pathname !== '/login' ? location.pathname : '/dashboard';
        
        return <Navigate 
            to="/login" 
            state={{ from: { pathname: redirectPath } }} 
            replace 
        />;
    }

    // User is authenticated, render protected content
    console.log('✅ ProtectedRoute: Rendering protected content for:', store?.user?.username);
    return children;
};

export { ProtectedRoute };
export default ProtectedRoute;