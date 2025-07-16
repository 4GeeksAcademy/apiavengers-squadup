// src/front/components/GameImage.jsx - New component for robust image handling
import React, { useState } from 'react';

const GameImage = ({ 
    src, 
    alt, 
    className = "", 
    fallbackText = "Game",
    showFallback = true 
}) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    // Create a simple inline SVG fallback instead of using external services
    const createSVGFallback = (text) => {
        const svgContent = `
            <svg width="460" height="215" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#1e293b"/>
                <rect x="10" y="10" width="440" height="195" fill="#334155" stroke="#475569" stroke-width="2" rx="8"/>
                <text x="50%" y="45%" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
                    🎮 ${text.slice(0, 20)}
                </text>
                <text x="50%" y="65%" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="12">
                    Game Image
                </text>
            </svg>
        `;
        return `data:image/svg+xml;base64,${btoa(svgContent)}`;
    };

    const handleImageError = () => {
        console.log(`🖼️ Image failed to load: ${src}`);
        setImageError(true);
        setImageLoading(false);
    };

    const handleImageLoad = () => {
        setImageLoading(false);
        setImageError(false);
    };

    // If we should show fallback and there's an error, show the SVG fallback
    if (imageError && showFallback) {
        return (
            <img
                src={createSVGFallback(fallbackText)}
                alt={alt}
                className={className}
                style={{ objectFit: 'cover' }}
            />
        );
    }

    // If we shouldn't show fallback and there's an error, hide the image
    if (imageError && !showFallback) {
        return (
            <div className={`${className} bg-slate-700 flex items-center justify-center`}>
                <span className="text-slate-400 text-4xl">🎮</span>
            </div>
        );
    }

    return (
        <>
            {imageLoading && (
                <div className={`${className} bg-slate-700 flex items-center justify-center animate-pulse`}>
                    <span className="text-slate-400 text-2xl">⏳</span>
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`${className} ${imageLoading ? 'hidden' : 'block'}`}
                onError={handleImageError}
                onLoad={handleImageLoad}
                style={{ objectFit: 'cover' }}
            />
        </>
    );
};

export default GameImage;