// src/front/components/LoadingState.jsx - Standardized Loading Component for Phase 5

import React from 'react';

const LoadingState = ({ 
  message = "Loading...", 
  subMessage = null,
  showSpinner = true,
  size = "normal", // "small", "normal", "large"
  variant = "glass", // "glass", "solid", "minimal"
  className = "",
  spinnerColor = "white",
  textColor = "white"
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      container: "p-4",
      spinner: "w-4 h-4",
      mainText: "text-sm",
      subText: "text-xs"
    },
    normal: {
      container: "p-8",
      spinner: "w-8 h-8", 
      mainText: "text-lg",
      subText: "text-sm"
    },
    large: {
      container: "p-12",
      spinner: "w-12 h-12",
      mainText: "text-xl",
      subText: "text-base"
    }
  };

  // Variant configurations
  const variantConfig = {
    glass: "backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl",
    solid: "bg-slate-800 border border-slate-700 rounded-2xl shadow-xl",
    minimal: "bg-transparent"
  };

  // Spinner color configurations
  const spinnerColors = {
    white: "border-white/30 border-t-white",
    coral: "border-coral-500/30 border-t-coral-500",
    marine: "border-marine-500/30 border-t-marine-500",
    purple: "border-purple-500/30 border-t-purple-500",
    green: "border-green-500/30 border-t-green-500"
  };

  // Text color configurations
  const textColors = {
    white: "text-white",
    coral: "text-coral-400",
    marine: "text-marine-400", 
    purple: "text-purple-400",
    green: "text-green-400",
    gray: "text-gray-400"
  };

  const currentSize = sizeConfig[size] || sizeConfig.normal;
  const currentVariant = variantConfig[variant] || variantConfig.glass;
  const currentSpinnerColor = spinnerColors[spinnerColor] || spinnerColors.white;
  const currentTextColor = textColors[textColor] || textColors.white;

  return (
    <div className={`${currentVariant} ${currentSize.container} text-center ${className}`}>
      {showSpinner && (
        <div className={`${currentSize.spinner} border-2 ${currentSpinnerColor} rounded-full animate-spin mx-auto mb-4`}></div>
      )}
      
      <p className={`${currentTextColor} ${currentSize.mainText} font-medium`}>
        {message}
      </p>
      
      {subMessage && (
        <p className={`text-white/60 ${currentSize.subText} mt-2`}>
          {subMessage}
        </p>
      )}
    </div>
  );
};

// Specialized loading components for common use cases
export const PageLoadingState = ({ message = "Loading page...", subMessage }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12 flex items-center justify-center">
    <LoadingState 
      message={message}
      subMessage={subMessage}
      size="large"
      variant="glass"
    />
  </div>
);

export const InlineLoadingState = ({ message = "Loading...", className = "" }) => (
  <LoadingState 
    message={message}
    size="small"
    variant="minimal"
    className={`flex items-center space-x-3 ${className}`}
    showSpinner={true}
  />
);

export const CardLoadingState = ({ message = "Loading content...", subMessage }) => (
  <LoadingState 
    message={message}
    subMessage={subMessage}
    size="normal"
    variant="glass"
  />
);

export const DataLoadingState = ({ 
  message = "Fetching data...", 
  attempt = null,
  showRetryInfo = false 
}) => (
  <LoadingState 
    message={message}
    subMessage={
      showRetryInfo && attempt 
        ? `${attempt > 1 ? `Retry attempt ${attempt}` : 'First attempt'}`
        : null
    }
    size="normal"
    variant="glass"
    spinnerColor="marine"
  />
);

// Gaming-specific loading states
export const GameLibraryLoadingState = () => (
  <PageLoadingState 
    message="Loading your game library..."
    subMessage="This may take a moment for large libraries"
  />
);

export const GroupLoadingState = () => (
  <PageLoadingState 
    message="Loading group..."
    subMessage="Fetching members and game data"
  />
);

export const VotingLoadingState = () => (
  <CardLoadingState 
    message="Setting up voting session..."
    subMessage="Preparing games and live updates"
  />
);

export const SteamSyncLoadingState = () => (
  <InlineLoadingState 
    message="Syncing Steam library..."
    className="justify-center"
  />
);

export default LoadingState;