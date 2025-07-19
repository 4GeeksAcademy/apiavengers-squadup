// src/front/components/LoadingState.jsx - MISSING COMPONENT CREATED

import React from 'react';

// ============================================================================
// PAGE LOADING STATE - Full page loading indicator
// ============================================================================

export const PageLoadingState = ({ 
  message = "Loading...", 
  showSpinner = true,
  className = "" 
}) => {
  return (
    <div className={`min-h-screen flex items-center justify-center ${className}`}>
      <div className="text-center space-y-4">
        {showSpinner && (
          <div className="mx-auto w-16 h-16 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
        )}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">{message}</h3>
          <p className="text-white/70">Please wait while we load your content...</p>
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
    <div className={`flex flex-col items-center justify-center py-8 space-y-4 ${className}`}>
      {showSpinner && (
        <div className={`${sizeClasses[size]} border-coral-200 border-t-coral-500 rounded-full animate-spin`}></div>
      )}
      <div className="text-center space-y-1">
        <p className={`font-medium text-white ${textSizes[size]}`}>{message}</p>
        <p className="text-white/60 text-sm">This won't take long...</p>
      </div>
    </div>
  );
};

// ============================================================================
// INLINE LOADING STATE - For buttons and small elements
// ============================================================================

export const InlineLoadingState = ({ 
  message = "Loading...", 
  showSpinner = true,
  className = "" 
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showSpinner && (
        <div className="w-4 h-4 border-2 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
      )}
      <span className="text-white/80 text-sm">{message}</span>
    </div>
  );
};

// ============================================================================
// SKELETON LOADING STATE - For content previews
// ============================================================================

export const SkeletonLoadingState = ({ 
  rows = 3, 
  showAvatar = false,
  className = "" 
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4">
          {showAvatar && (
            <div className="w-10 h-10 bg-white/10 rounded-full animate-pulse"></div>
          )}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded animate-pulse"></div>
            <div className="h-3 bg-white/5 rounded animate-pulse w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// CARD LOADING STATE - For card-based layouts
// ============================================================================

export const CardLoadingState = ({ 
  count = 6,
  showImage = true,
  className = "" 
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="glass-dark rounded-xl p-6 space-y-4">
          {showImage && (
            <div className="w-full h-32 bg-white/10 rounded-lg animate-pulse"></div>
          )}
          <div className="space-y-2">
            <div className="h-6 bg-white/10 rounded animate-pulse"></div>
            <div className="h-4 bg-white/5 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-white/5 rounded animate-pulse w-1/2"></div>
          </div>
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
          <div key={index} className="glass-dark rounded-lg overflow-hidden">
            <div className="w-full h-48 bg-white/10 animate-pulse"></div>
            <div className="p-4 space-y-2">
              <div className="h-5 bg-white/10 rounded animate-pulse"></div>
              <div className="h-4 bg-white/5 rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const GroupLoadingState = ({ className = "" }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="glass-dark rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-white/10 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-white/5 rounded animate-pulse w-1/2"></div>
            </div>
            <div className="h-10 bg-white/10 rounded animate-pulse w-24"></div>
          </div>
          
          <div className="flex items-center space-x-4">
            {Array.from({ length: 4 }).map((_, avatarIndex) => (
              <div key={avatarIndex} className="w-8 h-8 bg-white/10 rounded-full animate-pulse"></div>
            ))}
            <div className="h-4 bg-white/5 rounded animate-pulse w-20"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const VotingLoadingState = ({ className = "" }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-4">
        <div className="h-8 bg-white/10 rounded animate-pulse w-64 mx-auto"></div>
        <div className="h-4 bg-white/5 rounded animate-pulse w-48 mx-auto"></div>
      </div>
      
      <div className="glass-dark rounded-xl p-6 space-y-4">
        <div className="h-6 bg-white/10 rounded animate-pulse w-32"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
              <div className="w-16 h-16 bg-white/10 rounded animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded animate-pulse"></div>
                <div className="h-3 bg-white/5 rounded animate-pulse w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
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
    <div className={`flex flex-col items-center justify-center py-8 space-y-6 ${className}`}>
      <div className="relative">
        <div className="w-20 h-20 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-8 h-8 text-coral-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L19 6L17 7V9L15 8V10L17 11V13L19 12L21 13V11L23 10V8L21 9ZM3.5 6L5.5 7V9L7.5 8V10L5.5 11V13L3.5 12L1.5 13V11L0 10V8L1.5 9L3.5 6Z"/>
          </svg>
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-white">{message}</h3>
        {progress !== null && (
          <div className="space-y-2">
            <div className="w-64 bg-white/10 rounded-full h-2">
              <div 
                className="bg-coral-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-white/70 text-sm">{progress}% complete</p>
          </div>
        )}
        <p className="text-white/60 text-sm">This may take a few moments...</p>
      </div>
    </div>
  );
};

// ============================================================================
// DEFAULT EXPORT - Most commonly used loading state
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
    case "inline":
      return <InlineLoadingState message={message} showSpinner={showSpinner} className={className} {...props} />;
    case "skeleton":
      return <SkeletonLoadingState className={className} {...props} />;
    case "card":
      return <CardLoadingState className={className} {...props} />;
    case "games":
      return <GameLibraryLoadingState className={className} {...props} />;
    case "groups":
      return <GroupLoadingState className={className} {...props} />;
    case "voting":
      return <VotingLoadingState className={className} {...props} />;
    case "steam":
      return <SteamLoadingState message={message} className={className} {...props} />;
    default:
      return <PageLoadingState message={message} showSpinner={showSpinner} className={className} {...props} />;
  }
};

export default LoadingState;