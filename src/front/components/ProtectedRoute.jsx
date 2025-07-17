import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';

const ProtectedRoute = ({ children }) => {
    const { store } = useGlobalReducer();
    const location = useLocation();
    
    const [authState, setAuthState] = useState({
        isChecking: true,
        isAuthenticated: false,
        error: null
    });

    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        const performAuthCheck = async () => {
            try {
                console.log('🛡️ ProtectedRoute: Starting auth check for:', location.pathname);

                // Set a reasonable timeout
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        console.log('⏰ ProtectedRoute: Auth check timeout, using local state');
                        const hasLocalAuth = authService.isAuthenticated() && !!store?.user;
                        setAuthState({
                            isChecking: false,
                            isAuthenticated: hasLocalAuth,
                            error: hasLocalAuth ? null : 'Authentication timeout'
                        });
                    }
                }, 3000); // 3 second timeout

                // Quick auth check without waiting
                const serviceAuth = authService.isAuthenticated();
                const storeAuth = store?.isAuthenticated;
                const hasUser = !!store?.user;
                const isLoading = store?.authLoading;

                console.log('🔍 ProtectedRoute: Auth status:', {
                    serviceAuth,
                    storeAuth,
                    hasUser,
                    isLoading,
                    authCheckCompleted: authService.authCheckCompleted
                });

                // If we have consistent auth state, use it immediately
                if (serviceAuth && storeAuth && hasUser && !isLoading) {
                    console.log('✅ ProtectedRoute: Quick auth success');
                    if (isMounted) {
                        clearTimeout(timeoutId);
                        setAuthState({
                            isChecking: false,
                            isAuthenticated: true,
                            error: null
                        });
                    }
                    return;
                }

                // If clearly not authenticated, proceed quickly
                if (!serviceAuth && !storeAuth && !isLoading) {
                    console.log('❌ ProtectedRoute: Quick auth failure');
                    if (isMounted) {
                        clearTimeout(timeoutId);
                        setAuthState({
                            isChecking: false,
                            isAuthenticated: false,
                            error: null
                        });
                    }
                    return;
                }

                // If still loading, wait a bit but not too long
                if (isLoading && !authService.authCheckCompleted) {
                    console.log('⏳ ProtectedRoute: Auth still loading, waiting briefly...');
                    
                    // Wait max 1 second for auth to complete
                    const maxWait = 1000;
                    const startTime = Date.now();
                    
                    while ((Date.now() - startTime < maxWait) && store?.authLoading && !authService.authCheckCompleted) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        if (!isMounted) return;
                    }
                }

                // Final auth check
                const finalServiceAuth = authService.isAuthenticated();
                const finalStoreAuth = store?.isAuthenticated;
                const finalHasUser = !!store?.user;

                if (isMounted) {
                    clearTimeout(timeoutId);
                    const isAuthenticated = finalServiceAuth && finalStoreAuth && finalHasUser;
                    
                    console.log('🏁 ProtectedRoute: Final auth decision:', isAuthenticated);
                    
                    setAuthState({
                        isChecking: false,
                        isAuthenticated,
                        error: null
                    });
                }

            } catch (error) {
                console.error('💥 ProtectedRoute: Auth check error:', error);
                if (isMounted) {
                    clearTimeout(timeoutId);
                    setAuthState({
                        isChecking: false,
                        isAuthenticated: false,
                        error: error.message
                    });
                }
            }
        };

        performAuthCheck();

        // Cleanup
        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [store?.isAuthenticated, store?.user?.id, store?.authLoading, location.pathname]);

    // Loading state with escape hatch
    if (authState.isChecking) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Verifying access...</p>
                    <p className="text-white/60 text-sm mt-2">Please wait</p>
                    
                    {/* Escape hatch for stuck users */}
                    <div className="mt-6">
                        <button 
                            onClick={() => {
                                console.log('🚪 User clicked skip verification');
                                const hasBasicAuth = authService.getAccessToken() && authService.getCurrentUser();
                                setAuthState({
                                    isChecking: false,
                                    isAuthenticated: hasBasicAuth,
                                    error: null
                                });
                            }}
                            className="text-coral-400 hover:text-coral-300 text-sm underline transition-colors"
                        >
                            Skip verification
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Handle unauthenticated state
    if (!authState.isAuthenticated) {
        console.log('🚪 ProtectedRoute: Redirecting to login from:', location.pathname);
        const redirectPath = location.pathname !== '/login' ? location.pathname : '/dashboard';
        return <Navigate to="/login" state={{ from: { pathname: redirectPath } }} replace />;
    }

    // User is authenticated, render protected content
    console.log('✅ ProtectedRoute: Rendering protected content');
    return children;
};

export default ProtectedRoute;