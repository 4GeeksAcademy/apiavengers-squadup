// src/front/components/LoadingState.jsx - Enhanced Loading State Components

import React from 'react';

// ============================================================================
// PAGE LOADING STATE - Full page loading
// ============================================================================

export const PageLoadingState = ({ 
  message = "Loading...", 
  showSpinner = true,
  className = "" 
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 flex items-center justify-center ${className}`}>
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center max-w-md">
        {showSpinner && (
          <div className="relative w-16 h-16 mx-auto mb-6">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
            {/* Inner spinning ring */}
            <div className="absolute inset-0 border-4 border-transparent border-t-coral-500 rounded-full animate-spin"></div>
            {/* Center dot */}
            <div className="absolute inset-4 bg-coral-500/20 rounded-full animate-pulse"></div>
          </div>
        )}
        
        <h3 className="text-xl font-semibold text-white mb-2">Please Wait</h3>
        <p className="text-white/70">{message}</p>
        
        {/* Animated dots */}
        <div className="flex justify-center space-x-1 mt-4">
          <div className="w-2 h-2 bg-coral-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
          <div className="w-2 h-2 bg-coral-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
          <div className="w-2 h-2 bg-coral-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DATA LOADING STATE - For content sections
// ============================================================================

export const DataLoadingState = ({ 
  message = "Loading data...", 
  showSpinner = true,
  size = "md",
  className = "" 
}) => {
  const sizeClasses = {
    sm: "w-8 h-8 border-2",
    md: "w-12 h-12 border-3", 
    lg: "w-16 h-16 border-4"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      {showSpinner && (
        <div className="relative mx-auto mb-4" style={{ width: sizeClasses[size].split(' ')[0].replace('w-', '') + 'rem', height: sizeClasses[size].split(' ')[1].replace('h-', '') + 'rem' }}>
          <div className={`absolute inset-0 ${sizeClasses[size]} border-white/20 rounded-full`}></div>
          <div className={`absolute inset-0 ${sizeClasses[size]} border-transparent border-t-marine-400 rounded-full animate-spin`}></div>
        </div>
      )}
      
      <p className={`text-white/70 ${textSizes[size]}`}>{message}</p>
      
      {/* Progress bar animation */}
      <div className="mt-4 w-full bg-white/10 rounded-full h-1 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-coral-500 to-marine-400 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

// ============================================================================
// CARD LOADING STATE - For loading within cards/sections
// ============================================================================

export const CardLoadingState = ({ 
  count = 6,
  showImage = true,
  message = "Loading...", 
  className = "",
  showIcon = true 
}) => {
  // If count is provided, render multiple skeleton cards
  if (count > 1) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <div className="animate-pulse space-y-4">
              {showImage && (
                <div className="w-full h-32 bg-white/20 rounded-lg"></div>
              )}
              <div className="space-y-2">
                <div className="h-6 bg-white/20 rounded w-3/4"></div>
                <div className="h-4 bg-white/15 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Single card loading state
  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      {showIcon && (
        <div className="relative w-12 h-12 mx-auto mb-4">
          <div className="absolute inset-0 border-3 border-white/20 rounded-full"></div>
          <div className="absolute inset-0 border-3 border-transparent border-t-marine-400 rounded-full animate-spin"></div>
        </div>
      )}
      
      <p className="text-white/70">{message}</p>
      
      {/* Progress bar animation */}
      <div className="mt-4 w-full bg-white/10 rounded-full h-1 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-coral-500 to-marine-400 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

// ============================================================================
// INLINE LOADING STATE - Small loading indicators
// ============================================================================

export const InlineLoadingState = ({ 
  message = "Loading...", 
  size = "sm",
  showSpinner = true,
  className = "" 
}) => {
  const sizeClasses = {
    xs: "w-4 h-4",
    sm: "w-5 h-5", 
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };
  
  const textSizes = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base", 
    lg: "text-lg"
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showSpinner && (
        <div className={`border-2 border-white/30 border-t-coral-500 rounded-full animate-spin ${sizeClasses[size]}`}></div>
      )}
      <span className={`text-white/70 ${textSizes[size]}`}>{message}</span>
    </div>
  );
};

// ============================================================================
// SKELETON LOADING STATES - For content placeholders
// ============================================================================

export const SkeletonCard = ({ className = "" }) => {
  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 ${className}`}>
      <div className="animate-pulse space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-6 bg-white/20 rounded w-1/3"></div>
          <div className="h-4 bg-white/15 rounded w-16"></div>
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <div className="h-4 bg-white/15 rounded w-full"></div>
          <div className="h-4 bg-white/15 rounded w-2/3"></div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center pt-2">
          <div className="h-4 bg-white/15 rounded w-24"></div>
          <div className="h-8 bg-white/20 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
};

export const SkeletonList = ({ 
  items = 3, 
  showAvatar = false,
  className = "" 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center p-3 bg-white/5 rounded-lg animate-pulse">
          {/* Avatar/Image */}
          {showAvatar && (
            <div className="w-12 h-12 bg-white/20 rounded-lg mr-4 flex-shrink-0"></div>
          )}
          
          {/* Content */}
          <div className="flex-grow space-y-2">
            <div className="h-4 bg-white/20 rounded w-3/4"></div>
            <div className="h-3 bg-white/15 rounded w-1/2"></div>
          </div>
          
          {/* Action */}
          <div className="h-8 bg-white/15 rounded w-16 flex-shrink-0"></div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// GAMING SPECIFIC LOADING STATES
// ============================================================================

export const GameLibraryLoadingState = ({ className = "" }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="h-8 bg-white/10 rounded animate-pulse w-48"></div>
        <div className="h-10 bg-white/10 rounded animate-pulse w-32"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg overflow-hidden">
            <div className="w-full h-48 bg-white/20 animate-pulse"></div>
            <div className="p-4 space-y-2">
              <div className="h-5 bg-white/20 rounded animate-pulse"></div>
              <div className="h-4 bg-white/15 rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const GroupLoadingState = ({ className = "" }) => {
  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 ${className}`}>
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-white/20 rounded w-48"></div>
          <div className="h-6 bg-white/15 rounded w-20"></div>
        </div>
        
        {/* Groups grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const VotingLoadingState = ({ className = "" }) => {
  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      <div className="relative w-16 h-16 mx-auto mb-6">
        {/* Voting box animation */}
        <div className="absolute inset-0 border-4 border-white/20 rounded-lg"></div>
        <div className="absolute inset-2 bg-gradient-to-r from-coral-500 to-marine-400 rounded animate-pulse"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl animate-bounce">🗳️</span>
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2">Processing Votes</h3>
      <p className="text-white/70">Calculating results...</p>
      
      {/* Vote progress bars */}
      <div className="mt-6 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="w-12 h-6 bg-white/20 rounded"></div>
            <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-coral-500 rounded-full animate-pulse"
                style={{ 
                  width: `${30 + i * 20}%`,
                  animationDelay: `${i * 200}ms`
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// STEAM LOADING STATE
// ============================================================================

export const SteamLoadingState = ({ 
  message = "Syncing Steam library...",
  progress = null,
  className = "" 
}) => {
  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center ${className}`}>
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-coral-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-8 h-8 text-coral-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L19 6L17 7V9L15 8V10L17 11V13L19 12L21 13V11L23 10V8L21 9ZM3.5 6L5.5 7V9L7.5 8V10L5.5 11V13L3.5 12L1.5 13V11L0 10V8L1.5 9L3.5 6Z"/>
          </svg>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">{message}</h3>
      
      {progress !== null && (
        <div className="space-y-2 mb-4">
          <div className="w-64 bg-white/10 rounded-full h-2 mx-auto">
            <div 
              className="bg-gradient-to-r from-coral-500 to-marine-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-white/70 text-sm">{progress}% complete</p>
        </div>
      )}
      
      <p className="text-white/60 text-sm">This may take a few moments...</p>
    </div>
  );
};

// ============================================================================
// LOADING OVERLAY - For covering existing content
// ============================================================================

export const LoadingOverlay = ({ 
  message = "Loading...", 
  show = true,
  className = "" 
}) => {
  if (!show) return null;

  return (
    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-inherit ${className}`}>
      <div className="bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
        <div className="relative w-8 h-8 mx-auto mb-3">
          <div className="absolute inset-0 border-2 border-white/30 border-t-coral-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-white text-sm">{message}</p>
      </div>
    </div>
  );
};

// ============================================================================
// PROGRESS INDICATORS
// ============================================================================

export const ProgressBar = ({ 
  progress = 0, 
  message = "", 
  className = "" 
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  return (
    <div className={`space-y-2 ${className}`}>
      {message && (
        <div className="flex justify-between items-center">
          <span className="text-white/70 text-sm">{message}</span>
          <span className="text-white/50 text-sm">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-coral-500 to-marine-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        ></div>
      </div>
    </div>
  );
};

export const CircularProgress = ({ 
  progress = 0, 
  size = 64,
  strokeWidth = 4,
  className = "" 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff7f50" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Progress text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-medium text-sm">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

const LoadingState = ({ 
  type = "page",
  message,
  showSpinner = true,
  className = "",
  ...props 
}) => {
  switch (type) {
    case "page":
      return <PageLoadingState message={message} showSpinner={showSpinner} className={className} {...props} />;
    case "data":
      return <DataLoadingState message={message} showSpinner={showSpinner} className={className} {...props} />;
    case "card":
      return <CardLoadingState message={message} className={className} {...props} />;
    case "inline":
      return <InlineLoadingState message={message} showSpinner={showSpinner} className={className} {...props} />;
    case "skeleton":
      return <SkeletonList className={className} {...props} />;
    case "games":
      return <GameLibraryLoadingState className={className} {...props} />;
    case "voting":
      return <VotingLoadingState className={className} {...props} />;
    case "group":
      return <GroupLoadingState className={className} {...props} />;
    case "steam":
      return <SteamLoadingState message={message} className={className} {...props} />;
    case "overlay":
      return <LoadingOverlay message={message} className={className} {...props} />;
    default:
      return <PageLoadingState message={message} showSpinner={showSpinner} className={className} {...props} />;
  }
};

export default LoadingState;