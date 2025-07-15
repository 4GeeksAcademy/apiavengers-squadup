// src/front/pages/Layout.jsx - CORRECTED VERSION with fixed initialization logic

import React, { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import useGlobalReducer from "../hooks/useGlobalReducer";
import authService from "../store/authService";
import { Toaster } from "react-hot-toast";

export const Layout = () => {
    const { store, dispatch } = useGlobalReducer();
    const layoutInitialized = useRef(false);
    const dispatchInjected = useRef(false);

    // FIXED: Single initialization effect that runs only once
    useEffect(() => {
        if (layoutInitialized.current) return;
        
        console.log('🏗️ Layout mounted, initializing...');
        layoutInitialized.current = true;
        
        // Inject dispatch only once
        if (!dispatchInjected.current) {
            console.log('💉 Injecting dispatch into authService...');
            authService.setDispatch(dispatch);
            dispatchInjected.current = true;
        }
        
        console.log('🏗️ Layout - Initial store state:', {
            hasUser: !!store?.user,
            isAuthenticated: store?.isAuthenticated,
            authLoading: store?.authLoading,
            hasToken: !!store?.token,
            authCheckCompleted: authService.authCheckCompleted
        });
        
        console.log('🏗️ Layout initialization complete');
    }, [dispatch]); // Only depend on dispatch, which is stable

    // ENHANCED: Separate effect for store state monitoring
    useEffect(() => {
        // Don't run until layout is initialized
        if (!layoutInitialized.current) return;
        
        console.log('🏗️ Layout - Store state changed:', {
            hasUser: !!store?.user,
            isAuthenticated: store?.isAuthenticated,
            authLoading: store?.authLoading,
            hasToken: !!store?.token,
            userName: store?.user?.username,
            authServiceAuth: authService.isAuthenticated(),
            authCheckCompleted: authService.authCheckCompleted
        });

        // ENHANCED: Detect and handle auth state mismatches
        const serviceAuth = authService.isAuthenticated();
        const storeAuth = store?.isAuthenticated;
        
        // Only attempt auto-fix if auth check is completed to avoid race conditions
        if (authService.authCheckCompleted && serviceAuth !== storeAuth) {
            console.warn('🚨 AUTH MISMATCH DETECTED!', {
                authService: serviceAuth,
                globalStore: storeAuth,
                recommendation: 'Attempting auto-fix...'
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
                }
            }
            // Auto-fix: If store says authenticated but authService doesn't agree
            else if (!serviceAuth && storeAuth) {
                console.log('🔧 Auto-fixing: Clearing store auth state');
                dispatch({ type: 'logout' });
            }
        }
    }, [store?.user, store?.isAuthenticated, store?.authLoading, store?.token, dispatch]);

    // ENHANCED: Handle pending invites after auth - separate effect for clarity
    useEffect(() => {
        // Only process pending invites when user is fully authenticated and not loading
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
                    // Custom styling for different toast types
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