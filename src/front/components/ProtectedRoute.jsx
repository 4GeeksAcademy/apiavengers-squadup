// src/front/components/ProtectedRoute.jsx - Enhanced with gaming permissions while keeping existing logic

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer'; // Fixed: default import
import authService from '../store/authService';
import { getGamingSelectors } from '../store/store.js';

const ProtectedRoute = ({ 
    children,
    // New gaming-specific props
    requireSteam = false,
    requireGroupMembership = false,
    requireGroupCreator = false,
    groupId = null,
    fallback = null
}) => {
    const { store } = useGlobalReducer();
    const location = useLocation();
    const selectors = getGamingSelectors(store);
    
    const [authState, setAuthState] = useState({
        isChecking: true,
        isAuthenticated: false,
        error: null
    });

    // Your existing auth check logic (unchanged)
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

    // Loading state with escape hatch (your existing code)
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

    // Handle unauthenticated state (your existing code)
    if (!authState.isAuthenticated) {
        console.log('🚪 ProtectedRoute: Redirecting to login from:', location.pathname);
        const redirectPath = location.pathname !== '/login' ? location.pathname : '/dashboard';
        return <Navigate to="/login" state={{ from: { pathname: redirectPath } }} replace />;
    }

    // NEW: Additional gaming-specific checks after basic auth passes
    const user = store?.user;

    // Check Steam connection requirement
    if (requireSteam && (!user?.steam_connected && !user?.is_steam_connected)) {
        return fallback || (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md mx-4">
                    <div className="text-6xl mb-4">🎮</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Steam Connection Required</h2>
                    <p className="text-white/60 mb-6">
                        This feature requires a connected Steam account to access your game library and find common games with friends.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.href = '/api/auth/steam/connect'}
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                            🔗 Connect Steam Account
                        </button>
                        <button
                            onClick={() => window.history.back()}
                            className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors"
                        >
                            ← Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Check group membership requirement
    if (requireGroupMembership && groupId) {
        const currentGroup = selectors.getCurrentGroup();
        const userGroups = selectors.getUserGroups();
        
        // Check if user is member of the specific group
        const isMember = currentGroup?.id === parseInt(groupId) || 
                         userGroups.some(group => group.id === parseInt(groupId));
        
        if (!isMember) {
            return fallback || (
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md mx-4">
                        <div className="text-6xl mb-4">🚫</div>
                        <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
                        <p className="text-white/60 mb-6">
                            You are not a member of this group. Ask the group creator for an invite link.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl transition-colors"
                            >
                                Go to Dashboard
                            </button>
                            <button
                                onClick={() => window.history.back()}
                                className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors"
                            >
                                ← Go Back
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
    }

    // Check group creator requirement
    if (requireGroupCreator && groupId) {
        const isCreator = selectors.isCurrentUserGroupCreator();
        const currentGroup = selectors.getCurrentGroup();
        
        // If we don't have current group data, show loading
        if (!currentGroup || currentGroup.id !== parseInt(groupId)) {
            return fallback || (
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                        <div className="w-8 h-8 border-2 border-coral-500/30 border-t-coral-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <h2 className="text-xl font-bold text-white mb-2">Loading Group...</h2>
                        <p className="text-white/60">Verifying group permissions</p>
                    </div>
                </div>
            );
        }
        
        if (!isCreator) {
            return fallback || (
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md mx-4">
                        <div className="text-6xl mb-4">👑</div>
                        <h2 className="text-2xl font-bold text-white mb-4">Creator Access Required</h2>
                        <p className="text-white/60 mb-6">
                            This action requires group creator privileges. Only the group creator can access this feature.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.href = `/groups/${groupId}`}
                                className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl transition-colors"
                            >
                                Back to Group
                            </button>
                            <button
                                onClick={() => window.history.back()}
                                className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors"
                            >
                                ← Go Back
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
    }

    // All checks passed, render protected content
    console.log('✅ ProtectedRoute: Rendering protected content');
    return children;
};

// Helper components for common gaming protection patterns
export const SteamProtectedRoute = ({ children, ...props }) => (
    <ProtectedRoute requireSteam={true} {...props}>
        {children}
    </ProtectedRoute>
);

export const GroupMemberRoute = ({ children, groupId, ...props }) => (
    <ProtectedRoute 
        requireGroupMembership={true} 
        groupId={groupId} 
        {...props}
    >
        {children}
    </ProtectedRoute>
);

export const GroupCreatorRoute = ({ children, groupId, ...props }) => (
    <ProtectedRoute 
        requireGroupMembership={true} 
        requireGroupCreator={true} 
        groupId={groupId} 
        {...props}
    >
        {children}
    </ProtectedRoute>
);

export default ProtectedRoute;