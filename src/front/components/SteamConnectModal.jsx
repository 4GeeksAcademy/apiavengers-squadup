// src/front/components/SteamConnectModal.jsx - UPDATED with Unified Steam Integration

import React, { useState, useEffect } from 'react';
import steamService from '../services/steamService.js';
import toast from 'react-hot-toast';

/**
 * Unified Steam Connect Modal
 * Replaces the old modal with improved UX and error handling
 */
const SteamConnectModal = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    defaultMethod = 'openid',
    title = "Connect Steam Account" 
}) => {
    const [connectionMethod, setConnectionMethod] = useState(defaultMethod);
    const [steamId, setSteamId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showInstructions, setShowInstructions] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setConnectionMethod(defaultMethod);
            setSteamId('');
            setError('');
            setShowInstructions(false);
        }
    }, [isOpen, defaultMethod]);

    // Clear error when connection method changes
    useEffect(() => {
        setError('');
        setSteamId('');
    }, [connectionMethod]);

    /**
     * Handle Steam connection via OpenID
     */
    const handleOpenIDConnect = async () => {
        setLoading(true);
        setError('');
        
        try {
            // Get current path for return URL
            const returnTo = window.location.pathname;
            await steamService.connectViaOpenID(returnTo);
            // Note: This will redirect, so no success handling needed here
        } catch (error) {
            setError(steamService.getErrorMessage(error));
            toast.error(steamService.getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle manual Steam ID connection
     */
    const handleManualConnect = async () => {
        if (!steamId.trim()) {
            setError('Please enter your Steam ID');
            return;
        }

        setLoading(true);
        setError('');
        const loadingToast = toast.loading('Connecting Steam account...');
        
        try {
            const result = await steamService.connectManually(steamId);
            
            toast.dismiss(loadingToast);
            toast.success(`${result.message} Synced ${result.newGames} games!`);
            
            // Call success callback with result
            if (onSuccess) {
                onSuccess(result);
            }
            
            // Close modal
            onClose();
            
        } catch (error) {
            toast.dismiss(loadingToast);
            const errorMessage = steamService.getErrorMessage(error);
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (connectionMethod === 'openid') {
            await handleOpenIDConnect();
        } else {
            await handleManualConnect();
        }
    };

    /**
     * Get Steam ID instructions
     */
    const getInstructions = () => {
        return steamService.showSteamIdInstructions();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="text-white/60 hover:text-white transition-colors disabled:opacity-50"
                        aria-label="Close modal"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Connection Method Selector */}
                <div className="flex space-x-1 bg-white/5 rounded-lg p-1 mb-6">
                    <button
                        onClick={() => setConnectionMethod('openid')}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            connectionMethod === 'openid'
                                ? 'bg-coral-500 text-white'
                                : 'text-white/70 hover:text-white'
                        }`}
                        disabled={loading}
                    >
                        Steam Login
                    </button>
                    <button
                        onClick={() => setConnectionMethod('manual')}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            connectionMethod === 'manual'
                                ? 'bg-coral-500 text-white'
                                : 'text-white/70 hover:text-white'
                        }`}
                        disabled={loading}
                    >
                        Steam ID
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {connectionMethod === 'openid' ? (
                        /* OpenID Connection Method */
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="text-6xl mb-4">🎮</div>
                                <p className="text-white/70 text-sm mb-4">
                                    Connect securely through Steam's official login system. 
                                    You'll be redirected to Steam to authorize the connection.
                                </p>
                            </div>
                            
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        🔗 Connect via Steam
                                    </>
                                )}
                            </button>
                            
                            <p className="text-white/50 text-xs text-center">
                                Secure • No password required • Official Steam authentication
                            </p>
                        </div>
                    ) : (
                        /* Manual Steam ID Method */
                        <div className="space-y-4">
                            <div>
                                <label className="block text-white/70 text-sm mb-2 font-medium">
                                    Steam ID (17 digits)
                                </label>
                                <input
                                    type="text"
                                    value={steamId}
                                    onChange={(e) => setSteamId(e.target.value)}
                                    placeholder="76561198000000000"
                                    className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 transition-all"
                                    disabled={loading}
                                    required
                                />
                                {error && (
                                    <p className="text-red-400 text-sm mt-2 flex items-center gap-2">
                                        <span>⚠️</span>
                                        {error}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !steamId.trim()}
                                className="w-full px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        🔗 Connect Steam ID
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="w-full text-white/60 hover:text-white text-sm underline transition-colors"
                                disabled={loading}
                            >
                                {showInstructions ? 'Hide' : 'Show'} instructions for finding Steam ID
                            </button>

                            {/* Steam ID Instructions */}
                            {showInstructions && (
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                        <span>📋</span>
                                        How to find your Steam ID:
                                    </h4>
                                    <ol className="text-white/70 text-sm space-y-2 list-decimal list-inside">
                                        <li>Open Steam and go to your profile</li>
                                        <li>Right-click on your profile and select "Copy Page URL"</li>
                                        <li>If the URL contains numbers after '/profiles/', that's your Steam ID</li>
                                        <li>If it has a custom name, visit <span className="text-coral-400 font-medium">steamid.io</span> and paste your URL</li>
                                        <li>Your Steam ID should be 17 digits starting with 765611...</li>
                                    </ol>
                                    
                                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                        <p className="text-blue-300 text-xs">
                                            <strong>Example:</strong> {getInstructions().example}
                                        </p>
                                        <p className="text-blue-300 text-xs mt-1">
                                            <strong>Note:</strong> {getInstructions().note}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <p className="text-white/50 text-xs">
                            Safe & secure connection
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SteamConnectModal;