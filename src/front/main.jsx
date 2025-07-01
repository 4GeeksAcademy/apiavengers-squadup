import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import { RouterProvider } from "react-router-dom";
import { router } from "./routes.jsx";
import { StoreProvider } from './hooks/useGlobalReducer.jsx';
import { BackendURL } from './components/BackendURL.jsx';

const Main = () => {
    if (!import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BACKEND_URL === "") {
        return (
            <React.StrictMode>
                <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                    <BackendURL />
                </div>
            </React.StrictMode>
        );
    }
    
    return (
        <React.StrictMode>
            <StoreProvider>
                <RouterProvider router={router} />
            </StoreProvider>
        </React.StrictMode>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Main />);