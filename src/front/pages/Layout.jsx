// src/front/pages/Layout.jsx - FIXED VERSION with NavbarDebug

import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Footer } from "../components/Footer";
import PerformanceMonitoringDashboard from "../components/PerformanceMonitoringDashboard";
import useGlobalReducer from "../hooks/useGlobalReducer";
import authService from "../store/authService";
import { Toaster } from "react-hot-toast";
import { 
    isAuthorizedForPerformanceMonitor, 
    getPerformanceAccessLevel,
    logPerformanceAccess 
} from "../utils/performanceAccess";

// 🐛 DEBUG: Import the debug component (only shows in development)
import NavbarDebug from "../components/NavbarDebug";

export const Layout = () => {
    const { store, dispatch } = useGlobalReducer();
    const location = useLocation();
    
    // 🔧 CRITICAL FIX: Prevent multiple initialization attempts
    const hasInitialized = useRef(false);
    const isInitializing = useRef(false);

    // Performance Monitor state - SECURED
    const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

    // 🔒 SECURITY: Get user's performance access level
    const user = store?.user;
    const hasPerformanceAccess = isAuthorizedForPerformanceMonitor(user);
    const accessLevel = getPerformanceAccessLevel(user);

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

    // 🔒 SECURED Performance Monitor keyboard shortcut
    useEffect(() => {
        const handleKeyPress = (event) => {
            // Press Ctrl+Shift+P to toggle performance monitor
            if (event.ctrlKey && event.shiftKey && event.key === 'P') {
                event.preventDefault();
                
                // 🔒 SECURITY CHECK: Only allow authorized users
                if (hasPerformanceAccess) {
                    setShowPerformanceMonitor(prev => !prev);
                    logPerformanceAccess(user, 'keyboard_toggle');
                } else {
                    console.warn('🔒 Performance monitor access denied - insufficient permissions');
                    logPerformanceAccess(user, 'access_denied_keyboard');
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [hasPerformanceAccess, user]);

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

    // 🔒 SECURED: Performance monitor toggle handler
    const handlePerformanceToggle = () => {
        if (hasPerformanceAccess) {
            setShowPerformanceMonitor(!showPerformanceMonitor);
            logPerformanceAccess(user, 'button_toggle');
        } else {
            console.warn('🔒 Performance monitor access denied');
            logPerformanceAccess(user, 'access_denied_button');
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* 🐛 DEBUG: Only shows in development */}
            {import.meta.env.DEV && <NavbarDebug />}
            
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

            {/* Fixed Navbar - Now using default import */}
            <Navbar />
            
            {/* Main content with proper spacing to account for fixed navbar */}
            <main className="flex-grow pt-24 pb-8">
                {/* pt-24 accounts for the fixed navbar (top-4 + navbar height + padding) */}
                <Outlet />
            </main>
            
            <Footer />

            {/* 🔒 SECURED: Performance Monitor Toggle Button - Only show to authorized users */}
            {hasPerformanceAccess && (
                <button 
                    onClick={handlePerformanceToggle}
                    className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-2xl z-40 transition-all duration-200 hover:scale-110"
                    title={`Performance Monitor (${accessLevel.toUpperCase()}) - Ctrl+Shift+P`}
                >
                    <span className="text-lg">📊</span>
                </button>
            )}

            {/* 🔒 SECURED: Performance Monitoring Dashboard - Only render for authorized users */}
            {hasPerformanceAccess && (
                <PerformanceMonitoringDashboard 
                    isVisible={showPerformanceMonitor} 
                    accessLevel={accessLevel}
                />
            )}
        </div>
    );
};