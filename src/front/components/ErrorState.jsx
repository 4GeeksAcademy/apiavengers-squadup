// src/front/components/ErrorState.jsx - Enhanced Error State Components

import React from 'react';

// ============================================================================
// FULL PAGE ERROR STATES
// ============================================================================

export const PageErrorState = ({ 
  title = "Something went wrong", 
  message = "An unexpected error occurred", 
  onRetry, 
  onGoHome,
  showIcon = true,
  className = "" 
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 flex items-center justify-center ${className}`}>
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
        {showIcon && <div className="text-6xl mb-4">💥</div>}
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <p className="text-white/70 mb-6">{message}</p>
        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
            >
              Try Again
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
            >
              Go Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const NetworkErrorState = ({ 
  error = "Network connection failed", 
  onRetry, 
  onRefresh, 
  helpText,
  className = "" 
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 flex items-center justify-center ${className}`}>
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
        <div className="text-6xl mb-4">🌐</div>
        <h3 className="text-2xl font-bold text-white mb-4">Connection Error</h3>
        <p className="text-red-300 mb-4">{error}</p>
        {helpText && <p className="text-white/60 text-sm mb-6">{helpText}</p>}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
            >
              Try Again
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
            >
              Refresh Page
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const NotFoundErrorState = ({ 
  title = "Page Not Found", 
  message = "The page you're looking for doesn't exist or has been moved.", 
  onGoBack, 
  onGoHome,
  className = "" 
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 flex items-center justify-center ${className}`}>
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <p className="text-white/70 mb-6">{message}</p>
        <div className="space-y-3">
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
            >
              ← Go Back
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
            >
              🏠 Go Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const PermissionErrorState = ({ 
  title = "Access Denied",
  message = "You don't have permission to access this resource.",
  onGoBack, 
  onGoHome,
  className = "" 
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 flex items-center justify-center ${className}`}>
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <p className="text-white/70 mb-6">{message}</p>
        <div className="space-y-3">
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
            >
              ← Go Back
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
            >
              🏠 Go to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPACT ERROR STATES
// ============================================================================

export const SteamErrorState = ({ 
  error = "Steam connection failed", 
  onRetry, 
  onSkip,
  onConnect,
  isConnected = false,
  className = "" 
}) => {
  return (
    <div className={`p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm ${className}`}>
      <div className="flex items-start space-x-2 mb-3">
        <span className="text-red-400 text-xl mt-0.5">🎮</span>
        <div className="flex-1">
          <div className="font-medium text-red-300 mb-1">Steam Integration Error</div>
          <p className="text-red-200">{error}</p>
        </div>
      </div>
      
      {(onRetry || onSkip || onConnect) && (
        <div className="flex gap-2 mt-4">
          {onRetry && isConnected && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 rounded-lg text-sm transition-colors"
            >
              🔄 Retry Connection
            </button>
          )}
          {onConnect && !isConnected && (
            <button
              onClick={onConnect}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 rounded-lg text-sm transition-colors"
            >
              🔗 Connect Steam
            </button>
          )}
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-lg text-sm transition-colors"
            >
              Skip for Now
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const InlineErrorState = ({ 
  error,
  message,
  onRetry,
  onDismiss,
  className = "" 
}) => {
  const displayMessage = message || error;
  
  return (
    <div className={`p-4 bg-red-500/10 border border-red-500/30 rounded-xl ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          <span className="text-red-400 text-lg">⚠️</span>
          <div>
            <p className="text-red-300 font-medium">Error</p>
            <p className="text-red-200 text-sm">{displayMessage}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded text-sm transition-colors"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-300 hover:text-red-200 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// GAMING SPECIFIC ERROR STATES
// ============================================================================

export const GameNotFoundErrorState = ({ 
  gameName,
  onGoBack, 
  onBrowseGames,
  className = "" 
}) => {
  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      <div className="text-4xl mb-4">🎮</div>
      <h3 className="text-xl font-bold text-white mb-4">Game Not Found</h3>
      <p className="text-white/70 mb-6">
        {gameName ? `"${gameName}" could not be found in your library.` : "The requested game could not be found."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
          >
            ← Go Back
          </button>
        )}
        {onBrowseGames && (
          <button
            onClick={onBrowseGames}
            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
          >
            🎯 Browse Games
          </button>
        )}
      </div>
    </div>
  );
};

export const GroupNotFoundErrorState = ({ 
  groupName,
  onGoBack, 
  onBrowseGroups,
  className = "" 
}) => {
  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      <div className="text-4xl mb-4">👥</div>
      <h3 className="text-xl font-bold text-white mb-4">Group Not Found</h3>
      <p className="text-white/70 mb-6">
        {groupName ? `Group "${groupName}" could not be found.` : "The requested group could not be found or may have been deleted."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
          >
            ← Go Back
          </button>
        )}
        {onBrowseGroups && (
          <button
            onClick={onBrowseGroups}
            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
          >
            🏠 Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export const VotingErrorState = ({ 
  error = "Voting session error",
  title = "Voting Session Error",
  message,
  onRetry,
  onGoBack,
  className = "" 
}) => {
  const displayMessage = message || error;
  
  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      <div className="text-4xl mb-4">🗳️</div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <p className="text-red-300 mb-6">{displayMessage}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
          >
            🔄 Try Again
          </button>
        )}
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
          >
            ← Go Back
          </button>
        )}
      </div>
    </div>
  );
};

export const GameLibraryErrorState = ({ 
  onSync,
  onConnect,
  isConnected = false,
  className = "" 
}) => {
  if (!isConnected) {
    return (
      <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
        <div className="text-4xl mb-4">🎮</div>
        <h3 className="text-xl font-bold text-white mb-4">Steam Not Connected</h3>
        <p className="text-white/70 mb-6">Connect your Steam account to view and sync your game library.</p>
        {onConnect && (
          <button
            onClick={onConnect}
            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
          >
            🔗 Connect Steam
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      <div className="text-4xl mb-4">📚</div>
      <h3 className="text-xl font-bold text-white mb-4">No Games Found</h3>
      <p className="text-white/70 mb-6">Your Steam library appears to be empty or hasn't been synced yet.</p>
      {onSync && (
        <button
          onClick={onSync}
          className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
        >
          🔄 Sync Steam Library
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
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      <div className="text-4xl mb-4">👥</div>
      <h3 className="text-xl font-bold text-white mb-4">No Groups Yet</h3>
      <p className="text-white/70 mb-6">Create or join a gaming group to start voting on games with friends.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onCreateGroup && (
          <button
            onClick={onCreateGroup}
            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
          >
            ➕ Create Group
          </button>
        )}
        {onJoinGroup && (
          <button
            onClick={onJoinGroup}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200"
          >
            🔗 Join Group
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
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <p className="text-white/70 mb-4">{message}</p>
      {error?.response?.data?.error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm font-mono">{error.response.data.error}</p>
        </div>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
        >
          🔄 Try Again
        </button>
      )}
    </div>
  );
};

// ============================================================================
// EMPTY & SUCCESS STATES
// ============================================================================

export const EmptyState = ({ 
  title = "No data available",
  message = "There's nothing to show here yet.",
  actionText,
  onAction,
  icon = "📄",
  className = "" 
}) => {
  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <p className="text-white/60 mb-6">{message}</p>
      {onAction && actionText && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export const SuccessState = ({ 
  title = "Success!",
  message = "Your action was completed successfully.",
  actionText,
  onAction,
  className = "" 
}) => {
  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      <div className="text-4xl mb-4">✅</div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <p className="text-white/70 mb-6">{message}</p>
      {onAction && actionText && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

// ============================================================================
// DEFAULT EXPORT - Smart error state router
// ============================================================================

const ErrorState = ({ 
  type = "page", 
  error,
  title,
  message,
  onRetry,
  onGoBack,
  onGoHome,
  onAction,
  actionText,
  className = "",
  ...props 
}) => {
  // Handle error objects by extracting message
  const errorMessage = error?.message || error?.response?.data?.error || error;
  const displayMessage = message || errorMessage;

  switch (type) {
    case "network":
      return (
        <NetworkErrorState 
          error={displayMessage} 
          onRetry={onRetry} 
          onRefresh={() => window.location.reload()} 
          className={className} 
          {...props} 
        />
      );
    
    case "steam":
      return (
        <SteamErrorState 
          error={displayMessage} 
          onRetry={onRetry} 
          className={className} 
          {...props} 
        />
      );
    
    case "notfound":
    case "404":
      return (
        <NotFoundErrorState 
          title={title} 
          message={displayMessage} 
          onGoBack={onGoBack} 
          onGoHome={onGoHome} 
          className={className} 
          {...props} 
        />
      );
    
    case "permission":
    case "403":
      return (
        <PermissionErrorState 
          title={title} 
          message={displayMessage} 
          onGoBack={onGoBack} 
          onGoHome={onGoHome} 
          className={className} 
          {...props} 
        />
      );
    
    case "inline":
      return (
        <InlineErrorState 
          error={displayMessage} 
          onRetry={onRetry} 
          className={className} 
          {...props} 
        />
      );
    
    case "game":
      return (
        <GameNotFoundErrorState 
          onGoBack={onGoBack} 
          className={className} 
          {...props} 
        />
      );
    
    case "group":
      return (
        <GroupNotFoundErrorState 
          onGoBack={onGoBack} 
          className={className} 
          {...props} 
        />
      );
    
    case "voting":
      return (
        <VotingErrorState 
          error={displayMessage} 
          title={title}
          onRetry={onRetry} 
          onGoBack={onGoBack} 
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
    
    case "empty":
      return (
        <EmptyState 
          title={title} 
          message={displayMessage} 
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
    
    case "success":
      return (
        <SuccessState 
          title={title} 
          message={displayMessage} 
          onAction={onAction} 
          actionText={actionText}
          className={className} 
          {...props} 
        />
      );
    
    case "page":
    default:
      return (
        <PageErrorState 
          title={title} 
          message={displayMessage} 
          onRetry={onRetry} 
          onGoHome={onGoHome} 
          className={className} 
          {...props} 
        />
      );
  }
};

export default ErrorState;