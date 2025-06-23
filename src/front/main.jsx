// src/front/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// CHANGE: Import the tools for routing
import { RouterProvider } from "react-router-dom";
import { router } from "./routes.jsx"; // This file defines your pages

// CHANGE: We no longer need to import App.jsx

// Import your custom store provider and helper component
import { StoreProvider } from './hooks/useGlobalReducer.jsx';
import { BackendURL } from './components/BackendURL.jsx';

const Main = () => {
    // Check if the backend URL is configured in your .env file
    if (!import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BACKEND_URL === "") {
        return (
            <React.StrictMode>
                <BackendURL />
            </React.StrictMode>
        );
    }
    
    // If configured, render the main app
    return (
        <React.StrictMode>
            <StoreProvider>
                {/* CHANGE: Replace <App /> with the RouterProvider */}
                <RouterProvider router={router} />
            </StoreProvider>
        </React.StrictMode>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Main />);