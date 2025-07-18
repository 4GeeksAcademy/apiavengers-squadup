// src/front/pages/FindGames.jsx - PHASE 5 IMPLEMENTATION: Standardized UI/UX Components

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService.js';

// 🚀 PHASE 5: Import standardized components
import { PageLoadingState, DataLoadingState } from '../components/LoadingState';
import { NetworkErrorState, SteamErrorState } from '../components/ErrorState';

const FindGames = () => {
    const { store } = useGlobalReducer();
    const [commonGames, setCommonGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // 🚀 PHASE 5: Enhanced error state
    const [fetchError, setFetchError] = useState(null); // 🚀 PHASE 5: Specific fetch error
    const [filters, setFilters] = useState({
        genre: '',
        multiplayer: false,
        minCoverage: 0
    });

    // Inline GameImage component with robust error handling
    const GameImage = ({ src, alt, className = "", fallbackText = "Game" }) => {
        const [imageError, setImageError] = useState(false);
        const [imageLoading, setImageLoading] = useState(true);

        // Create a simple inline SVG fallback
        const createSVGFallback = (text) => {
            const svgContent = `
                <svg width="460" height="215" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#334155;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#bg)"/>
                    <rect x="15" y="15" width="430" height="185" fill="#475569" stroke="#64748b" stroke-width="1" rx="8" opacity="0.8"/>
                    <text x="50%" y="45%" text-anchor="middle" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="18" font-weight="bold">
                        🎮 ${text.slice(0, 18)}
                    </text>
                    <text x="50%" y="65%" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="14">
                        Gaming Content
                    </text>
                    <circle cx="50" cy="50" r="20" fill="#64748b" opacity="0.3"/>
                    <circle cx="410" cy="165" r="15" fill="#64748b" opacity="0.3"/>
                    <rect x="50" y="150" width="60" height="20" fill="#64748b" opacity="0.3" rx="4"/>
                </svg>
            `;
            return `data:image/svg+xml;base64,${btoa(svgContent)}`;
        };

        const handleImageError = () => {
            setImageError(true);
            setImageLoading(false);
        };

        const handleImageLoad = () => {
            setImageLoading(false);
            setImageError(false);
        };

        if (imageError) {
            return (
                <img
                    src={createSVGFallback(fallbackText)}
                    alt={alt}
                    className={className}
                />
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
                />
            </>
        );
    };

    // Enhanced mock data with reliable CDN images for demo purposes
    const mockGames = [
        {
            id: 1,
            name: "Valorant",
            header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1172470/header.jpg",
            ownership_stats: { owners: 3, coverage_percentage: 75 },
            genres: ["Action", "FPS", "Tactical"],
            multiplayer: true,
            short_description: "Tactical 5v5 character-based shooter with unique agent abilities"
        },
        {
            id: 2,
            name: "Apex Legends",
            header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1172470/header.jpg",
            ownership_stats: { owners: 4, coverage_percentage: 100 },
            genres: ["Battle Royale", "Action", "FPS"],
            multiplayer: true,
            short_description: "Squad-based battle royale shooter with legendary characters"
        },
        {
            id: 3,
            name: "Minecraft",
            header_image: "https://cdn.akamai.steamstatic.com/steam/apps/323910/header.jpg",
            ownership_stats: { owners: 4, coverage_percentage: 100 },
            genres: ["Sandbox", "Survival", "Creative"],
            multiplayer: true,
            short_description: "Build, explore, and survive in infinite procedurally generated worlds"
        },
        {
            id: 4,
            name: "Rocket League",
            header_image: "https://cdn.akamai.steamstatic.com/steam/apps/252950/header.jpg",
            ownership_stats: { owners: 3, coverage_percentage: 75 },
            genres: ["Sports", "Racing", "Action"],
            multiplayer: true,
            short_description: "Soccer meets driving in this physics-based multiplayer game"
        },
        {
            id: 5,
            name: "Among Us",
            header_image: "https://cdn.akamai.steamstatic.com/steam/apps/945360/header.jpg",
            ownership_stats: { owners: 2, coverage_percentage: 50 },
            genres: ["Social Deduction", "Party", "Multiplayer"],
            multiplayer: true,
            short_description: "Find the impostor among your crewmates in this social deduction game"
        },
        {
            id: 6,
            name: "Counter-Strike 2",
            header_image: "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg",
            ownership_stats: { owners: 3, coverage_percentage: 75 },
            genres: ["FPS", "Tactical", "Competitive"],
            multiplayer: true,
            short_description: "The legendary tactical FPS returns with enhanced graphics and gameplay"
        },
        {
            id: 7,
            name: "Fall Guys",
            header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1097150/header.jpg",
            ownership_stats: { owners: 2, coverage_percentage: 50 },
            genres: ["Party", "Platformer", "Battle Royale"],
            multiplayer: true,
            short_description: "Colorful battle royale party game with obstacle courses and mini-games"
        },
        {
            id: 8,
            name: "Dead by Daylight",
            header_image: "https://cdn.akamai.steamstatic.com/steam/apps/381210/header.jpg",
            ownership_stats: { owners: 3, coverage_percentage: 75 },
            genres: ["Horror", "Survival", "Asymmetric"],
            multiplayer: true,
            short_description: "Asymmetric survival horror where one player hunts four survivors"
        },
        {
            id: 9,
            name: "Overwatch 2",
            header_image: "https://cdn.akamai.steamstatic.com/steam/apps/2357570/header.jpg",
            ownership_stats: { owners: 4, coverage_percentage: 100 },
            genres: ["Hero Shooter", "FPS", "Team-based"],
            multiplayer: true,
            short_description: "Team-based hero shooter with diverse characters and abilities"
        },
        {
            id: 10,
            name: "Phasmophobia",
            header_image: "https://cdn.akamai.steamstatic.com/steam/apps/739630/header.jpg",
            ownership_stats: { owners: 3, coverage_percentage: 75 },
            genres: ["Horror", "Co-op", "Investigation"],
            multiplayer: true,
            short_description: "Cooperative ghost hunting horror game with realistic investigation tools"
        }
    ];

    useEffect(() => {
        fetchCommonGames();
    }, [store.user]);

    // 🚀 PHASE 5: Enhanced fetchCommonGames with better error handling
    const fetchCommonGames = async () => {
        console.log('🎮 Fetching common games...');
        setLoading(true);
        setError(null);
        setFetchError(null);
        
        try {
            // Check if user has Steam connected and groups
            if (store.user?.steam_connected) {
                console.log('✅ User has Steam connected, attempting to fetch real data...');
                
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                
                try {
                    // First, check if user has any groups
                    const groupsResponse = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups`);
                    
                    if (groupsResponse.ok) {
                        const groupsData = await groupsResponse.json();
                        const userGroups = groupsData.groups || [];
                        
                        if (userGroups.length > 0) {
                            // Try to get common games from the first group
                            const firstGroup = userGroups[0];
                            console.log(`🔍 Trying to fetch common games from group: ${firstGroup.name}`);
                            
                            const commonGamesResponse = await authService.authenticatedFetch(
                                `${backendUrl}/api/gaming/groups/${firstGroup.id}/common-games`
                            );
                            
                            if (commonGamesResponse.ok) {
                                const commonGamesData = await commonGamesResponse.json();
                                console.log('✅ Successfully fetched real common games:', commonGamesData.games?.length || 0);
                                
                                if (commonGamesData.games && commonGamesData.games.length > 0) {
                                    setCommonGames(commonGamesData.games);
                                    setLoading(false);
                                    return;
                                }
                            }
                        }
                        
                        console.log('ℹ️ No groups or common games found, falling back to Steam library...');
                        
                        // Fallback: Get user's own games from Steam library
                        const libraryResponse = await authService.authenticatedFetch(`${backendUrl}/api/steam/owned-games`);
                        
                        if (libraryResponse.ok) {
                            const libraryData = await libraryResponse.json();
                            const userGames = libraryData.games || [];
                            
                            console.log('✅ Using user Steam library games:', userGames.length);
                            
                            // Convert user's games to common games format
                            const formattedGames = userGames
                                .filter(game => game.multiplayer) // Only show multiplayer games
                                .slice(0, 20) // Limit to 20 games
                                .map(game => ({
                                    ...game,
                                    ownership_stats: {
                                        owners: 1,
                                        coverage_percentage: 100
                                    },
                                    short_description: game.short_description || `${game.name} - From your Steam library`
                                }));
                            
                            if (formattedGames.length > 0) {
                                setCommonGames(formattedGames);
                                setLoading(false);
                                return;
                            }
                        }
                        
                        console.log('⚠️ No real games available, using demo data for better UX');
                        
                    } else {
                        // API error
                        const errorData = await groupsResponse.json();
                        throw new Error(errorData.error || 'Failed to fetch groups');
                    }
                    
                } catch (apiError) {
                    console.log('⚠️ API call failed:', apiError.message);
                    setFetchError(apiError.message);
                    
                    // Don't throw here, fall back to demo data
                }
            } else {
                console.log('ℹ️ Steam not connected, using demo data');
            }
            
            // Fallback to demo data (no error thrown)
            console.log('📋 Using demo data with CDN images for presentation');
            setCommonGames(mockGames);
            setError(null); // Clear any previous errors
            
        } catch (err) {
            console.error('❌ Unexpected error in fetchCommonGames:', err);
            // Even on error, show demo data for better UX
            setCommonGames(mockGames);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 🚀 PHASE 5: Enhanced retry function
    const handleRetry = () => {
        fetchCommonGames();
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const filteredGames = commonGames.filter(game => {
        const matchesGenre = !filters.genre || (game.genres && game.genres.includes(filters.genre));
        const matchesMultiplayer = !filters.multiplayer || game.multiplayer;
        const matchesCoverage = game.ownership_stats.coverage_percentage >= filters.minCoverage;
        
        return matchesGenre && matchesMultiplayer && matchesCoverage;
    });

    const allGenres = [...new Set(commonGames.flatMap(game => game.genres || []))];

    const getCoverageColor = (percentage) => {
        if (percentage >= 75) return 'text-green-400';
        if (percentage >= 50) return 'text-yellow-400';
        return 'text-orange-400';
    };

    const getCoverageBadge = (percentage) => {
        if (percentage === 100) return 'Perfect Match';
        if (percentage >= 75) return 'Great Match';
        if (percentage >= 50) return 'Good Match';
        return 'Partial Match';
    };

    // 🚀 PHASE 5: Use standardized PageLoadingState
    if (loading) {
        return <PageLoadingState message="Finding games you can play together..." />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            <div className="max-w-6xl mx-auto relative z-10">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Find Games</h1>
                        <p className="text-white/70">Discover games you can play with your squad</p>
                    </div>
                    <Link 
                        to="/dashboard"
                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl text-sm transition-colors duration-200"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Smart Status Banner */}
                {!store.user?.steam_connected ? (
                    <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
                        <div className="flex items-center space-x-2">
                            <span>ℹ️</span>
                            <div>
                                <strong>Demo Mode:</strong> Showing popular squad games. 
                                Connect your Steam account to see real common games with your friends!
                            </div>
                        </div>
                    </div>
                ) : commonGames.length === mockGames.length ? (
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm">
                        <div className="flex items-center space-x-2">
                            <span>🎮</span>
                            <div>
                                <strong>Steam Connected:</strong> Create or join groups to find common games with friends, 
                                or showing your Steam library games for now.
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 text-sm">
                        <div className="flex items-center space-x-2">
                            <span>✅</span>
                            <div>
                                <strong>Live Data:</strong> Showing real games from your Steam library and groups!
                            </div>
                        </div>
                    </div>
                )}

                {/* 🚀 PHASE 5: Enhanced error display for fetch errors */}
                {fetchError && (
                    <div className="mb-6">
                        <NetworkErrorState 
                            error={fetchError}
                            onRetry={handleRetry}
                            onRefresh={() => window.location.reload()}
                            helpText="Check your Steam connection and group memberships."
                            className="max-w-2xl mx-auto"
                        />
                    </div>
                )}

                {/* Filters */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Filter Games</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Genre</label>
                            <select
                                value={filters.genre}
                                onChange={(e) => handleFilterChange('genre', e.target.value)}
                                className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-coral-500 transition-colors"
                            >
                                <option value="">All Genres</option>
                                {allGenres.map(genre => (
                                    <option key={genre} value={genre}>{genre}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-white/70 text-sm mb-2">Coverage</label>
                            <select
                                value={filters.minCoverage}
                                onChange={(e) => handleFilterChange('minCoverage', parseInt(e.target.value))}
                                className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-coral-500 transition-colors"
                            >
                                <option value={0}>Any Coverage</option>
                                <option value={50}>50%+ Coverage</option>
                                <option value={75}>75%+ Coverage</option>
                                <option value={100}>Perfect Match (100%)</option>
                            </select>
                        </div>
                        
                        <div className="flex items-end">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.multiplayer}
                                    onChange={(e) => handleFilterChange('multiplayer', e.target.checked)}
                                    className="w-4 h-4 bg-white/10 border border-white/30 rounded focus:ring-coral-500 focus:ring-2 text-coral-500"
                                />
                                <span className="text-white/80">Multiplayer Only</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Games Grid */}
                {filteredGames.length > 0 ? (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">
                                {store.user?.steam_connected ? 'Available Games' : 'Demo Games'} ({filteredGames.length})
                            </h2>
                            <div className="text-white/60 text-sm">
                                {filteredGames.filter(g => g.ownership_stats.coverage_percentage === 100).length} perfect matches
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredGames.map(game => (
                                <div key={game.id} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden shadow-2xl hover:bg-white/15 transition-all duration-300 group">
                                    <div className="relative">
                                        <GameImage
                                            src={game.header_image}
                                            alt={game.name}
                                            fallbackText={game.name}
                                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className={`absolute top-3 right-3 px-3 py-1 rounded-lg text-sm font-bold backdrop-blur-sm ${
                                            game.ownership_stats.coverage_percentage >= 75 ? 'bg-green-500/90 text-white' :
                                            game.ownership_stats.coverage_percentage >= 50 ? 'bg-yellow-500/90 text-black' :
                                            'bg-orange-500/90 text-white'
                                        }`}>
                                            {game.ownership_stats.coverage_percentage}%
                                        </div>
                                    </div>
                                    
                                    <div className="p-5">
                                        <h3 className="text-white font-bold text-xl mb-3 group-hover:text-coral-300 transition-colors">
                                            {game.name}
                                        </h3>
                                        
                                        {game.short_description && (
                                            <p className="text-white/70 text-sm mb-4 line-clamp-2 leading-relaxed">
                                                {game.short_description}
                                            </p>
                                        )}
                                        
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/60 text-sm">Squad Coverage:</span>
                                                <span className={`font-bold text-sm ${getCoverageColor(game.ownership_stats.coverage_percentage)}`}>
                                                    {getCoverageBadge(game.ownership_stats.coverage_percentage)}
                                                </span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/60 text-sm">Owners:</span>
                                                <span className="text-white font-medium">
                                                    {game.ownership_stats.owners} players
                                                </span>
                                            </div>
                                            
                                            {game.genres && game.genres.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-3">
                                                    {game.genres.slice(0, 3).map(genre => (
                                                        <span key={genre} className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80">
                                                            {genre}
                                                        </span>
                                                    ))}
                                                    {game.genres.length > 3 && (
                                                        <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/60">
                                                            +{game.genres.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {game.multiplayer && (
                                                <div className="mt-3">
                                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                                                        🎮 Multiplayer
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="mt-5 pt-4 border-t border-white/10">
                                            <button className="w-full px-4 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg">
                                                Start Game Session 🚀
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 text-center">
                        <div className="text-6xl mb-4">🎮</div>
                        <h3 className="text-2xl font-bold text-white mb-4">No Games Found</h3>
                        <p className="text-white/70 mb-6">
                            Try adjusting your filters to see more games!
                        </p>
                        <button 
                            onClick={() => setFilters({ genre: '', multiplayer: false, minCoverage: 0 })}
                            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200"
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="mt-12 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Link 
                            to="/dashboard"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">👥</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Create Group</h4>
                                <p className="text-white/60 text-sm">Start a new gaming squad</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="/profile"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">🎮</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Sync Steam</h4>
                                <p className="text-white/60 text-sm">Update your game library</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="/friends"
                            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-2xl">🔍</span>
                            <div>
                                <h4 className="text-white font-medium group-hover:text-coral-300 transition-colors">Find Friends</h4>
                                <p className="text-white/60 text-sm">Connect with new players</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FindGames;