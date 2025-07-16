// src/front/pages/Layout.jsx - IMPROVED VERSION with better auth flow
import React, { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import useGlobalReducer from "../hooks/useGlobalReducer";
import authService from "../store/authService";
import { Toaster } from "react-hot-toast";

export const Layout = () => {
    const { store, dispatch } = useGlobalReducer();
    const location = useLocation();
    const initializationRef = useRef(false);

    // CRITICAL FIX: Single initialization that only runs once
    useEffect(() => {
        if (initializationRef.current) {
            console.log('🏗️ Layout: Already initialized, skipping...');
            return;
        }

        console.log('🏗️ Layout: Starting initialization...');
        initializationRef.current = true;

        const initializeAuth = async () => {
            try {
                // Inject dispatch and wait for auth check to complete
                console.log('💉 Injecting dispatch into authService...');
                await authService.setDispatch(dispatch);
                
                console.log('✅ Layout initialization complete');
            } catch (error) {
                console.error('❌ Layout initialization error:', error);
                // On initialization error, clear auth to be safe
                if (dispatch) {
                    dispatch({ type: 'logout' });
                    dispatch({ type: 'set_loading', payload: false });
                }
            }
        };

        initializeAuth();
    }, []); // Empty dependency array - only run once

    // IMPROVED: Separate effect for monitoring auth state
    useEffect(() => {
        if (!initializationRef.current) return;

        // Skip auth monitoring for public pages
        const publicPaths = ['/demo', '/', '/login', '/signup'];
        const isPublicPath = publicPaths.some(path => 
            location.pathname === path || location.pathname.startsWith(path + '/')
        );
        
        if (isPublicPath) {
            console.log('📍 Layout: Public page, skipping auth monitoring:', location.pathname);
            return;
        }

        console.log('🏗️ Layout: Monitoring auth state for protected route:', location.pathname);
        
        // Log current auth state for debugging
        console.log('🔍 Layout: Current auth state:', {
            hasUser: !!store?.user,
            isAuthenticated: store?.isAuthenticated,
            authLoading: store?.authLoading,
            userName: store?.user?.username,
            authServiceAuth: authService.isAuthenticated(),
            authCheckCompleted: authService.authCheckCompleted,
            pathname: location.pathname
        });

        // IMPROVED: Handle auth state mismatches more carefully
        const serviceAuth = authService.isAuthenticated();
        const storeAuth = store?.isAuthenticated;
        
        // Only attempt to fix mismatches if auth check is completed
        if (authService.authCheckCompleted && serviceAuth !== storeAuth) {
            console.warn('🚨 AUTH MISMATCH DETECTED!', {
                authService: serviceAuth,
                globalStore: storeAuth,
                willAttemptFix: true
            });
            
            // Auto-fix: If authService says authenticated but store doesn't agree
            if (serviceAuth && !storeAuth) {
                const user = authService.getCurrentUser();
                const token = authService.getAccessToken();
                
                if (user && token) {
                    console.log('🔧 Auto-fixing: Setting store to authenticated state');
                    dispatch({
                        type: 'login_success',
                        payload: { user, token, refreshToken: authService.getRefreshToken() }
                    });
                } else {
                    console.log('🔧 Auto-fixing: AuthService state is inconsistent, clearing it');
                    authService.clearAuth();
                }
            }
            // Auto-fix: If store says authenticated but authService doesn't agree
            else if (!serviceAuth && storeAuth) {
                console.log('🔧 Auto-fixing: Clearing store auth state');
                dispatch({ type: 'logout' });
            }
        }
    }, [store?.user, store?.isAuthenticated, store?.authLoading, dispatch, location.pathname]);

    // IMPROVED: Handle pending invites more robustly
    useEffect(() => {
        // Only process pending invites when user is fully authenticated
        if (store?.isAuthenticated && !store?.authLoading && authService.authCheckCompleted) {
            const pendingInvite = sessionStorage.getItem('pending_invite');
            if (pendingInvite) {
                console.log('🎫 Processing pending invite after auth:', pendingInvite);
                sessionStorage.removeItem('pending_invite');
                
                // Small delay to ensure state is fully settled
                setTimeout(() => {
                    window.location.href = `/join/${pendingInvite}`;
                }, 100);
            }
        }
    }, [store?.isAuthenticated, store?.authLoading]);

    return (
        <div className="flex flex-col min-h-screen">
            {/* ENHANCED: Gaming-themed Toaster with better styling */}
            <Toaster 
                position="top-center"
                reverseOrder={false}
                gutter={8}
                containerClassName="z-[9999]"
                toastOptions={{
                    className: 'bg-slate-800 text-white shadow-2xl border border-slate-600',
                    duration: 5000,
                    style: {
                        background: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        borderRadius: '16px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '500',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                        maxWidth: '500px'
                    },
                    success: {
                        style: {
                            background: 'rgba(34, 197, 94, 0.95)',
                            border: '1px solid rgba(34, 197, 94, 0.5)',
                            boxShadow: '0 20px 50px rgba(34, 197, 94, 0.3), 0 0 0 1px rgba(34, 197, 94, 0.1) inset'
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: 'rgba(34, 197, 94, 0.95)'
                        }
                    },
                    error: {
                        style: {
                            background: 'rgba(239, 68, 68, 0.95)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            boxShadow: '0 20px 50px rgba(239, 68, 68, 0.3), 0 0 0 1px rgba(239, 68, 68, 0.1) inset'
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: 'rgba(239, 68, 68, 0.95)'
                        }
                    },
                    loading: {
                        style: {
                            background: 'rgba(59, 130, 246, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.5)',
                            boxShadow: '0 20px 50px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1) inset'
                        }
                    }
                }}
            />

            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};