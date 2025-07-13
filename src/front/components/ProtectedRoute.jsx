import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
// REVISED: We now ONLY import the authService.
// We CANNOT use hooks in this file because of the application's architecture.
import authService from '../store/authService';

export const ProtectedRoute = ({ children }) => {
    const location = useLocation();

    // REVISED: The check is now a simple, synchronous call to our authService.
    // This is reliable and does not use any hooks.
    const isAuthenticated = authService.isAuthenticated();

    // If the user is NOT authenticated, redirect them to the login page.
    // We pass the current location so we can redirect them back after they log in.
    if (!isAuthenticated) {
        console.log('🚪 ProtectedRoute: Not authenticated. Redirecting to login.');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If the user IS authenticated, render the child component (e.g., Dashboard, Profile).
    console.log('✅ ProtectedRoute: Authenticated. Rendering protected content.');
    return children;
};