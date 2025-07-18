// src/front/components/ProtectedRoute.jsx - ENHANCED with better validation and group requirements

import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import { getGamingSelectors } from '../store/store.js';

const ProtectedRoute = ({ 
    children,
    // Gaming-specific props
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
        error: null,
        hasRequiredPermissions: false
    });

    // 🔧 IMPROVED: Better validation helper
    const validateGroupId = useCallback((id) => {
        if (!id || id === 'undefined' || id === 'null') {
            console.error('🚫 ProtectedRoute: Invalid group ID:', id);
            return null;
        }
        
        try {
            const parsed = parseInt(id);
            if (isNaN(parsed) || parsed <= 0) {
                console.error('🚫 ProtectedRoute: Group ID must be positive integer:', id);
                return null;
            }
            return parsed;
        } catch (error) {
            console.error('🚫 ProtectedRoute: Error parsing group ID:', error);
            return null;
        }
    }, []);

    // 🔧 IMPROVED: More robust auth checking with timeout protection
    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        const performAuthCheck = async () => {
            try {
                console.log('🛡️ ProtectedRoute: Starting auth check for:', location.pathname);

                // 🔧 IMPROVED: Set a reasonable timeout with escape hatch
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        console.log('⏰ ProtectedRoute: Auth check timeout, using local state');
                        const hasLocalAuth = authService.isAuthenticated() && !!store?.user;
                        setAuthState({
                            isChecking: false,
                            isAuthenticated: hasLocalAuth,
                            error: hasLocalAuth ? null : 'Authentication timeout',
                            hasRequiredPermissions: hasLocalAuth
                        });
                    }
                }, 5000); // 5 second timeout

                // 🔧 IMPROVED: Wait for auth service initialization if needed
                if (!authService.authCheckCompleted) {
                    console.log('⏳ ProtectedRoute: Waiting for auth service initialization...');
                    await authService.waitForInitialization();
                }

                if (!isMounted) return;

                // Get auth status from both sources
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

                // 🔧 IMPROVED: More robust auth validation
                const isAuthenticated = serviceAuth && storeAuth && hasUser && !isLoading;

                if (isAuthenticated) {
                    // Check additional gaming requirements
                    const hasRequiredPermissions = await checkGamingRequirements();
                    
                    if (isMounted) {
                        clearTimeout(timeoutId);
                        setAuthState({
                            isChecking: false,
                            isAuthenticated: true,
                            error: null,
                            hasRequiredPermissions
                        });
                    }
                } else if (!serviceAuth && !storeAuth && !isLoading) {
                    // Clearly not authenticated
                    if (isMounted) {
                        clearTimeout(timeoutId);
                        setAuthState({
                            isChecking: false,
                            isAuthenticated: false,
                            error: null,
                            hasRequiredPermissions: false
                        });
                    }
                } else if (isLoading && authService.authCheckCompleted) {
                    // Still loading but auth service says it's done - wait a bit more
                    setTimeout(() => {
                        if (isMounted) {
                            const finalAuth = authService.isAuthenticated() && store?.isAuthenticated && !!store?.user;
                            setAuthState({
                                isChecking: false,
                                isAuthenticated: finalAuth,
                                error: null,
                                hasRequiredPermissions: finalAuth
                            });
                        }
                    }, 1000);
                } else {
                    // Default to not authenticated if unclear
                    if (isMounted) {
                        clearTimeout(timeoutId);
                        setAuthState({
                            isChecking: false,
                            isAuthenticated: false,
                            error: null,
                            hasRequiredPermissions: false
                        });
                    }
                }

            } catch (error) {
                console.error('💥 ProtectedRoute: Auth check error:', error);
                if (isMounted) {
                    clearTimeout(timeoutId);
                    setAuthState({
                        isChecking: false,
                        isAuthenticated: false,
                        error: error.message,
                        hasRequiredPermissions: false
                    });
                }
            }
        };

        // 🔧 NEW: Check gaming requirements
        const checkGamingRequirements = async () => {
            const user = store?.user;
            
            // Check Steam connection requirement
            if (requireSteam && (!user?.steam_connected && !user?.is_steam_connected)) {
                console.log('🚫 ProtectedRoute: Steam required but not connected');
                return false;
            }

            // Check group membership requirement
            if (requireGroupMembership && groupId) {
                const validGroupId = validateGroupId(groupId);
                if (!validGroupId) {
                    console.log('🚫 ProtectedRoute: Invalid group ID for membership check');
                    return false;
                }

                const currentGroup = selectors.getCurrentGroup();
                const userGroups = selectors.getUserGroups();
                
                const isMember = (currentGroup?.id === validGroupId) || 
                                userGroups.some(group => group.id === validGroupId);
                
                if (!isMember) {
                    console.log('🚫 ProtectedRoute: User not member of required group');
                    return false;
                }
            }

            // Check group creator requirement
            if (requireGroupCreator && groupId) {
                const validGroupId = validateGroupId(groupId);
                if (!validGroupId) {
                    console.log('🚫 ProtectedRoute: Invalid group ID for creator check');
                    return false;
                }

                const currentGroup = selectors.getCurrentGroup();
                
                // If we don't have current group data, try to load it
                if (!currentGroup || currentGroup.id !== validGroupId) {
                    console.log('⏳ ProtectedRoute: Missing group data for creator check');
                    return false; // Will show loading state
                }
                
                const isCreator = user && currentGroup.creator && currentGroup.creator.id === user.id;
                
                if (!isCreator) {
                    console.log('🚫 ProtectedRoute: User not creator of required group');
                    return false;
                }
            }

            return true;
        };

        performAuthCheck();

        // Cleanup
        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [store?.isAuthenticated, store?.user?.id, store?.authLoading, location.pathname, 
        requireSteam, requireGroupMembership, requireGroupCreator, groupId, 
        selectors, validateGroupId]);

    // 🔧 IMPROVED: Loading state with better escape hatch
    if (authState.isChecking) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Verifying access...</p>
                    <p className="text-white/60 text-sm mt-2">
                        {requireSteam && "Checking Steam connection..."}
                        {requireGroupMembership && "Verifying group membership..."}
                        {requireGroupCreator && "Validating group permissions..."}
                        {!requireSteam && !requireGroupMembership && !requireGroupCreator && "Please wait"}
                    </p>
                    
                    {/* Enhanced escape hatch */}
                    <div className="mt-6">
                        <button 
                            onClick={() => {
                                console.log('🚪 User clicked emergency skip verification');
                                const hasBasicAuth = authService.getAccessToken() && authService.getCurrentUser();
                                setAuthState({
                                    isChecking: false,
                                    isAuthenticated: hasBasicAuth,
                                    error: null,
                                    hasRequiredPermissions: hasBasicAuth
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

    // Handle missing gaming requirements
    if (!authState.hasRequiredPermissions) {
        const user = store?.user;

        // Steam connection requirement
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
                                onClick={() => window.location.href = '/profile'}
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

        // Group membership requirement
        if (requireGroupMembership && groupId) {
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

        // Group creator requirement
        if (requireGroupCreator && groupId) {
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
    console.log('✅ ProtectedRoute: All checks passed, rendering protected content');
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