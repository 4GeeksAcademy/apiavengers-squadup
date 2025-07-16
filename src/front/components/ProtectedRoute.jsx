import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';

const ProtectedRoute = ({ children }) => {
    const { store, dispatch } = useGlobalReducer();
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);
    const [authStatus, setAuthStatus] = useState(null);

    useEffect(() => {
        const verifyAuth = async () => {
            try {
                console.log('🔍 ProtectedRoute: Starting auth verification...');
                console.log('📋 Current store.user:', store.user);
                console.log('📋 Available authService methods:', Object.keys(authService));
                
                // Try multiple ways to get the token
                let token = null;
                
                // Method 1: Check if getToken exists
                if (typeof authService.getToken === 'function') {
                    token = authService.getToken();
                    console.log('✅ Got token via getToken()');
                }
                // Method 2: Check localStorage directly
                else {
                    token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('jwt_token');
                    console.log('✅ Got token from localStorage');
                }
                
                if (!token) {
                    console.log('❌ No token found, checking if user exists in store');
                    // If no token but user exists in store, might be a refresh
                    if (store.user && store.user.id) {
                        console.log('⚠️ No token but user in store, allowing access (might be refresh)');
                        setAuthStatus('authenticated');
                        setIsChecking(false);
                        return;
                    } else {
                        console.log('❌ No token and no user, redirecting to login');
                        setAuthStatus('unauthenticated');
                        setIsChecking(false);
                        return;
                    }
                }

                // Try to verify token with backend
                try {
                    const backendUrl = import.meta.env.VITE_BACKEND_URL;
                    let response;
                    
                    // Try using authService.authenticatedFetch if available
                    if (typeof authService.authenticatedFetch === 'function') {
                        response = await authService.authenticatedFetch(`${backendUrl}/api/auth/verify`);
                    }
                    // Otherwise use fetch with manual headers
                    else {
                        response = await fetch(`${backendUrl}/api/auth/verify`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                    }
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.valid && data.user) {
                            console.log('✅ Token verified, user authenticated:', data.user.username);
                            
                            // Update global store if needed
                            if (!store.user || store.user.id !== data.user.id) {
                                console.log('🔄 Updating global store with verified user data');
                                dispatch({ type: 'set_user', payload: data.user });
                            }
                            
                            setAuthStatus('authenticated');
                        } else {
                            console.log('❌ Token invalid, clearing auth state');
                            // Clear token using available method
                            if (typeof authService.logout === 'function') {
                                authService.logout();
                            } else {
                                localStorage.removeItem('token');
                                localStorage.removeItem('access_token');
                                localStorage.removeItem('jwt_token');
                            }
                            dispatch({ type: 'logout' });
                            setAuthStatus('unauthenticated');
                        }
                    } else {
                        console.log('❌ Token verification failed, status:', response.status);
                        // Clear auth state
                        if (typeof authService.logout === 'function') {
                            authService.logout();
                        } else {
                            localStorage.removeItem('token');
                            localStorage.removeItem('access_token');
                            localStorage.removeItem('jwt_token');
                        }
                        dispatch({ type: 'logout' });
                        setAuthStatus('unauthenticated');
                    }
                } catch (networkError) {
                    console.error('❌ Network error during auth verification:', networkError);
                    // If network fails but we have token and user, allow access
                    if (token && store.user) {
                        console.log('⚠️ Network error but have local auth, allowing access');
                        setAuthStatus('authenticated');
                    } else {
                        console.log('❌ Network error and no reliable local auth, redirecting');
                        setAuthStatus('unauthenticated');
                    }
                }
            } catch (error) {
                console.error('❌ Auth verification error:', error);
                // Fallback: if we have user in store, allow access
                if (store.user && store.user.id) {
                    console.log('⚠️ Error but user exists in store, allowing access');
                    setAuthStatus('authenticated');
                } else {
                    console.log('❌ Error and no user in store, redirecting');
                    setAuthStatus('unauthenticated');
                }
            } finally {
                setIsChecking(false);
            }
        };

        verifyAuth();
    }, [location.pathname]); // Only re-run when route changes

    // Show loading spinner while checking
    if (isChecking) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Verifying authentication...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (authStatus === 'unauthenticated') {
        console.log('🚪 Redirecting to login from:', location.pathname);
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // User is authenticated, render the protected content
    console.log('✅ Rendering protected content for:', store.user?.username);
    return children;
};

export { ProtectedRoute };
export default ProtectedRoute;
