// src/front/components/ErrorState.jsx - MISSING COMPONENT CREATED

import React from 'react';

// ============================================================================
// PAGE ERROR STATE - Full page error display
// ============================================================================

export const PageErrorState = ({ 
  title = "Something went wrong",
  message = "We encountered an unexpected error. Please try again later.",
  actionText = "Try Again",
  onAction,
  showIcon = true,
  className = "" 
}) => {
  return (
    <div className={`min-h-screen flex items-center justify-center ${className}`}>
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        {showIcon && (
          <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        )}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-white/70 leading-relaxed">{message}</p>
        </div>
        {onAction && (
          <button
            onClick={onAction}
            className="btn-coral inline-flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{actionText}</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// NETWORK ERROR STATE - For connection issues
// ============================================================================

export const NetworkErrorState = ({ 
  title = "Connection Error",
  message = "Unable to connect to our servers. Please check your internet connection and try again.",
  onRetry,
  retryText = "Retry",
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-6 ${className}`}>
      <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.18l.09 15.64M2.18 12l15.64-.09" />
        </svg>
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-white/70">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-coral inline-flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{retryText}</span>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// NOT FOUND ERROR STATE - For 404 errors
// ============================================================================

export const NotFoundErrorState = ({ 
  title = "Page Not Found",
  message = "The page you're looking for doesn't exist or has been moved.",
  actionText = "Go Home",
  onAction,
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-6 ${className}`}>
      <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.463.64-6.291 1.76C7.19 15.394 9.34 14 12 14s4.81 1.394 6.291 2.76A7.962 7.962 0 0121 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-white/70">{message}</p>
      </div>
      {onAction && (
        <button
          onClick={onAction}
          className="btn-coral inline-flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// PERMISSION ERROR STATE - For access denied
// ============================================================================

export const PermissionErrorState = ({ 
  title = "Access Denied",
  message = "You don't have permission to view this content.",
  actionText = "Go Back",
  onAction,
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-6 ${className}`}>
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-white/70">{message}</p>
      </div>
      {onAction && (
        <button
          onClick={onAction}
          className="btn-coral inline-flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// STEAM ERROR STATE - For Steam-specific errors
// ============================================================================

export const SteamErrorState = ({ 
  title = "Steam Connection Error",
  message = "Unable to connect to Steam. Please check your Steam connection and try again.",
  onRetry,
  onConnect,
  isConnected = false,
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-6 ${className}`}>
      <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L19 6L17 7V9L15 8V10L17 11V13L19 12L21 13V11L23 10V8L21 9ZM3.5 6L5.5 7V9L7.5 8V10L5.5 11V13L3.5 12L1.5 13V11L0 10V8L1.5 9L3.5 6Z"/>
        </svg>
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-white/70">{message}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && isConnected && (
          <button
            onClick={onRetry}
            className="btn-coral inline-flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Retry Connection</span>
          </button>
        )}
        {onConnect && !isConnected && (
          <button
            onClick={onConnect}
            className="btn-marine inline-flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z"/>
            </svg>
            <span>Connect Steam</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EMPTY STATE - For when there's no data
// ============================================================================

export const EmptyState = ({ 
  title = "No data available",
  message = "There's nothing to show here yet.",
  actionText,
  onAction,
  icon = "inbox",
  className = "" 
}) => {
  const icons = {
    inbox: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    ),
    search: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
    games: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 011 1v1a2 2 0 104 0V4z" />
    ),
    users: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    )
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-6 ${className}`}>
      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icons[icon] || icons.inbox}
        </svg>
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-white/60">{message}</p>
      </div>
      {onAction && actionText && (
        <button
          onClick={onAction}
          className="btn-coral inline-flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// GAMING SPECIFIC ERROR STATES
// ============================================================================

export const GameLibraryErrorState = ({ 
  onSync,
  onConnect,
  isConnected = false,
  className = "" 
}) => {
  if (!isConnected) {
    return (
      <EmptyState
        title="Steam Not Connected"
        message="Connect your Steam account to view and sync your game library."
        actionText="Connect Steam"
        onAction={onConnect}
        icon="games"
        className={className}
      />
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-6 ${className}`}>
      <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z"/>
        </svg>
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-xl font-semibold text-white">No Games Found</h3>
        <p className="text-white/70">Your Steam library appears to be empty or hasn't been synced yet.</p>
      </div>
      {onSync && (
        <button
          onClick={onSync}
          className="btn-coral inline-flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Sync Steam Library</span>
        </button>
      )}
    </div>
  );
};

export const GroupErrorState = ({ 
  onCreateGroup,
  onJoinGroup,
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-6 ${className}`}>
      <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-xl font-semibold text-white">No Groups Yet</h3>
        <p className="text-white/70">Create or join a gaming group to start voting on games with friends.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {onCreateGroup && (
          <button
            onClick={onCreateGroup}
            className="btn-coral inline-flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Create Group</span>
          </button>
        )}
        {onJoinGroup && (
          <button
            onClick={onJoinGroup}
            className="btn-marine inline-flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>Join Group</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const VotingErrorState = ({ 
  title = "Voting Session Error",
  message = "Unable to load the voting session. Please try again.",
  onRetry,
  onGoBack,
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-6 ${className}`}>
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-white/70">{message}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-coral inline-flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Try Again</span>
          </button>
        )}
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="btn-ghost inline-flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Go Back</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// API ERROR STATE - For API-specific errors
// ============================================================================

export const ApiErrorState = ({ 
  error,
  onRetry,
  className = "" 
}) => {
  const getErrorMessage = (error) => {
    if (error?.response?.status === 404) {
      return {
        title: "Not Found",
        message: "The requested resource could not be found."
      };
    }
    if (error?.response?.status === 403) {
      return {
        title: "Access Denied",
        message: "You don't have permission to access this resource."
      };
    }
    if (error?.response?.status >= 500) {
      return {
        title: "Server Error",
        message: "Our servers are experiencing issues. Please try again later."
      };
    }
    if (error?.code === 'NETWORK_ERROR') {
      return {
        title: "Connection Error",
        message: "Unable to connect to our servers. Please check your internet connection."
      };
    }
    return {
      title: "Something went wrong",
      message: error?.message || "An unexpected error occurred. Please try again."
    };
  };

  const { title, message } = getErrorMessage(error);

  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-6 ${className}`}>
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-white/70">{message}</p>
        {error?.response?.data?.error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm font-mono">{error.response.data.error}</p>
          </div>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-coral inline-flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// INLINE ERROR STATE - For form errors and small errors
// ============================================================================

export const InlineErrorState = ({ 
  message,
  onDismiss,
  className = "" 
}) => {
  return (
    <div className={`flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg ${className}`}>
      <div className="flex items-center space-x-3">
        <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-400 text-sm">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// SUCCESS STATE - For positive confirmations
// ============================================================================

export const SuccessState = ({ 
  title = "Success!",
  message = "Your action was completed successfully.",
  actionText,
  onAction,
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-6 ${className}`}>
      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-white/70">{message}</p>
      </div>
      {onAction && actionText && (
        <button
          onClick={onAction}
          className="btn-coral inline-flex items-center space-x-2"
        >
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// DEFAULT ERROR STATE - Most commonly used
// ============================================================================

const ErrorState = ({ 
  type = "page",
  error,
  title,
  message,
  onRetry,
  onAction,
  actionText,
  className = "",
  ...props 
}) => {
  switch (type) {
    case "page":
      return (
        <PageErrorState 
          title={title} 
          message={message} 
          onAction={onRetry || onAction} 
          actionText={actionText}
          className={className} 
          {...props} 
        />
      );
    case "network":
      return (
        <NetworkErrorState 
          title={title} 
          message={message} 
          onRetry={onRetry} 
          className={className} 
          {...props} 
        />
      );
    case "404":
    case "notfound":
      return (
        <NotFoundErrorState 
          title={title} 
          message={message} 
          onAction={onAction} 
          actionText={actionText}
          className={className} 
          {...props} 
        />
      );
    case "403":
    case "permission":
      return (
        <PermissionErrorState 
          title={title} 
          message={message} 
          onAction={onAction} 
          actionText={actionText}
          className={className} 
          {...props} 
        />
      );
    case "steam":
      return (
        <SteamErrorState 
          title={title} 
          message={message} 
          onRetry={onRetry} 
          className={className} 
          {...props} 
        />
      );
    case "api":
      return (
        <ApiErrorState 
          error={error} 
          onRetry={onRetry} 
          className={className} 
          {...props} 
        />
      );
    case "inline":
      return (
        <InlineErrorState 
          message={message || error?.message} 
          className={className} 
          {...props} 
        />
      );
    case "empty":
      return (
        <EmptyState 
          title={title} 
          message={message} 
          onAction={onAction} 
          actionText={actionText}
          className={className} 
          {...props} 
        />
      );
    case "games":
      return (
        <GameLibraryErrorState 
          className={className} 
          {...props} 
        />
      );
    case "groups":
      return (
        <GroupErrorState 
          className={className} 
          {...props} 
        />
      );
    case "voting":
      return (
        <VotingErrorState 
          title={title} 
          message={message} 
          onRetry={onRetry} 
          className={className} 
          {...props} 
        />
      );
    case "success":
      return (
        <SuccessState 
          title={title} 
          message={message} 
          onAction={onAction} 
          actionText={actionText}
          className={className} 
          {...props} 
        />
      );
    default:
      return (
        <PageErrorState 
          title={title} 
          message={message} 
          onAction={onRetry || onAction} 
          actionText={actionText}
          className={className} 
          {...props} 
        />
      );
  }
};

export default ErrorState;