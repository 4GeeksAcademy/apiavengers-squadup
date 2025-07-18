// src/front/components/ErrorState.jsx - Standardized Error Component for Phase 5

import React from 'react';

const ErrorState = ({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  icon = "⚠️",
  onRetry = null,
  onGoBack = null,
  onRefresh = null,
  retryText = "Try Again",
  backText = "Go Back", 
  refreshText = "Refresh Page",
  size = "normal", // "small", "normal", "large"
  variant = "glass", // "glass", "solid", "minimal"
  severity = "error", // "error", "warning", "info"
  className = "",
  showIcon = true,
  actionLayout = "horizontal", // "horizontal", "vertical", "stacked"
  details = null, // Additional error details for developers
  helpText = null, // User-friendly help text
  errorCode = null
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      container: "p-4 max-w-sm",
      icon: "text-3xl",
      title: "text-lg",
      message: "text-sm",
      button: "px-4 py-2 text-sm"
    },
    normal: {
      container: "p-8 max-w-md",
      icon: "text-6xl",
      title: "text-2xl",
      message: "text-base",
      button: "px-6 py-3 text-sm"
    },
    large: {
      container: "p-12 max-w-lg",
      icon: "text-8xl",
      title: "text-3xl",
      message: "text-lg",
      button: "px-8 py-4 text-base"
    }
  };

  // Variant configurations
  const variantConfig = {
    glass: "backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl",
    solid: "bg-slate-800 border border-slate-700 rounded-2xl shadow-xl",
    minimal: "bg-transparent"
  };

  // Severity configurations
  const severityConfig = {
    error: {
      borderColor: "border-red-500/30",
      bgColor: "bg-red-500/10",
      textColor: "text-red-300",
      iconColor: "text-red-400",
      primaryButton: "bg-red-500 hover:bg-red-600"
    },
    warning: {
      borderColor: "border-yellow-500/30", 
      bgColor: "bg-yellow-500/10",
      textColor: "text-yellow-300",
      iconColor: "text-yellow-400",
      primaryButton: "bg-yellow-500 hover:bg-yellow-600"
    },
    info: {
      borderColor: "border-blue-500/30",
      bgColor: "bg-blue-500/10", 
      textColor: "text-blue-300",
      iconColor: "text-blue-400",
      primaryButton: "bg-blue-500 hover:bg-blue-600"
    }
  };

  const currentSize = sizeConfig[size] || sizeConfig.normal;
  const currentVariant = variantConfig[variant] || variantConfig.glass;
  const currentSeverity = severityConfig[severity] || severityConfig.error;

  // Button layout configurations
  const layoutConfig = {
    horizontal: "flex flex-row gap-3",
    vertical: "flex flex-col gap-3", 
    stacked: "space-y-3"
  };

  const currentLayout = layoutConfig[actionLayout] || layoutConfig.horizontal;

  // Count available actions
  const actions = [onRetry, onGoBack, onRefresh].filter(Boolean);
  const hasActions = actions.length > 0;

  return (
    <div className={`${currentVariant} ${currentSize.container} text-center mx-auto ${className}`}>
      {/* Icon */}
      {showIcon && (
        <div className={`${currentSize.icon} mb-4 ${currentSeverity.iconColor}`}>
          {icon}
        </div>
      )}

      {/* Title */}
      <h2 className={`${currentSize.title} font-bold text-white mb-4`}>
        {title}
      </h2>

      {/* Error Code */}
      {errorCode && (
        <div className="mb-3">
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/60 font-mono">
            Error {errorCode}
          </span>
        </div>
      )}

      {/* Main Message */}
      <p className="text-white/70 mb-6 leading-relaxed">
        {message}
      </p>

      {/* Help Text */}
      {helpText && (
        <div className={`mb-6 p-4 ${currentSeverity.bgColor} ${currentSeverity.borderColor} border rounded-xl`}>
          <p className={`${currentSeverity.textColor} text-sm`}>
            💡 {helpText}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {hasActions && (
        <div className={`${currentLayout} ${actionLayout === 'stacked' ? '' : 'justify-center'} mb-4`}>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`${currentSize.button} ${currentSeverity.primaryButton} text-white font-semibold rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg`}
            >
              🔄 {retryText}
            </button>
          )}
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`${currentSize.button} bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-colors duration-200`}
            >
              🔄 {refreshText}
            </button>
          )}
          
          {onGoBack && (
            <button
              onClick={onGoBack}
              className={`${currentSize.button} bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200`}
            >
              ← {backText}
            </button>
          )}
        </div>
      )}

      {/* Developer Details */}
      {details && import.meta.env.DEV && (
        <details className="mt-6 text-left">
          <summary className="text-white/60 text-sm cursor-pointer hover:text-white transition-colors">
            🔧 Developer Info
          </summary>
          <div className="mt-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-xs font-mono">
            <pre className="whitespace-pre-wrap overflow-x-auto">
              {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
};

// Specialized error components for common use cases
export const PageErrorState = ({ 
  title = "Page Error", 
  message, 
  onRetry, 
  onGoHome 
}) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
    <ErrorState
      title={title}
      message={message}
      onRetry={onRetry}
      onGoBack={onGoHome}
      backText="Go Home"
      size="large"
      variant="glass"
    />
  </div>
);

export const NetworkErrorState = ({ onRetry, onRefresh }) => (
  <ErrorState
    title="Connection Error"
    message="Unable to connect to the server. Please check your internet connection and try again."
    icon="📡"
    onRetry={onRetry}
    onRefresh={onRefresh}
    severity="warning"
    helpText="This usually resolves itself within a few moments. If the problem persists, try refreshing the page."
  />
);

export const AuthErrorState = ({ onLogin, onGoHome }) => (
  <ErrorState
    title="Authentication Required"
    message="Your session has expired or you don't have permission to access this content."
    icon="🔐"
    onRetry={onLogin}
    onGoBack={onGoHome}
    retryText="Log In"
    backText="Go Home"
    severity="warning"
    helpText="Please log in to continue using SquadUp features."
  />
);

export const NotFoundErrorState = ({ onGoBack, onGoHome }) => (
  <ErrorState
    title="Not Found"
    message="The page or content you're looking for doesn't exist or has been moved."
    icon="🔍"
    onGoBack={onGoBack}
    onRefresh={onGoHome}
    backText="Go Back"
    refreshText="Go Home"
    severity="info"
    helpText="Double-check the URL or use the navigation menu to find what you're looking for."
  />
);

export const PermissionErrorState = ({ onGoBack, onGoHome }) => (
  <ErrorState
    title="Access Denied"
    message="You don't have permission to access this content."
    icon="🚫"
    onGoBack={onGoBack}
    onRefresh={onGoHome}
    backText="Go Back"
    refreshText="Go Home"
    severity="warning"
    helpText="Contact the group owner if you believe you should have access."
  />
);

// Gaming-specific error states
export const SteamErrorState = ({ error, onRetry, onSkip }) => (
  <ErrorState
    title="Steam Connection Error"
    message={error || "Failed to connect to Steam. Please try again."}
    icon="🎮"
    onRetry={onRetry}
    onGoBack={onSkip}
    retryText="Retry Steam Connection"
    backText="Skip for Now"
    severity="warning"
    helpText="Make sure Steam is running and your profile is public, or try connecting manually with your Steam ID."
  />
);

export const GroupErrorState = ({ error, onRetry, onGoHome }) => (
  <ErrorState
    title="Group Error"
    message={error || "Failed to load group data."}
    icon="👥"
    onRetry={onRetry}
    onGoBack={onGoHome}
    backText="Back to Dashboard"
    severity="error"
    helpText="The group may have been deleted or you may no longer have access."
  />
);

export const VotingErrorState = ({ error, onRetry, onGoBack }) => (
  <ErrorState
    title="Voting Session Error"
    message={error || "Failed to load voting session."}
    icon="🗳️"
    onRetry={onRetry}
    onGoBack={onGoBack}
    severity="error"
    helpText="The voting session may have ended or there may be a connection issue."
  />
);

export const ValidationErrorState = ({ errors = [], onGoBack }) => (
  <ErrorState
    title="Invalid Data"
    message="Please correct the following issues:"
    icon="📝"
    onGoBack={onGoBack}
    severity="warning"
    details={
      <ul className="list-disc list-inside space-y-1 mt-2">
        {errors.map((error, index) => (
          <li key={index} className="text-sm">{error}</li>
        ))}
      </ul>
    }
  />
);

export default ErrorState;