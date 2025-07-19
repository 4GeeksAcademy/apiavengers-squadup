// src/front/components/GameImage.jsx - MISSING COMPONENT CREATED

import React, { useState, useRef, useEffect } from 'react';

const GameImage = ({ 
  src, 
  alt = "Game image", 
  className = "",
  fallbackSrc = null,
  showPlaceholder = true,
  lazy = true,
  aspectRatio = "16:9",
  onLoad,
  onError,
  ...props 
}) => {
  const [imageState, setImageState] = useState('loading');
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [lazy, isInView]);

  // Handle src changes
  useEffect(() => {
    if (src !== currentSrc) {
      setImageState('loading');
      setCurrentSrc(src);
    }
  }, [src, currentSrc]);

  const handleLoad = (e) => {
    setImageState('loaded');
    onLoad?.(e);
  };

  const handleError = (e) => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setImageState('loading');
    } else {
      setImageState('error');
    }
    onError?.(e);
  };

  // Get aspect ratio classes
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "1:1":
        return "aspect-square";
      case "4:3":
        return "aspect-[4/3]";
      case "16:9":
        return "aspect-video";
      case "3:4":
        return "aspect-[3/4]";
      default:
        return "aspect-video";
    }
  };

  // Default Steam game placeholder
  const DefaultGamePlaceholder = () => (
    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-2">
        <svg 
          className="w-12 h-12 mx-auto text-slate-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 011 1v1a2 2 0 104 0V4z" 
          />
        </svg>
        <p className="text-xs text-slate-400 font-medium">No Image</p>
      </div>
    </div>
  );

  // Loading placeholder
  const LoadingPlaceholder = () => (
    <div className="w-full h-full bg-slate-800 animate-pulse flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 mx-auto border-2 border-slate-600 border-t-coral-500 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500">Loading...</p>
      </div>
    </div>
  );

  // Error placeholder
  const ErrorPlaceholder = () => (
    <div className="w-full h-full bg-red-900/20 border border-red-500/20 flex items-center justify-center">
      <div className="text-center space-y-2">
        <svg 
          className="w-8 h-8 mx-auto text-red-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <p className="text-xs text-red-400">Failed to load</p>
      </div>
    </div>
  );

  const shouldShowImage = isInView && currentSrc;

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden bg-slate-800 ${getAspectRatioClass()} ${className}`}
      {...props}
    >
      {/* Main image */}
      {shouldShowImage && (
        <img
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`
            absolute inset-0 w-full h-full object-cover transition-opacity duration-300
            ${imageState === 'loaded' ? 'opacity-100' : 'opacity-0'}
          `}
          loading={lazy ? 'lazy' : 'eager'}
        />
      )}

      {/* Placeholder overlays */}
      <div 
        className={`
          absolute inset-0 transition-opacity duration-300
          ${imageState === 'loaded' ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
      >
        {imageState === 'loading' && showPlaceholder && <LoadingPlaceholder />}
        {imageState === 'error' && showPlaceholder && <ErrorPlaceholder />}
        {!shouldShowImage && showPlaceholder && <DefaultGamePlaceholder />}
      </div>

      {/* Optional overlay for hover effects */}
      {imageState === 'loaded' && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200" />
      )}
    </div>
  );
};

// ============================================================================
// SPECIALIZED GAME IMAGE VARIANTS
// ============================================================================

// Header image variant (typical Steam game headers)
export const GameHeaderImage = ({ src, alt, game, className = "", ...props }) => {
  const gameAlt = alt || `${game?.name || 'Game'} header image`;
  
  return (
    <GameImage
      src={src}
      alt={gameAlt}
      aspectRatio="16:9"
      className={`rounded-lg ${className}`}
      {...props}
    />
  );
};

// Square avatar variant for smaller displays
export const GameAvatarImage = ({ src, alt, game, className = "", ...props }) => {
  const gameAlt = alt || `${game?.name || 'Game'} icon`;
  
  return (
    <GameImage
      src={src}
      alt={gameAlt}
      aspectRatio="1:1"
      className={`rounded-md ${className}`}
      {...props}
    />
  );
};

// Card variant with hover effects
export const GameCardImage = ({ 
  src, 
  alt, 
  game, 
  onClick, 
  isSelected = false,
  className = "", 
  ...props 
}) => {
  const gameAlt = alt || `${game?.name || 'Game'} card image`;
  
  return (
    <div 
      className={`
        relative group cursor-pointer transition-transform duration-200 hover:scale-105
        ${isSelected ? 'ring-2 ring-coral-500 ring-offset-2 ring-offset-slate-900' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <GameImage
        src={src}
        alt={gameAlt}
        aspectRatio="16:9"
        className="rounded-lg overflow-hidden"
        {...props}
      />
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg" />
      
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-coral-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      
      {/* Game name overlay on hover */}
      {game?.name && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-b-lg">
          <p className="text-sm font-medium truncate">{game.name}</p>
        </div>
      )}
    </div>
  );
};

// Voting result variant with vote indicators
export const VotingGameImage = ({ 
  src, 
  alt, 
  game, 
  votes = 0, 
  points = 0, 
  rank = null,
  className = "", 
  ...props 
}) => {
  const gameAlt = alt || `${game?.name || 'Game'} voting result`;
  
  return (
    <div className={`relative ${className}`}>
      <GameImage
        src={src}
        alt={gameAlt}
        aspectRatio="16:9"
        className="rounded-lg"
        {...props}
      />
      
      {/* Rank badge */}
      {rank && (
        <div className="absolute top-2 left-2 w-8 h-8 bg-coral-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">#{rank}</span>
        </div>
      )}
      
      {/* Vote info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/90 text-white p-3 rounded-b-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{votes} votes</span>
          <span className="text-sm text-coral-400">{points} points</span>
        </div>
      </div>
    </div>
  );
};

// Grid view variant optimized for lists
export const GameGridImage = ({ 
  src, 
  alt, 
  game, 
  showTitle = true,
  className = "", 
  ...props 
}) => {
  const gameAlt = alt || `${game?.name || 'Game'} grid image`;
  
  return (
    <div className={`space-y-2 ${className}`}>
      <GameImage
        src={src}
        alt={gameAlt}
        aspectRatio="16:9"
        className="rounded-md"
        {...props}
      />
      {showTitle && game?.name && (
        <p className="text-sm font-medium text-white truncate">{game.name}</p>
      )}
    </div>
  );
};

// ============================================================================
// GAMING SPECIFIC HELPER FUNCTIONS
// ============================================================================

// Get the best image URL from a game object
export const getGameImageUrl = (game, preferredType = 'header') => {
  if (!game) return null;
  
  // Priority order for different image types
  const imageFields = {
    header: ['header_image', 'header_img', 'image_url', 'screenshot', 'icon'],
    icon: ['icon', 'small_image', 'header_image', 'image_url'],
    screenshot: ['screenshot', 'header_image', 'image_url', 'icon']
  };
  
  const fields = imageFields[preferredType] || imageFields.header;
  
  for (const field of fields) {
    if (game[field]) {
      return game[field];
    }
  }
  
  return null;
};

// Generate Steam CDN URLs if needed
export const getSteamImageUrl = (appid, type = 'header') => {
  if (!appid) return null;
  
  const baseUrl = 'https://cdn.akamai.steamstatic.com/steam/apps';
  
  switch (type) {
    case 'header':
      return `${baseUrl}/${appid}/header.jpg`;
    case 'capsule':
      return `${baseUrl}/${appid}/capsule_231x87.jpg`;
    case 'icon':
      return `${baseUrl}/${appid}/capsule_32x32.jpg`;
    case 'library':
      return `${baseUrl}/${appid}/library_600x900.jpg`;
    default:
      return `${baseUrl}/${appid}/header.jpg`;
  }
};

export default GameImage;