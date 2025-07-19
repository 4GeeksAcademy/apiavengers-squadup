// src/front/components/ProtectedRoute.jsx - ENHANCED VERSION

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';

/**
 * Enhanced ProtectedRoute component with proper JWT handling
 * Features:
 * - Proper authentication checking with JWT validation
 * - Loading states during auth verification
 * - Token refresh handling
 * - Graceful error handling
 * - Proper redirect preservation
 */
const ProtectedRoute = ({ children, requireFresh = false, fallback = null }) => {
    const { store } = useGlobalReducer();
    const location = useLocation();
    
    const [authState, setAuthState] = useState({
        isChecking: true,
        isAuthenticated: false,
        error: null,
        user: null
    });

    useEffect(() => {
        let isMounted = true;
        
        const checkAuthentication = async () => {
            try {
                console.log('🛡️ ProtectedRoute: Checking authentication...');
                
                // First check if authService has completed its initialization
                await authService.waitForInitialization();
                
                // Get current auth state from service and store
                const serviceAuth = authService.isAuthenticated();
                const storeAuth = store?.isAuthenticated;
                const user = store?.user || authService.getUser();
                const token = authService.getAccessToken();
                
                console.log('🛡️ ProtectedRoute auth check:', {
                    serviceAuth,
                    storeAuth,
                    hasUser: !!user,
                    hasToken: !!token,
                    authLoading: store?.authLoading
                });
                
                if (!isMounted) return;
                
                // If service says authenticated but store doesn't, try to sync
                if (serviceAuth && !storeAuth && user && token) {
                    console.log('🔄 ProtectedRoute: Syncing auth state...');
                    
                    // Verify token is still valid
                    try {
                        const response = await authService.authenticatedFetch('/api/auth/verify');
                        if (response.ok) {
                            const data = await response.json();
                            if (data.valid) {
                                // Token is valid, update store
                                if (authService.dispatch) {
                                    authService.dispatch({
                                        type: 'login_success',
                                        payload: { user, token, refreshToken: authService.getRefreshToken() }
                                    });
                                }
                                
                                if (isMounted) {
                                    setAuthState({
                                        isChecking: false,
                                        isAuthenticated: true,
                                        error: null,
                                        user
                                    });
                                }
                                return;
                            }
                        }
                    } catch (verifyError) {
                        console.warn('🛡️ Token verification failed:', verifyError);
                        // Token verification failed, clear auth
                        authService.clearAuth();
                    }
                }
                
                // Both service and store must agree for authentication
                const isAuthenticated = serviceAuth && storeAuth && !!user && !!token;
                
                if (isMounted) {
                    setAuthState({
                        isChecking: false,
                        isAuthenticated,
                        error: null,
                        user: isAuthenticated ? user : null
                    });
                }
                
            } catch (error) {
                console.error('🛡️ ProtectedRoute auth check error:', error);
                
                if (isMounted) {
                    setAuthState({
                        isChecking: false,
                        isAuthenticated: false,
                        error: error.message,
                        user: null
                    });
                }
            }
        };

        checkAuthentication();
        
        return () => {
            isMounted = false;
        };
    }, [store?.isAuthenticated, store?.user, store?.authLoading]);

    // Show loading state while checking authentication
    if (authState.isChecking || store?.authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-white mb-2">Verifying Authentication</h2>
                    <p className="text-white/60 text-sm">Please wait while we verify your credentials...</p>
                </div>
            </div>
        );
    }

    // Show error state if there was an authentication error
    if (authState.error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Authentication Error</h2>
                    <p className="text-white/70 mb-6">{authState.error}</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                        >
                            Refresh Page
                        </button>
                        <button
                            onClick={() => {
                                authService.clearAuth();
                                window.location.href = '/login';
                            }}
                            className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // If not authenticated, redirect to login with current location
    if (!authState.isAuthenticated) {
        console.log('🛡️ ProtectedRoute: User not authenticated, redirecting to login');
        
        return (
            <Navigate 
                to="/login" 
                state={{ from: location }}
                replace 
            />
        );
    }

    // Check for fresh token requirement (for sensitive operations)
    if (requireFresh && authState.user) {
        const token = authService.getAccessToken();
        if (token) {
            const parsed = authService.parseJWT(token);
            if (parsed && parsed.payload.fresh === false) {
                console.log('🛡️ ProtectedRoute: Fresh token required, redirecting to re-authenticate');
                
                return (
                    <Navigate 
                        to="/login" 
                        state={{ 
                            from: location,
                            requireFresh: true,
                            message: 'Please re-enter your password for security'
                        }}
                        replace 
                    />
                );
            }
        }
    }

    // User is authenticated, render the protected content
    console.log('✅ ProtectedRoute: User authenticated, rendering protected content');
    
    return (
        <>
            {children}
            
            {/* Optional: Add authentication status indicator in development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-4 right-4 z-50">
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2 text-green-300 text-xs">
                        🔐 Authenticated: {authState.user?.username}
                    </div>
                </div>
            )}
        </>
    );
};

/**
 * HOC version of ProtectedRoute for backward compatibility
 */
export const withAuth = (Component, options = {}) => {
    return function AuthenticatedComponent(props) {
        return (
            <ProtectedRoute {...options}>
                <Component {...props} />
            </ProtectedRoute>
        );
    };
};

/**
 * Hook to check if user has specific permissions
 */
export const useAuthPermissions = () => {
    const { store } = useGlobalReducer();
    
    const hasPermission = (permission) => {
        const user = store?.user;
        if (!user) return false;
        
        switch (permission) {
            case 'admin':
                return user.role === 'admin';
            case 'steam_connected':
                return user.steam_connected || user.is_steam_connected;
            case 'verified':
                return user.email_verified;
            default:
                return false;
        }
    };
    
    const hasRole = (role) => {
        const user = store?.user;
        return user?.role === role;
    };
    
    const isOwner = (resource) => {
        const user = store?.user;
        if (!user || !resource) return false;
        
        return resource.creator_id === user.id || 
               resource.owner_id === user.id || 
               resource.user_id === user.id;
    };
    
    return {
        hasPermission,
        hasRole,
        isOwner,
        user: store?.user,
        isAuthenticated: store?.isAuthenticated
    };
};

/**
 * Permission-based route protection
 */
export const PermissionRoute = ({ children, permission, fallback = null }) => {
    const { hasPermission } = useAuthPermissions();
    
    return (
        <ProtectedRoute fallback={fallback}>
            {hasPermission(permission) ? children : (
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                        <div className="text-6xl mb-4">🚫</div>
                        <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
                        <p className="text-white/70 mb-6">
                            You don't have permission to access this page.
                        </p>
                        <button
                            onClick={() => window.history.back()}
                            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            )}
        </ProtectedRoute>
    );
};

export default ProtectedRoute;