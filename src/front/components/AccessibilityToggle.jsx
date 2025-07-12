import React from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';

export const AccessibilityToggle = () => {
    const { store, dispatch } = useGlobalReducer();
    const animationsEnabled = store.animationsEnabled;

    const handleToggle = () => {
        dispatch({ type: 'TOGGLE_ANIMATIONS' });
    };

    return (
        <button
            onClick={handleToggle}
            aria-pressed={!animationsEnabled}
            aria-label="Toggle animations"
            className="fixed bottom-5 right-5 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-300 shadow-lg"
            title={animationsEnabled ? 'Disable Animations' : 'Enable Animations'}
        >
            <span className="text-xl">
                {/* Simple sparkle icon that changes state */}
                {animationsEnabled ? '✨' : '🚫'}
            </span>
        </button>
    );
};