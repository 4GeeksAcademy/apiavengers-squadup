// src/front/pages/Layout.jsx - FINAL FIX for authentication loops

import React, { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Footer } from "../components/Footer";
import useGlobalReducer from "../hooks/useGlobalReducer";
import authService from "../store/authService";
import { Toaster } from "react-hot-toast";

export const Layout = () => {
    const { store, dispatch } = useGlobalReducer();
    const location = useLocation();
    
    // 🔧 CRITICAL FIX: Prevent multiple initialization attempts
    const hasInitialized = useRef(false);
    const isInitializing = useRef(false);

    // 🔧 CRITICAL FIX: Only initialize ONCE on mount
    useEffect(() => {
        // Prevent multiple initialization attempts
        if (hasInitialized.current || isInitializing.current) {
            console.log('🏗️ Layout: Already initialized or initializing, skipping...');
            return;
        }

        // Check if authService already completed its check
        if (authService.authCheckCompleted) {
            console.log('🏗️ Layout: AuthService already completed, marking as initialized');
            hasInitialized.current = true;
            return;
        }

        console.log('🏗️ Layout: Starting ONE-TIME authentication initialization...');
        isInitializing.current = true;

        const initializeAuth = async () => {
            try {
                // Only inject dispatch if not already done
                if (!authService.dispatch) {
                    console.log('💉 Injecting dispatch into authService...');
                    await authService.setDispatch(dispatch);
                } else {
                    console.log('💉 Dispatch already injected, skipping...');
                }
                
                console.log('✅ Layout authentication initialization complete');
            } catch (error) {
                console.error('❌ Layout initialization error:', error);
                // Don't clear auth on initialization errors - let the user try to login
            } finally {
                hasInitialized.current = true;
                isInitializing.current = false;
            }
        };

        initializeAuth();
    }, []); // 🔧 CRITICAL: Empty dependency array - only run once

    // 🔧 Handle pending invites separately (no auth dependency)
    useEffect(() => {
        // Only handle pending invites when user is authenticated and not loading
        if (store?.isAuthenticated && !store?.authLoading) {
            const pendingInvite = sessionStorage.getItem('pending_invite');
            if (pendingInvite) {
                console.log('🎫 Processing pending invite:', pendingInvite);
                sessionStorage.removeItem('pending_invite');
                
                // Small delay to ensure navigation is complete
                setTimeout(() => {
                    window.location.href = `/join/${pendingInvite}`;
                }, 100);
            }
        }
    }, [store?.isAuthenticated, store?.authLoading]);

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