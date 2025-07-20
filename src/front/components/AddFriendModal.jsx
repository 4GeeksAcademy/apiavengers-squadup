// src/front/components/AddFriendModal.jsx - Updated with Custom Button Classes

import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import authService from '../store/authService';
import Avatar from './Avatar';

/**
 * AddFriendModal Component
 * Handles adding friends by username, email, or Steam ID
 * Extracted from Friends.jsx for better component organization
 */
const AddFriendModal = ({ 
    isOpen, 
    onClose, 
    onFriendAdded,
    className = ""
}) => {
    const [searchType, setSearchType] = useState('username'); // username, email, steam
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [inviteSent, setInviteSent] = useState(false);
    const [error, setError] = useState('');
    
    const searchInputRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // Search types configuration
    const searchTypes = [
        { 
            value: 'username', 
            label: 'Username', 
            placeholder: 'Enter username...',
            icon: '👤',
            description: 'Search by SquadUp username'
        },
        { 
            value: 'email', 
            label: 'Email', 
            placeholder: 'Enter email address...',
            icon: '📧',
            description: 'Search by email address'
        },
        { 
            value: 'steam', 
            label: 'Steam ID', 
            placeholder: 'Enter Steam ID or profile URL...',
            icon: '🎮',
            description: 'Search by Steam ID or profile URL'
        }
    ];

    const currentSearchType = searchTypes.find(type => type.value === searchType);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setError('');
            setInviteSent(false);
            // Focus input after a short delay to ensure modal is fully rendered
            setTimeout(() => {
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            }, 100);
        }
    }, [isOpen]);

    // Debounced search effect
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim().length >= 3) {
            searchTimeoutRef.current = setTimeout(() => {
                performSearch();
            }, 500);
        } else {
            setSearchResults([]);
            setError('');
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, searchType]);

    /**
     * Perform friend search based on current criteria
     */
    const performSearch = async () => {
        if (!searchQuery.trim() || searchQuery.trim().length < 3) {
            return;
        }

        setSearching(true);
        setError('');
        setSearchResults([]);

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            // Construct search endpoint based on type
            let endpoint = `/api/friends/search`;
            const params = new URLSearchParams();
            
            switch (searchType) {
                case 'username':
                    params.append('username', searchQuery.trim());
                    break;
                case 'email':
                    params.append('email', searchQuery.trim());
                    break;
                case 'steam':
                    params.append('steam_id', searchQuery.trim());
                    break;
                default:
                    throw new Error('Invalid search type');
            }
            
            endpoint += `?${params.toString()}`;
            
            const response = await authService.authenticatedFetch(`${backendUrl}${endpoint}`);
            
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data.users || []);
                
                if ((data.users || []).length === 0) {
                    setError(`No users found matching "${searchQuery}"`);
                }
            } else if (response.status === 404) {
                setError(`No users found matching "${searchQuery}"`);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Search failed');
            }
        } catch (error) {
            console.error('Friend search error:', error);
            setError('Search failed. Please try again.');
        } finally {
            setSearching(false);
        }
    };

    /**
     * Send friend invitation
     */
    const sendFriendInvite = async (targetUser) => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            
            const response = await authService.authenticatedFetch(`${backendUrl}/api/friends/invite`, {
                method: 'POST',
                body: JSON.stringify({
                    target_user_id: targetUser.id,
                    invitation_method: searchType
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                setInviteSent(true);
                toast.success(`Friend invitation sent to ${targetUser.username}!`);
                
                // Notify parent component
                if (onFriendAdded) {
                    onFriendAdded(targetUser, 'invite_sent');
                }
                
                // Auto-close modal after success
                setTimeout(() => {
                    onClose();
                }, 2000);
                
            } else {
                const errorData = await response.json();
                
                if (errorData.error?.includes('already friends')) {
                    toast.info(`You're already friends with ${targetUser.username}`);
                } else if (errorData.error?.includes('pending')) {
                    toast.info(`Friend invitation already sent to ${targetUser.username}`);
                } else {
                    toast.error(errorData.error || 'Failed to send friend invitation');
                }
            }
        } catch (error) {
            console.error('Friend invite error:', error);
            toast.error('Failed to send friend invitation');
        }
    };

    /**
     * Handle search type change
     */
    const handleSearchTypeChange = (newType) => {
        setSearchType(newType);
        setSearchQuery('');
        setSearchResults([]);
        setError('');
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    /**
     * Handle modal close
     */
    const handleClose = () => {
        if (!searching) {
            onClose();
        }
    };

    /**
     * Validate search input
     */
    const validateInput = (value, type) => {
        switch (type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            case 'steam':
                // Basic Steam ID validation (17 digits or URL format)
                return /^\d{17}$/.test(value) || value.includes('steamcommunity.com');
            case 'username':
            default:
                return value.length >= 3;
        }
    };

    const isValidInput = validateInput(searchQuery.trim(), searchType);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div 
                className={`card-gaming w-full max-w-2xl max-h-[90vh] overflow-hidden ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white flex items-center">
                            <span className="mr-2">👥</span>
                            Add Friend
                        </h2>
                        <button
                            onClick={handleClose}
                            disabled={searching}
                            className="text-white/60 hover:text-white transition-colors p-1 disabled:opacity-50"
                        >
                            <span className="text-xl">✕</span>
                        </button>
                    </div>
                    <p className="text-white/60 text-sm mt-2">
                        Find and connect with other gamers on SquadUp
                    </p>
                </div>

                {/* Search Type Selector */}
                <div className="p-6 border-b border-white/10">
                    <label className="block text-white/70 text-sm mb-3 font-medium">
                        Search Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {searchTypes.map(type => (
                            <button
                                key={type.value}
                                onClick={() => handleSearchTypeChange(type.value)}
                                disabled={searching}
                                className={`p-3 rounded-xl border transition-all disabled:opacity-50 ${
                                    searchType === type.value
                                        ? 'bg-coral-500/20 border-coral-500/50 text-coral-300'
                                        : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                                }`}
                            >
                                <div className="text-lg mb-1">{type.icon}</div>
                                <div className="text-sm font-medium">{type.label}</div>
                            </button>
                        ))}
                    </div>
                    <p className="text-white/50 text-xs mt-2">
                        {currentSearchType?.description}
                    </p>
                </div>

                {/* Search Input */}
                <div className="p-6">
                    <label className="block text-white/70 text-sm mb-2 font-medium">
                        {currentSearchType?.label}
                    </label>
                    <div className="relative">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={currentSearchType?.placeholder}
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 pl-12 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 transition-all"
                            disabled={searching}
                        />
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40">
                            {searching ? (
                                <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                currentSearchType?.icon
                            )}
                        </div>
                        
                        {searchQuery && !searching && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                {isValidInput ? (
                                    <span className="text-green-400">✓</span>
                                ) : (
                                    <span className="text-red-400">✗</span>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {searchQuery.length > 0 && searchQuery.length < 3 && (
                        <p className="text-yellow-400 text-xs mt-1">
                            Enter at least 3 characters to search
                        </p>
                    )}
                </div>

                {/* Search Results */}
                <div className="px-6 pb-6 max-h-80 overflow-y-auto">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {inviteSent && (
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 text-sm mb-4">
                            <div className="flex items-center">
                                <span className="mr-2">✅</span>
                                Friend invitation sent successfully!
                            </div>
                        </div>
                    )}

                    {searchResults.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-white font-medium text-sm">
                                Search Results ({searchResults.length})
                            </h4>
                            {searchResults.map(user => (
                                <div key={user.id} className="p-4 bg-white/5 border border-white/20 rounded-xl hover:bg-white/10 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Avatar name={user.username} size={40} />
                                            <div>
                                                <h5 className="text-white font-medium">{user.username}</h5>
                                                {user.displayName && user.displayName !== user.username && (
                                                    <p className="text-white/60 text-sm">{user.displayName}</p>
                                                )}
                                                <div className="flex items-center space-x-2 mt-1">
                                                    {user.steam_connected && (
                                                        <span className="text-green-400 text-xs">🎮 Steam</span>
                                                    )}
                                                    {user.total_games && (
                                                        <span className="text-white/50 text-xs">{user.total_games} games</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={() => sendFriendInvite(user)}
                                            disabled={inviteSent}
                                            className="btn-coral"
                                        >
                                            {inviteSent ? 'Sent!' : 'Add Friend'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {searching && (
                        <div className="text-center py-8">
                            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-white/60">Searching for users...</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="text-white/50 text-xs">
                            <p>💡 Tip: Make sure your friends' profiles are public for Steam ID search</p>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={searching}
                            className="btn-ghost"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddFriendModal;