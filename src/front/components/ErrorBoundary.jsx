// src/front/components/ErrorBoundary.jsx - PHASE 5 IMPLEMENTATION: Uses standardized ErrorState

import React from 'react';
// 🚀 PHASE 5: Import standardized error component
import { PageErrorState } from './ErrorState';

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
        // 🚀 PHASE 5: Enhanced error logging
        console.group('🚨 Error caught by ErrorBoundary');
        console.error('Error:', error);
        console.error('Error info:', errorInfo);
        console.error('Component stack:', errorInfo.componentStack);
        console.error('Error stack:', error.stack);
        console.groupEnd();
        
        // Update state with error details
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // 🚀 PHASE 5: Optional: Send error to logging service
        // Example: logErrorToService(error, errorInfo);
        try {
            // You could integrate with error tracking services here
            // Sentry.captureException(error, { contexts: { react: errorInfo } });
        } catch (loggingError) {
            console.warn('Failed to log error to external service:', loggingError);
        }
    }

    handleReload = () => {
        // 🚀 PHASE 5: Clear error state and reload
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleGoHome = () => {
        // 🚀 PHASE 5: Clear error state and navigate
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.href = '/';
    };

    handleReset = () => {
        // 🚀 PHASE 5: Reset error boundary state without full reload
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // 🚀 PHASE 5: Use standardized PageErrorState component
            return (
                <PageErrorState 
                    title="Oops! Something went wrong"
                    message="The gaming squad encountered an unexpected error. Don't worry, your data is safe and this is just a temporary glitch."
                    icon="💥"
                    onRetry={this.handleReload}
                    onGoHome={this.handleGoHome}
                    retryText="Reload App"
                    backText="Go Home"
                    size="large"
                    details={import.meta.env.DEV ? {
                        error: this.state.error?.toString(),
                        componentStack: this.state.errorInfo?.componentStack,
                        errorStack: this.state.error?.stack
                    } : null}
                    helpText="If this keeps happening, try clearing your browser cache or refreshing the page."
                    errorCode="BOUNDARY_001"
                    actionLayout="horizontal"
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
