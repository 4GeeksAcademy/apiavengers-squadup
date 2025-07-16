// src/front/components/ProtectedRoute.jsx - ENHANCED VERSION
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';

const ProtectedRoute = ({ children }) => {
    const { store, dispatch } = useGlobalReducer();
    const location = useLocation();
    const [authState, setAuthState] = useState({
        isChecking: true,
        isAuthenticated: false,
        error: null
    });

    useEffect(() => {
        let isMounted = true;

        const verifyAuthentication = async () => {
            console.log('🔐 ProtectedRoute: Starting auth verification for', location.pathname);
            
            try {
                // Step 1: Check if we have basic auth indicators
                const token = authService.getAccessToken();
                const user = authService.getCurrentUser();
                const storeAuth = store?.isAuthenticated;
                const storeUser = store?.user;

                console.log('🔍 Auth Check State:', {
                    hasToken: !!token,
                    hasUser: !!user,
                    storeAuth,
                    hasStoreUser: !!storeUser,
                    authCheckCompleted: authService.authCheckCompleted,
                    currentPath: location.pathname
                });

                // Step 2: If no token at all, definitely not authenticated
                if (!token) {
                    console.log('❌ No token found, redirecting to login');
                    if (isMounted) {
                        setAuthState({
                            isChecking: false,
                            isAuthenticated: false,
                            error: null
                        });
                    }
                    return;
                }

                // Step 3: If we have token but auth check not completed, wait for it
                if (!authService.authCheckCompleted) {
                    console.log('⏳ Waiting for auth service initialization...');
                    
                    // Wait for auth service to complete its check (max 5 seconds)
                    const maxWait = 5000;
                    const startTime = Date.now();
                    
                    while (!authService.authCheckCompleted && (Date.now() - startTime < maxWait)) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    if (!authService.authCheckCompleted) {
                        console.log('⚠️ Auth service check timed out, proceeding with manual verification');
                    }
                }

                // Step 4: Verify token with backend
                console.log('🔍 Verifying token with backend...');
                const isTokenValid = await authService.verifyToken();
                
                if (!isMounted) return; // Component unmounted during async operation

                if (isTokenValid) {
                    console.log('✅ Token verified successfully');
                    
                    // Step 5: Ensure store state is consistent
                    const currentUser = authService.getCurrentUser();
                    if (currentUser && (!storeUser || storeUser.id !== currentUser.id)) {
                        console.log('🔄 Updating store with verified user');
                        dispatch({ type: 'set_user', payload: currentUser });
                    }
                    
                    if (!storeAuth) {
                        console.log('🔄 Updating store auth status');
                        dispatch({ 
                            type: 'login_success', 
                            payload: { 
                                user: currentUser, 
                                token: token,
                                refreshToken: authService.getRefreshToken()
                            } 
                        });
                    }
                    
                    setAuthState({
                        isChecking: false,
                        isAuthenticated: true,
                        error: null
                    });
                } else {
                    console.log('❌ Token verification failed');
                    
                    // Clear invalid auth state
                    authService.clearAuth();
                    
                    setAuthState({
                        isChecking: false,
                        isAuthenticated: false,
                        error: null
                    });
                }
                
            } catch (error) {
                console.error('💥 Auth verification error:', error);
                
                if (!isMounted) return;
                
                // On error, check if we have valid local auth as fallback
                const token = authService.getAccessToken();
                const user = authService.getCurrentUser();
                
                if (token && user && store?.isAuthenticated) {
                    console.log('⚠️ Network error but valid local auth, allowing access');
                    setAuthState({
                        isChecking: false,
                        isAuthenticated: true,
                        error: null
                    });
                } else {
                    console.log('❌ Network error and no valid local auth');
                    setAuthState({
                        isChecking: false,
                        isAuthenticated: false,
                        error: error.message
                    });
                }
            }
        };

        verifyAuthentication();

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [location.pathname, store?.isAuthenticated, store?.user, dispatch]);

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
        console.log('🚪 Redirecting to login from:', location.pathname);
        
        // Store the intended destination
        const redirectPath = location.pathname !== '/login' ? location.pathname : '/dashboard';
        
        return <Navigate 
            to="/login" 
            state={{ from: { pathname: redirectPath } }} 
            replace 
        />;
    }

    // User is authenticated, render protected content
    console.log('✅ Rendering protected content for:', store?.user?.username);
    return children;
};

export { ProtectedRoute };
export default ProtectedRoute;