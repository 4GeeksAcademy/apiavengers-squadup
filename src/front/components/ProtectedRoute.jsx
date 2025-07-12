import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom'; // ✅ Import Navigate for proper redirection

export const ProtectedRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading state
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                
                if (!token) {
                    setIsAuthenticated(false);
                    return; // Exit early
                }

                // Verify token with the backend
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                const response = await fetch(`${backendUrl}/api/auth/verify`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                });

                if (response.ok) {
                    setIsAuthenticated(true);
                } else {
                    // Token is invalid, so remove it
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('token');
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Auth verification failed:', error);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    // While checking authentication, show a loading indicator
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/70">Verifying authentication...</p>
                </div>
            </div>
        );
    }

    // ✅ FIXED: If not authenticated, redirect using the Navigate component
    if (!isAuthenticated) {
        // This handles redirection within the React Router ecosystem without a full page reload.
        return <Navigate to="/login" replace />;
    }

    // If authenticated, render the protected content
    return children;
};