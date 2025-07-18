// src/front/components/Avatar.jsx - Enhanced Avatar Component
import React, { useState } from 'react';

const Avatar = ({ 
    src = null,           // Image URL (Steam avatar, profile pic, etc.)
    name = "User", 
    size = 64, 
    className = "",
    showStatus = false,   // Show online/offline indicator
    status = "offline",   // online, away, offline
    onClick = null        // Click handler
}) => {
    const [imageError, setImageError] = useState(false);
    
    // Generate initials from name
    const getInitials = (name) => {
        if (!name) return "U";
        
        return name
            .trim()
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };
    
    // Generate color based on name using your existing color palette
    const getColor = (name) => {
        const colors = [
            'bg-coral-500',    // coral - your primary color
            'bg-purple-500',   // purple
            'bg-blue-500',     // blue
            'bg-green-500',    // green
            'bg-amber-500',    // amber
            'bg-red-500',      // red
            'bg-violet-500',   // violet
            'bg-cyan-500',     // cyan
            'bg-lime-500',     // lime
            'bg-orange-500',   // orange
            'bg-marine-500',   // marine - your secondary color if available
            'bg-indigo-500'    // indigo
        ];
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return 'bg-green-400';
            case 'away': return 'bg-yellow-400';
            case 'offline': return 'bg-gray-400';
            default: return 'bg-gray-400';
        }
    };
    
    const initials = getInitials(name);
    const bgColorClass = getColor(name);
    
    // Calculate font size based on avatar size
    const fontSize = Math.floor(size / 2.5);
    
    // Status indicator size
    const statusSize = Math.max(8, size * 0.25);
    
    const handleImageError = () => {
        setImageError(true);
    };
    
    const renderAvatar = () => {
        // If we have a valid image source and no error, show image
        if (src && !imageError) {
            return (
                <img
                    src={src}
                    alt={name}
                    className={`rounded-full object-cover border-2 border-white/20 ${onClick ? 'cursor-pointer hover:scale-105' : ''} transition-transform duration-200 ${className}`}
                    style={{ width: size, height: size }}
                    onError={handleImageError}
                    onClick={onClick}
                />
            );
        }
        
        // Otherwise show initials with your color system
        return (
            <div
                className={`
                    inline-flex items-center justify-center rounded-full font-bold text-white 
                    border-2 border-white/20 shadow-lg
                    ${bgColorClass}
                    ${onClick ? 'cursor-pointer hover:scale-105' : ''}
                    transition-transform duration-200
                    ${className}
                `}
                style={{ 
                    width: size, 
                    height: size, 
                    fontSize: `${fontSize}px` 
                }}
                onClick={onClick}
            >
                {initials}
            </div>
        );
    };

    return (
        <div className="relative inline-block">
            {renderAvatar()}
            
            {/* Status indicator */}
            {showStatus && (
                <div
                    className={`
                        absolute rounded-full border-2 border-white shadow-sm
                        ${getStatusColor(status)}
                        ${size < 32 ? 'border' : 'border-2'}
                    `}
                    style={{
                        width: `${statusSize}px`,
                        height: `${statusSize}px`,
                        bottom: '0px',
                        right: '0px'
                    }}
                />
            )}
        </div>
    );
};

export default Avatar;