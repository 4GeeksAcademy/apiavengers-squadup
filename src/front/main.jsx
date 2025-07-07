// src/front/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';

// Import CSS FIRST - this is critical for styling to work
import './index.css';

// Import routing tools
import { RouterProvider } from "react-router-dom";
import { router } from "./routes.jsx";

// Import store provider with correct syntax
import { StoreProvider } from './hooks/useGlobalReducer.jsx';
import { BackendURL } from './components/BackendURL.jsx';
import { bootstrapAuth } from './store/actions';
import { AuthBootstrap } from './components/AuthBootstrap.jsx';

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
    
    // If configured, render the main app
    return (
        <React.StrictMode>
            <StoreProvider>
              <AuthBootstrap>
                <RouterProvider router={router} />
              </AuthBootstrap>
            </StoreProvider>
        </React.StrictMode>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Main />);