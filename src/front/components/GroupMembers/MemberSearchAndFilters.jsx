import React from 'react';

const MemberSearchAndFilters = ({ 
    searchTerm, 
    setSearchTerm, 
    filter, 
    setFilter, 
    sortBy, 
    setSortBy,
    memberCounts = {},
    loading = false 
}) => {
    const handleClearFilters = () => {
        setSearchTerm('');
        setFilter('all');
    };
    
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <span className="text-xl mr-2">🔍</span>
                Search & Filter Members
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search Input */}
                <div>
                    <label className="block text-white/70 text-sm mb-2">Search Members</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by username, email, or Steam..."
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 pl-10 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 transition-colors"
                            disabled={loading}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
                            🔍
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Filter Dropdown */}
                <div>
                    <label className="block text-white/70 text-sm mb-2">Filter By</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-coral-500 transition-colors"
                        disabled={loading}
                    >
                        <option value="all">
                            All Members ({memberCounts.total || 0})
                        </option>
                        <option value="steam">
                            Steam Connected ({memberCounts.steamConnected || 0})
                        </option>
                        <option value="no-steam">
                            No Steam ({memberCounts.noSteam || 0})
                        </option>
                        <option value="creators">
                            Creators ({memberCounts.creators || 0})
                        </option>
                    </select>
                </div>
                
                {/* Sort Dropdown */}
                <div>
                    <label className="block text-white/70 text-sm mb-2">Sort By</label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-coral-500 transition-colors"
                        disabled={loading}
                    >
                        <option value="name">Name (A-Z)</option>
                        <option value="role">Role (Creator First)</option>
                        <option value="joinDate">Join Date (Newest)</option>
                        <option value="activity">Activity (Steam + Games)</option>
                        <option value="games">Game Count (Highest)</option>
                    </select>
                </div>
            </div>
            
            {/* Active Filters Display */}
            {(searchTerm || filter !== 'all') && (
                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="text-white/70 text-sm">Active filters:</span>
                        {searchTerm && (
                            <span className="px-2 py-1 bg-coral-500/20 text-coral-300 rounded text-xs">
                                Search: "{searchTerm}"
                            </span>
                        )}
                        {filter !== 'all' && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                                Filter: {filter}
                            </span>
                        )}
                    </div>
                    
                    <button
                        onClick={handleClearFilters}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded text-sm transition-colors"
                    >
                        Clear Filters
                    </button>
                </div>
            )}
        </div>
    );
};

export default MemberSearchAndFilters;