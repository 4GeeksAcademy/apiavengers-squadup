// src/front/pages/Layout.jsx - IMPROVED VERSION

import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import useGlobalReducer from "../hooks/useGlobalReducer";
import authService from "../store/authService";

export const Layout = () => {
    const { store, dispatch } = useGlobalReducer();

    useEffect(() => {
        console.log('🏗️ Layout mounted, injecting dispatch into authService...');
        
        // Inject dispatch into authService
        authService.setDispatch(dispatch);
        
        // Log current state for debugging
        console.log('🏗️ Layout - Current store state:', {
            hasUser: !!store?.user,
            isAuthenticated: store?.isAuthenticated,
            authLoading: store?.authLoading,
            hasToken: !!store?.token
        });
        
    }, [dispatch]); // Only run when dispatch changes

    // Additional debug log on store changes
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
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};