import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes.jsx';
import { StoreProvider } from './hooks/useGlobalReducer.jsx';
import { Toaster } from 'react-hot-toast';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Get the root element
const container = document.getElementById('root');

// Only create root if it doesn't exist
let root;
if (!container._reactRoot) {
    root = createRoot(container);
    container._reactRoot = root;
} else {
    root = container._reactRoot;
}

// Render the app
root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <StoreProvider>
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
            </StoreProvider>
        </ErrorBoundary>
    </React.StrictMode>
);