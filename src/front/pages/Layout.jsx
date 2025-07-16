// src/front/pages/Layout.jsx - FIXED to prevent authentication checking loops

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
    
    // CRITICAL FIX: Use ref to prevent multiple initializations
    const initializationRef = useRef(false);
    const lastLocationRef = useRef(location.pathname);

    // CRITICAL FIX: Single initialization effect that only runs once
    useEffect(() => {
        if (initializationRef.current) {
            console.log('🏗️ Layout: Already initialized, skipping...');
            return;
        }

        console.log('🏗️ Layout: Starting one-time initialization...');
        initializationRef.current = true;

        const initializeAuth = async () => {
            try {
                console.log('💉 Injecting dispatch into authService...');
                await authService.setDispatch(dispatch);
                console.log('✅ Layout initialization complete');
            } catch (error) {
                console.error('❌ Layout initialization error:', error);
                if (dispatch) {
                    dispatch({ type: 'logout' });
                    dispatch({ type: 'set_loading', payload: false });
                }
            }
        };

        initializeAuth();
    }, []); // CRITICAL: Empty dependency array - only run once

    // CRITICAL FIX: Separate effect for handling route changes and pending invites only
    useEffect(() => {
        // Only process if initialization is complete
        if (!initializationRef.current) return;

        // Only handle location changes, not auth state changes
        if (lastLocationRef.current !== location.pathname) {
            console.log('🗺️ Layout: Route changed from', lastLocationRef.current, 'to', location.pathname);
            lastLocationRef.current = location.pathname;

            // Handle pending invites only on route change when user is authenticated
            if (store?.isAuthenticated && !store?.authLoading && authService.authCheckCompleted) {
                const pendingInvite = sessionStorage.getItem('pending_invite');
                if (pendingInvite) {
                    console.log('🎫 Processing pending invite after route change:', pendingInvite);
                    sessionStorage.removeItem('pending_invite');
                    
                    // Small delay to ensure navigation is complete
                    setTimeout(() => {
                        window.location.href = `/join/${pendingInvite}`;
                    }, 100);
                }
            }
        }
    }, [location.pathname, store?.isAuthenticated]); // Only depend on route and auth status

    // REMOVED: All the conflicting authentication monitoring effects that were causing loops

    return (
        <div className="flex flex-col min-h-screen">
            {/* Enhanced Gaming-themed Toaster */}
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