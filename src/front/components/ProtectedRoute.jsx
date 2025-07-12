import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../store/authService';

export const ProtectedRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading state
    const [isLoading, setIsLoading] = useState(true);
    const [verificationAttempts, setVerificationAttempts] = useState(0);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Prevent infinite verification loops
                if (verificationAttempts >= 2) {
                    console.log('⚠️ Too many verification attempts, clearing auth');
                    authService.clearAuth();
                    setIsAuthenticated(false);
                    setIsLoading(false);
                    return;
                }

                // FIXED: Add small delay to allow token storage to complete
                await new Promise(resolve => setTimeout(resolve, 100));

                const token = authService.getAccessToken();
                const user = authService.getUser();
                
                console.log('🔍 Auth check:', { 
                    hasToken: !!token, 
                    hasUser: !!user,
                    tokenStart: token?.substring(0, 20) + '...',
                    attempts: verificationAttempts
                });
                
                if (!token || !user) {
                    console.log('🔓 No token or user found');
                    setIsAuthenticated(false);
                    setIsLoading(false);
                    return;
                }

                // FIXED: More detailed token verification with better error handling
                try {
                    const backendUrl = import.meta.env.VITE_BACKEND_URL;
                    console.log('🌐 Verifying token with:', backendUrl);
                    
                    const response = await fetch(`${backendUrl}/api/auth/verify`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        }
                    });

                    console.log('🔐 Token verification response:', {
                        status: response.status,
                        ok: response.ok,
                        url: response.url
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Token verification successful:', data.user?.username);
                        setIsAuthenticated(true);
                    } else {
                        // FIXED: Handle specific error cases
                        const errorText = await response.text();
                        console.log('❌ Token verification failed:', {
                            status: response.status,
                            statusText: response.statusText,
                            body: errorText
                        });
                        
                        if (response.status === 401) {
                            console.log('🔄 Token expired or invalid, will try refresh...');
                            
                            // Try to refresh token before giving up
                            try {
                                const refreshResult = await authService.refreshTokenSilently();
                                if (refreshResult) {
                                    console.log('✅ Token refresh successful, retrying verification...');
                                    setVerificationAttempts(prev => prev + 1);
                                    return; // This will trigger useEffect again
                                }
                            } catch (refreshError) {
                                console.log('❌ Token refresh failed:', refreshError);
                            }
                        }
                        
                        // If we get here, auth failed
                        authService.clearAuth();
                        setVerificationAttempts(prev => prev + 1);
                        setIsAuthenticated(false);
                    }
                } catch (networkError) {
                    console.error('💥 Network error during token verification:', networkError);
                    
                    // On network errors, don't immediately clear auth - user might be offline
                    // Just increment attempts and retry
                    setVerificationAttempts(prev => prev + 1);
                    
                    if (verificationAttempts >= 1) {
                        console.log('🌐 Network issues persist, clearing auth');
                        authService.clearAuth();
                        setIsAuthenticated(false);
                    } else {
                        // Give benefit of doubt on first network error
                        setIsAuthenticated(false);
                    }
                }
            } catch (error) {
                console.error('💥 Auth verification error:', error);
                setVerificationAttempts(prev => prev + 1);
                setIsAuthenticated(false);
                
                if (verificationAttempts >= 1) {
                    authService.clearAuth();
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [verificationAttempts]); // Re-run when attempts change

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/70">Verifying authentication...</p>
                    {verificationAttempts > 0 && (
                        <p className="text-white/50 text-sm mt-2">
                            Attempt {verificationAttempts}/2
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        console.log('🚪 Redirecting to login - not authenticated');
        return <Navigate to="/login" replace />;
    }

    // If authenticated, render the protected content
    console.log('✅ Rendering protected content');
    return children;
};