// src/front/main.jsx - Enhanced with Lazy Loading and Error Boundaries

import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes.jsx';
import { StoreProvider } from './hooks/useGlobalReducer.jsx';
import { Toaster } from 'react-hot-toast';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary.jsx';

/**
 * Global Suspense Fallback Component
 * Shows while lazy-loaded components are loading
 */
const GlobalSuspenseFallback = ({ message = "Loading component..." }) => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
            <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-white mb-2">{message}</h2>
            <p className="text-white/60 text-sm">Please wait while we load the component...</p>
        </div>
    </div>
);

/**
 * Component-specific Suspense Fallback
 * More lightweight for smaller component loads
 */
const ComponentSuspenseFallback = ({ componentName = "component" }) => (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-white/70 text-sm">Loading {componentName}...</p>
    </div>
);

/**
 * Enhanced Error Boundary for Lazy Loading
 */
class LazyLoadErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Lazy Load Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="backdrop-blur-xl bg-white/10 border border-red-500/30 rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-3">⚠️</div>
                    <h3 className="text-white font-bold mb-2">Component Failed to Load</h3>
                    <p className="text-white/70 text-sm mb-4">
                        There was an error loading this component.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg text-sm transition-colors"
                    >
                        Refresh Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Higher-order component for lazy loading with enhanced error handling
 */
const withLazyLoading = (importFn, componentName, fallbackComponent = null) => {
    const LazyComponent = React.lazy(importFn);
    
    return React.forwardRef((props, ref) => (
        <LazyLoadErrorBoundary>
            <Suspense fallback={
                fallbackComponent || 
                <ComponentSuspenseFallback componentName={componentName} />
            }>
                <LazyComponent ref={ref} {...props} />
            </Suspense>
        </LazyLoadErrorBoundary>
    ));
};

// Export the lazy loading helper for use in other files
window.withLazyLoading = withLazyLoading;
window.ComponentSuspenseFallback = ComponentSuspenseFallback;

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

// Render the app with enhanced error boundaries and suspense
root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <StoreProvider>
                <Suspense fallback={<GlobalSuspenseFallback message="Loading SquadUp..." />}>
                    <RouterProvider 
                        router={router} 
                        future={{
                            v7_startTransition: true
                        }}
                    />
                </Suspense>
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