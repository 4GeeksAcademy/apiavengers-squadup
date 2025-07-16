import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes.jsx';
import { StoreProvider } from './hooks/useGlobalReducer.jsx';
import { Toaster } from 'react-hot-toast';
import { BackendURL } from './components/BackendURL.jsx';
import { AuthBootstrap } from './components/AuthBootstrap.jsx';
import './index.css';

// Get the root element
const container = document.getElementById('root');

// Create the root
const root = createRoot(container);

const Main = () => {
    // Check if the backend URL is configured in your .env file
    if (!import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BACKEND_URL === "") {
        return (
            <React.StrictMode>
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                    <BackendURL />
                </div>
            </React.StrictMode>
        );
    }

    // If configured, render the main app with optimized providers
    return (
        <React.StrictMode>
            <StoreProvider>
                <AuthBootstrap>
                    <RouterProvider router={router} />
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: '#1e293b',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }
                        }}
                    />
                </AuthBootstrap>
            </StoreProvider>
        </React.StrictMode>
    );
}

// Render the app
root.render(<Main />);

