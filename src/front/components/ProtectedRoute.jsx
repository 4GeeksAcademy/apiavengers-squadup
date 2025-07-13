import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService'; // ADD: Import authService for comparison

export const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const { store } = useGlobalReducer();
    
    // FIXED: Proper destructuring with fallbacks
    const {
        isAuthenticated = false,
        authLoading = false,
        user = null
    } = store || {};

    // ADD: Compare authService vs global store for debugging
    const authServiceCheck = authService.isAuthenticated();
    const authServiceUser = authService.getCurrentUser();
    const authServiceToken = authService.getAccessToken();

    console.log('🛡️ ProtectedRoute check:', { 
        // Global store data
        globalStore_isAuthenticated: isAuthenticated, 
        globalStore_authLoading: authLoading, 
        globalStore_hasUser: !!user,
        globalStore_user: user?.username,
        
        // AuthService data (for comparison)
        authService_isAuthenticated: authServiceCheck,
        authService_hasUser: !!authServiceUser,
        authService_hasToken: !!authServiceToken,
        authService_user: authServiceUser?.username,
        
        // Route info
        currentPath: location.pathname,
        
        // State mismatch detection
        mismatch: authServiceCheck !== isAuthenticated
    });

    // ADD: Alert if there's a mismatch between systems
    if (authServiceCheck !== isAuthenticated) {
        console.error('🚨 AUTH MISMATCH DETECTED!', {
            authService: authServiceCheck,
            globalStore: isAuthenticated,
            action: 'This is likely the source of the redirect loop'
        });
    }

    // FIXED: Show loading while auth is being determined
    if (authLoading) {
        console.log('⏳ ProtectedRoute: Auth is loading, showing loading screen');
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/70">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // FIXED: Only redirect if definitely not authenticated
    if (!authLoading && !isAuthenticated) {
        console.log('🚪 ProtectedRoute: Not authenticated. Redirecting to login.');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // FIXED: Render children only if authenticated
    if (isAuthenticated) {
        console.log('✅ ProtectedRoute: Authenticated. Rendering protected content.');
        return children;
    }

    // Fallback loading state (shouldn't normally reach here)
    console.log('⚠️ ProtectedRoute: Fallback loading state');
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/70">Loading...</p>
            </div>
        </div>
    );
};