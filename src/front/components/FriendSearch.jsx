// src/front/components/FriendSearch.jsx - Friend Search Component

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * FriendSearch Component
 * Handles friend searching and filtering functionality
 * Extracted from Friends.jsx for better component organization
 */
const FriendSearch = ({ 
    friends = [],
    onSearchResults,
    onAddFriend,
    placeholder = "Search friends...",
    className = ""
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [isSearching, setIsSearching] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    const searchInputRef = useRef(null);
    const debounceRef = useRef(null);

    // Available filter options
    const filterOptions = [
        { value: 'all', label: 'All Friends', count: friends.length },
        { value: 'online', label: 'Online', count: friends.filter(f => f.status === 'online').length },
        { value: 'away', label: 'Away', count: friends.filter(f => f.status === 'away').length },
        { value: 'offline', label: 'Offline', count: friends.filter(f => f.status === 'offline').length },
        { value: 'steam', label: 'Steam Connected', count: friends.filter(f => f.steamConnected).length },
        { value: 'playing', label: 'Currently Playing', count: friends.filter(f => f.currentGame).length }
    ];

    // Available sort options
    const sortOptions = [
        { value: 'name', label: 'Name (A-Z)' },
        { value: 'status', label: 'Status (Online First)' },
        { value: 'activity', label: 'Recent Activity' },
        { value: 'groups', label: 'Mutual Groups' },
        { value: 'games', label: 'Total Games' }
    ];

    /**
     * Filter and sort friends based on current criteria
     */
    const getFilteredAndSortedFriends = () => {
        let filtered = [...friends];

        // Apply search filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(friend =>
                (friend.displayName || '').toLowerCase().includes(searchLower) ||
                (friend.username || '').toLowerCase().includes(searchLower) ||
                (friend.bio || '').toLowerCase().includes(searchLower) ||
                (friend.currentGame || '').toLowerCase().includes(searchLower) ||
                (friend.favoriteGenres || []).some(genre => 
                    genre.toLowerCase().includes(searchLower)
                )
            );
        }

        // Apply status/type filter
        switch (filter) {
            case 'online':
                filtered = filtered.filter(f => f.status === 'online');
                break;
            case 'away':
                filtered = filtered.filter(f => f.status === 'away');
                break;
            case 'offline':
                filtered = filtered.filter(f => f.status === 'offline');
                break;
            case 'steam':
                filtered = filtered.filter(f => f.steamConnected);
                break;
            case 'playing':
                filtered = filtered.filter(f => f.currentGame);
                break;
            default:
                // 'all' - no additional filtering
                break;
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'status':
                    const statusOrder = { 'online': 0, 'away': 1, 'offline': 2 };
                    const aStatus = statusOrder[a.status] ?? 3;
                    const bStatus = statusOrder[b.status] ?? 3;
                    if (aStatus !== bStatus) return aStatus - bStatus;
                    return (a.displayName || a.username).localeCompare(b.displayName || b.username);
                    
                case 'activity':
                    if (a.currentGame && !b.currentGame) return -1;
                    if (!a.currentGame && b.currentGame) return 1;
                    if (a.status === 'online' && b.status !== 'online') return -1;
                    if (a.status !== 'online' && b.status === 'online') return 1;
                    return (a.displayName || a.username).localeCompare(b.displayName || b.username);
                    
                case 'groups':
                    const aMutual = a.mutualGroups || 0;
                    const bMutual = b.mutualGroups || 0;
                    if (aMutual !== bMutual) return bMutual - aMutual;
                    return (a.displayName || a.username).localeCompare(b.displayName || b.username);
                    
                case 'games':
                    const aGames = a.totalGames || 0;
                    const bGames = b.totalGames || 0;
                    if (aGames !== bGames) return bGames - aGames;
                    return (a.displayName || a.username).localeCompare(b.displayName || b.username);
                    
                case 'name':
                default:
                    return (a.displayName || a.username).localeCompare(b.displayName || b.username);
            }
        });

        return filtered;
    };

    /**
     * Debounced search effect
     */
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            const results = getFilteredAndSortedFriends();
            if (onSearchResults) {
                onSearchResults(results, searchTerm, filter, sortBy);
            }
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [searchTerm, filter, sortBy, friends]);

    /**
     * Handle search input change
     */
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setIsSearching(true);
        
        // Stop searching animation after a short delay
        setTimeout(() => setIsSearching(false), 500);
    };

    /**
     * Clear search and filters
     */
    const clearSearch = () => {
        setSearchTerm('');
        setFilter('all');
        setSortBy('name');
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    /**
     * Handle quick filter clicks
     */
    const handleQuickFilter = (filterValue) => {
        setFilter(filterValue);
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    /**
     * Handle add friend action
     */
    const handleAddFriend = () => {
        if (onAddFriend) {
            onAddFriend();
        } else {
            toast.info('Add friend feature coming soon!');
        }
    };

    const filteredResults = getFilteredAndSortedFriends();
    const hasActiveFilters = searchTerm.trim() || filter !== 'all' || sortBy !== 'name';

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Main Search Bar */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            placeholder={placeholder}
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 pl-12 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 transition-all"
                        />
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40">
                            {isSearching ? (
                                <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                '🔍'
                            )}
                        </div>
                        
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Add Friend Button */}
                    <button 
                        onClick={handleAddFriend}
                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200 flex items-center space-x-2"
                    >
                        <span>+</span>
                        <span>Add Friend</span>
                    </button>

                    {/* Advanced Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`px-4 py-3 border border-white/30 text-white font-medium rounded-xl transition-colors duration-200 ${
                            showAdvanced ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
                        }`}
                    >
                        ⚙️ {showAdvanced ? 'Hide' : 'Show'} Filters
                    </button>
                </div>

                {/* Advanced Filters */}
                {showAdvanced && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Filter By */}
                            <div>
                                <label className="block text-white/70 text-sm mb-2 font-medium">
                                    Filter By
                                </label>
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-coral-500 transition-colors"
                                >
                                    {filterOptions.map(option => (
                                        <option key={option.value} value={option.value} className="bg-slate-800">
                                            {option.label} ({option.count})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Sort By */}
                            <div>
                                <label className="block text-white/70 text-sm mb-2 font-medium">
                                    Sort By
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-coral-500 transition-colors"
                                >
                                    {sortOptions.map(option => (
                                        <option key={option.value} value={option.value} className="bg-slate-800">
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2">
                {filterOptions.slice(0, 4).map(option => (
                    <button
                        key={option.value}
                        onClick={() => handleQuickFilter(option.value)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            filter === option.value
                                ? 'bg-coral-500 text-white'
                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                        {option.label} ({option.count})
                    </button>
                ))}
            </div>

            {/* Search Results Summary */}
            <div className="flex items-center justify-between text-sm">
                <div className="text-white/70">
                    {filteredResults.length === friends.length ? (
                        `${friends.length} friends`
                    ) : (
                        `${filteredResults.length} of ${friends.length} friends`
                    )}
                    {searchTerm && (
                        <span> matching "{searchTerm}"</span>
                    )}
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={clearSearch}
                        className="text-coral-400 hover:text-coral-300 underline transition-colors"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* No Results Message */}
            {filteredResults.length === 0 && friends.length > 0 && (
                <div className="text-center py-8">
                    <div className="text-4xl mb-2">🔍</div>
                    <h3 className="text-white font-semibold mb-2">No friends found</h3>
                    <p className="text-white/60 mb-4">
                        {searchTerm ? (
                            `No friends match "${searchTerm}" with current filters`
                        ) : (
                            `No friends match the current filters`
                        )}
                    </p>
                    <button
                        onClick={clearSearch}
                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors"
                    >
                        Clear filters
                    </button>
                </div>
            )}

            {/* Empty State */}
            {friends.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-bold text-white mb-2">No friends yet</h3>
                    <p className="text-white/60 mb-6">
                        Start building your gaming network by adding friends
                    </p>
                    <button
                        onClick={handleAddFriend}
                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                    >
                        Add Your First Friend
                    </button>
                </div>
            )}
        </div>
    );
};

export default FriendSearch;