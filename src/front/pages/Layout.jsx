// src/front/pages/Layout.jsx

import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import useGlobalReducer from "../hooks/useGlobalReducer";
import authService from "../store/authService";

// --- 1. ADD THE TOASTER IMPORT ---
import { Toaster } from "react-hot-toast";

export const Layout = () => {
    const { store, dispatch } = useGlobalReducer();

    // CRITICAL FIX: Enhanced auth initialization
    useEffect(() => {
        console.log('🏗️ Layout mounted, injecting dispatch into authService...');
        authService.setDispatch(dispatch);
        
        // ADDED: Force auth check if it hasn't completed yet
        if (!authService.authCheckCompleted) {
            console.log('🔄 Auth check not completed, triggering manual check...');
            authService.checkAuthOnStartup();
        }
        
        console.log('🏗️ Layout - Current store state:', {
            hasUser: !!store?.user,
            isAuthenticated: store?.isAuthenticated,
            authLoading: store?.authLoading,
            hasToken: !!store?.token,
            authCheckCompleted: authService.authCheckCompleted
        });
    }, [dispatch]);

    // Enhanced logging for debugging
    useEffect(() => {
        console.log('🏗️ Layout - Store updated:', {
            hasUser: !!store?.user,
            isAuthenticated: store?.isAuthenticated,
            authLoading: store?.authLoading,
            hasToken: !!store?.token,
            userName: store?.user?.username,
            authServiceAuth: authService.isAuthenticated(),
            authCheckCompleted: authService.authCheckCompleted
        });
    }, [store?.user, store?.isAuthenticated, store?.authLoading, store?.token]);

    return (
        <div className="flex flex-col min-h-screen">

            {/* --- 2. ENHANCED TOASTER COMPONENT --- */}
            <Toaster 
                position="top-center"
                reverseOrder={false}
                gutter={8}
                toastOptions={{
                    // Enhanced styling for gaming theme
                    className: 'bg-slate-800 text-white shadow-2xl border border-slate-600',
                    duration: 5000,
                    style: {
                        background: 'rgba(30, 41, 59, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '500',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                    },
                    // Custom styling for different toast types
                    success: {
                        style: {
                            background: 'rgba(34, 197, 94, 0.9)',
                            border: '1px solid rgba(34, 197, 94, 0.5)'
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: 'rgba(34, 197, 94, 0.9)'
                        }
                    },
                    error: {
                        style: {
                            background: 'rgba(239, 68, 68, 0.9)',
                            border: '1px solid rgba(239, 68, 68, 0.5)'
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: 'rgba(239, 68, 68, 0.9)'
                        }
                    },
                    loading: {
                        style: {
                            background: 'rgba(59, 130, 246, 0.9)',
                            border: '1px solid rgba(59, 130, 246, 0.5)'
                        }
                    }
                }}
            />

            {/* Your existing Navbar, Outlet, and Footer are unchanged. */}
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};