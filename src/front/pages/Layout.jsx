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

    // Your existing useEffect hooks are preserved. No changes needed here.
    useEffect(() => {
        console.log('🏗️ Layout mounted, injecting dispatch into authService...');
        authService.setDispatch(dispatch);
        console.log('🏗️ Layout - Current store state:', {
            hasUser: !!store?.user,
            isAuthenticated: store?.isAuthenticated,
            authLoading: store?.authLoading,
            hasToken: !!store?.token
        });
    }, [dispatch]);

    useEffect(() => {
        console.log('🏗️ Layout - Store updated:', {
            hasUser: !!store?.user,
            isAuthenticated: store?.isAuthenticated,
            authLoading: store?.authLoading,
            hasToken: !!store?.token
        });
    }, [store?.user, store?.isAuthenticated, store?.authLoading, store?.token]);

    return (
        <div className="flex flex-col min-h-screen">

            {/* --- 2. ADD THE TOASTER COMPONENT --- */}
            {/* This makes toast notifications work everywhere in your app. */}
            <Toaster 
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                    className: 'bg-slate-700 text-white shadow-lg',
                    duration: 5000,
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