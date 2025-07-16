// src/front/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null,
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error for debugging
        console.error('🚨 Error caught by ErrorBoundary:', error);
        console.error('🚨 Error info:', errorInfo);
        
        // Update state with error details
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Optional: Send error to logging service
        // Example: logErrorToService(error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-lg shadow-2xl">
                        <div className="text-6xl mb-6">💥</div>
                        <h1 className="text-3xl font-bold text-white mb-4">
                            Oops! Something went wrong
                        </h1>
                        <p className="text-white/80 mb-6 leading-relaxed">
                            The gaming squad encountered an unexpected error. Don't worry, 
                            your data is safe and this is just a temporary glitch.
                        </p>
                        
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button 
                                    onClick={this.handleReload}
                                    className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg"
                                >
                                    🔄 Reload App
                                </button>
                                <button 
                                    onClick={this.handleGoHome}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300"
                                >
                                    🏠 Go Home
                                </button>
                            </div>
                            
                            {/* Developer Info - Only show in development */}
                            {import.meta.env.DEV && this.state.error && (
                                <details className="mt-6 text-left">
                                    <summary className="text-white/60 text-sm cursor-pointer hover:text-white transition-colors">
                                        🔧 Developer Info
                                    </summary>
                                    <div className="mt-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-xs font-mono">
                                        <div className="mb-2">
                                            <strong>Error:</strong> {this.state.error.toString()}
                                        </div>
                                        {this.state.errorInfo && (
                                            <div>
                                                <strong>Component Stack:</strong>
                                                <pre className="mt-1 whitespace-pre-wrap">
                                                    {this.state.errorInfo.componentStack}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            )}
                            
                            <div className="text-white/50 text-sm">
                                If this keeps happening, try clearing your browser cache or contact support.
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

// Also update your main.jsx to wrap the app:
/*
import ErrorBoundary from './components/ErrorBoundary';

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
*/