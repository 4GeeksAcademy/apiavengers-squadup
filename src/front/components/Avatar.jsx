// Create this as src/front/components/Avatar.jsx

import React from 'react';

const Avatar = ({ name = "User", size = 64, className = "" }) => {
    // Generate initials from name
    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Generate color based on name
    const getColor = (name) => {
        const colors = [
            'bg-coral-500',    // coral
            'bg-purple-500',   // purple
            'bg-blue-500',     // blue
            'bg-green-500',    // green
            'bg-amber-500',    // amber
            'bg-red-500',      // red
            'bg-violet-500',   // violet
            'bg-cyan-500',     // cyan
            'bg-lime-500',     // lime
            'bg-orange-500'    // orange
        ];
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const initials = getInitials(name);
    const bgColorClass = getColor(name);
    
    // Calculate font size based on avatar size
    const fontSize = Math.floor(size / 2.5);

    return (
        <div 
            className={`inline-flex items-center justify-center rounded-full font-bold text-white ${bgColorClass} ${className}`}
            style={{ 
                width: size, 
                height: size,
                fontSize: `${fontSize}px`
            }}
        >
            {initials}
        </div>
    );
};

export default Avatar;