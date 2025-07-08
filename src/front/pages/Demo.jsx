import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

// Import local game images
import valorantImage from "../assets/img/games/valorant.jpg";
import apexImage from "../assets/img/games/apex-legends.jpg";
import rocketLeagueImage from "../assets/img/games/rocket-league.jpg";
import amongUsImage from "../assets/img/games/among-us.jpg";
import minecraftImage from "../assets/img/games/minecraft.jpg";
import cs2Image from "../assets/img/games/cs2.jpg";
import fallGuysImage from "../assets/img/games/fall-guys.jpg";
import dbdImage from "../assets/img/games/dead-by-daylight.jpg";
import overwatchImage from "../assets/img/games/overwatch-2.jpg";
import phasmophobiaImage from "../assets/img/games/phasmophobia.jpg";

export const Demo = () => {
    const { store, dispatch } = useGlobalReducer();
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedGames, setSelectedGames] = useState([]);
    const [votingResults, setVotingResults] = useState({});
    const [syncingProgress, setSyncingProgress] = useState({});

    // Mock Steam account data
    const mockSteamAccounts = [
        {
            id: "demo_user_001",
            username: "GamerPro2024",
            displayName: "Alex Rivera",
            avatar: "https://via.placeholder.com/64x64/ff7f50/ffffff?text=AR",
            profileUrl: "https://steamcommunity.com/id/gamerpro2024",
            level: 42,
            totalGames: 156,
            recentlyPlayed: ["Valorant", "Apex Legends", "Rocket League"]
        }
    ];

    // LOCAL GAME ASSETS - Now using real imported images
    const mockUserLibrary = [
        { 
            id: 1, 
            name: "Valorant", 
            appId: 1234567, 
            hours: 245, 
            lastPlayed: "2 hours ago", 
            genre: "FPS", 
            multiplayer: true, 
            image: valorantImage
        },
        { 
            id: 2, 
            name: "Apex Legends", 
            appId: 1172470, 
            hours: 189, 
            lastPlayed: "1 day ago", 
            genre: "Battle Royale", 
            multiplayer: true, 
            image: apexImage
        },
        { 
            id: 3, 
            name: "Rocket League", 
            appId: 252950, 
            hours: 134, 
            lastPlayed: "3 days ago", 
            genre: "Sports", 
            multiplayer: true, 
            image: rocketLeagueImage
        },
        { 
            id: 4, 
            name: "Among Us", 
            appId: 945360, 
            hours: 56, 
            lastPlayed: "1 week ago", 
            genre: "Social", 
            multiplayer: true, 
            image: amongUsImage
        },
        { 
            id: 5, 
            name: "Minecraft", 
            appId: 12345, 
            hours: 312, 
            lastPlayed: "5 days ago", 
            genre: "Sandbox", 
            multiplayer: true, 
            image: minecraftImage
        },
        { 
            id: 6, 
            name: "CS2", 
            appId: 730, 
            hours: 89, 
            lastPlayed: "2 weeks ago", 
            genre: "FPS", 
            multiplayer: true, 
            image: cs2Image
        },
        { 
            id: 7, 
            name: "Fall Guys", 
            appId: 1097150, 
            hours: 23, 
            lastPlayed: "1 month ago", 
            genre: "Party", 
            multiplayer: true, 
            image: fallGuysImage
        },
        { 
            id: 8, 
            name: "Dead by Daylight", 
            appId: 381210, 
            hours: 67, 
            lastPlayed: "2 weeks ago", 
            genre: "Horror", 
            multiplayer: true, 
            image: dbdImage
        },
        { 
            id: 9, 
            name: "Overwatch 2", 
            appId: 2357570, 
            hours: 198, 
            lastPlayed: "4 days ago", 
            genre: "FPS", 
            multiplayer: true, 
            image: overwatchImage
        },
        { 
            id: 10, 
            name: "Phasmophobia", 
            appId: 739630, 
            hours: 45, 
            lastPlayed: "3 weeks ago", 
            genre: "Horror", 
            multiplayer: true, 
            image: phasmophobiaImage
        }
    ];

    // Mock squad members with different game ownership
    const demoSquad = [
        { 
            id: 1, 
            name: "You (GamerPro2024)", 
            avatar: "🎮", 
            steamConnected: true,
            ownedGames: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // Owns all games
        },
        { 
            id: 2, 
            name: "Tyler_Beast", 
            avatar: "⚡", 
            steamConnected: true,
            ownedGames: [1, 2, 3, 5, 6, 9] // Missing some games
        },
        { 
            id: 3, 
            name: "Luna_Gaming", 
            avatar: "🔥", 
            steamConnected: true,
            ownedGames: [1, 2, 4, 5, 7, 8] // Different selection
        },
        { 
            id: 4, 
            name: "NoobMaster", 
            avatar: "💎", 
            steamConnected: false,
            ownedGames: [] // Not connected
        }
    ];

    const demoSteps = [
        "Mock Steam Login",
        "View Your Library",
        "Sync Squad Libraries", 
        "Find Common Games",
        "Vote & Play"
    ];

    // Auto-advance demo
    useEffect(() => {
        const timer = setInterval(() => {
            if (currentStep < demoSteps.length - 1) {
                setCurrentStep(prev => prev + 1);
            }
        }, 6000);

        return () => clearInterval(timer);
    }, [currentStep]);

    // Simulate Steam login
    const handleSteamLogin = () => {
        setIsLoggedIn(true);
        setCurrentUser(mockSteamAccounts[0]);
        setTimeout(() => setCurrentStep(1), 1000);
    };

    // Simulate library sync
    const simulateSync = (userId) => {
        setSyncingProgress(prev => ({ ...prev, [userId]: 0 }));
        
        const interval = setInterval(() => {
            setSyncingProgress(prev => {
                const newProgress = (prev[userId] || 0) + 10;
                if (newProgress >= 100) {
                    clearInterval(interval);
                    return { ...prev, [userId]: 100 };
                }
                return { ...prev, [userId]: newProgress };
            });
        }, 200);
    };

    // Get common games
    const getCommonGames = () => {
        const connectedMembers = demoSquad.filter(member => member.steamConnected);
        const commonGames = mockUserLibrary.filter(game => {
            const ownersCount = connectedMembers.filter(member => 
                member.ownedGames.includes(game.id)
            ).length;
            return ownersCount > 1; // At least 2 people own it
        }).map(game => {
            const ownersCount = connectedMembers.filter(member => 
                member.ownedGames.includes(game.id)
            ).length;
            return {
                ...game,
                ownersCount,
                coverage: Math.round((ownersCount / connectedMembers.length) * 100)
            };
        }).sort((a, b) => b.coverage - a.coverage);

        return commonGames;
    };

    const getCoverageColor = (coverage) => {
        if (coverage === 100) return "text-green-400";
        if (coverage >= 75) return "text-yellow-400";
        if (coverage >= 50) return "text-orange-400";
        return "text-red-400";
    };

    const handleVote = (gameId) => {
        setVotingResults(prev => ({
            ...prev,
            [gameId]: (prev[gameId] || 0) + 1
        }));
    };

    // Helper function for fallback images
    const getImageWithFallback = (originalImage, gameName) => {
        return originalImage || `https://via.placeholder.com/150x60/0066cc/ffffff?text=${gameName.slice(0,3).toUpperCase()}`;
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="space-y-6 text-center">
                        <h3 className="text-2xl font-bold text-white mb-6">Demo: Connect to Steam</h3>
                        
                        {!isLoggedIn ? (
                            <div className="space-y-6">
                                <div className="glass rounded-2xl p-8 max-w-md mx-auto">
                                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl">🎮</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-4">Demo Steam Account</h4>
                                    <p className="text-white/70 mb-6">
                                        This is a mock Steam integration for demonstration purposes. 
                                        No real Steam login required!
                                    </p>
                                    <button 
                                        onClick={handleSteamLogin}
                                        className="btn-marine w-full py-3"
                                    >
                                        🎮 Connect Demo Steam Account
                                    </button>
                                </div>
                                
                                <div className="text-white/60 text-sm">
                                    <p>⚡ Instant demo - no registration needed</p>
                                    <p>🔒 Your real Steam account stays private</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="glass rounded-2xl p-6 max-w-md mx-auto">
                                    <div className="flex items-center space-x-4">
                                        <img 
                                            src={currentUser.avatar} 
                                            alt="Steam Avatar" 
                                            className="w-16 h-16 rounded-full"
                                            onError={(e) => {
                                                e.target.src = "https://via.placeholder.com/64x64/ff7f50/ffffff?text=AR";
                                            }}
                                        />
                                        <div className="text-left">
                                            <h4 className="text-lg font-bold text-white">{currentUser.displayName}</h4>
                                            <p className="text-marine-400">@{currentUser.username}</p>
                                            <p className="text-white/70 text-sm">Level {currentUser.level} • {currentUser.totalGames} games</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center space-x-2 text-green-400">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    <span>Connected Successfully!</span>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 1:
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white mb-6">Your Steam Library</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto scrollbar-hide">
                            {mockUserLibrary.map(game => (
                                <div key={game.id} className="glass rounded-xl p-4 flex items-center space-x-4 hover:bg-white/15 transition-all duration-300">
                                    <div className="relative group cursor-pointer">
                                        <img 
                                            src={game.image} 
                                            alt={game.name}
                                            className="w-20 h-12 rounded object-cover flex-shrink-0 transition-all duration-300 transform group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-cyan-500/30 group-active:scale-95"
                                            onError={(e) => {
                                                e.target.src = getImageWithFallback(null, game.name);
                                            }}
                                            onClick={() => {
                                                // Optional: Add click sound or feedback
                                                console.log(`Clicked on ${game.name}`);
                                            }}
                                        />
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded flex items-end justify-center pb-1">
                                            <span className="text-white text-xs font-medium">View</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-white font-medium group-hover:text-cyan-300 transition-colors duration-300">{game.name}</h4>
                                        <p className="text-white/70 text-sm">{game.hours}h played • {game.lastPlayed}</p>
                                        <p className="text-marine-400 text-xs">{game.genre} • Multiplayer</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="text-center text-white/70">
                            <p>{mockUserLibrary.length} games found • {mockUserLibrary.filter(g => g.multiplayer).length} multiplayer games</p>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white mb-6">Sync Squad Libraries</h3>
                        <div className="space-y-4">
                            {demoSquad.map(member => (
                                <div key={member.id} className="glass rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xl">{member.avatar}</span>
                                            <div>
                                                <span className="text-white font-medium">{member.name}</span>
                                                {member.steamConnected && (
                                                    <p className="text-white/70 text-sm">{member.ownedGames.length} games owned</p>
                                                )}
                                            </div>
                                        </div>
                                        {member.steamConnected ? (
                                            <div className="flex items-center space-x-2">
                                                {syncingProgress[member.id] === 100 ? (
                                                    <>
                                                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                                        <span className="text-green-300 text-sm">Synced</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-marine-400 text-sm">
                                                            {syncingProgress[member.id] || 0}%
                                                        </span>
                                                        <button 
                                                            onClick={() => simulateSync(member.id)}
                                                            className="btn-marine px-3 py-1 text-sm"
                                                            disabled={syncingProgress[member.id] > 0}
                                                        >
                                                            Sync
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-red-300 text-sm">Not Connected</span>
                                        )}
                                    </div>
                                    
                                    {member.steamConnected && syncingProgress[member.id] > 0 && (
                                        <div className="w-full bg-white/10 rounded-full h-2">
                                            <div 
                                                className="bg-marine-500 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${syncingProgress[member.id] || 0}%` }}
                                            ></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        <div className="text-center">
                            <button 
                                onClick={() => {
                                    demoSquad.filter(m => m.steamConnected).forEach(member => {
                                        simulateSync(member.id);
                                    });
                                }}
                                className="btn-coral"
                            >
                                Sync All Connected Members
                            </button>
                        </div>
                    </div>
                );

            case 3:
                const commonGames = getCommonGames();
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white mb-6">Common Games Found</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                            {commonGames.map(game => (
                                <div key={game.id} className="glass rounded-xl p-4 flex items-center justify-between hover:bg-white/15 transition-all duration-300">
                                    <div className="flex items-center space-x-4">
                                        <div className="relative group cursor-pointer">
                                            <img 
                                                src={game.image} 
                                                alt={game.name}
                                                className="w-20 h-12 rounded object-cover flex-shrink-0 transition-all duration-300 transform group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-green-500/30 group-active:scale-95"
                                                onError={(e) => {
                                                    e.target.src = getImageWithFallback(null, game.name);
                                                }}
                                                onClick={() => {
                                                    console.log(`Viewing ${game.name} - ${game.coverage}% coverage`);
                                                }}
                                            />
                                            {/* Hover overlay with coverage info */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded flex items-end justify-center pb-1">
                                                <span className="text-white text-xs font-medium">{game.coverage}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium hover:text-green-300 transition-colors duration-300">{game.name}</h4>
                                            <p className="text-white/70 text-sm">{game.genre} • Multiplayer</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${getCoverageColor(game.coverage)}`}>
                                            {game.coverage}% Coverage
                                        </p>
                                        <p className="text-white/70 text-sm">
                                            {game.ownersCount}/{demoSquad.filter(m => m.steamConnected).length} own this
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="text-center">
                            <p className="text-white/70">
                                {commonGames.length} games everyone can play together!
                            </p>
                        </div>
                    </div>
                );

            case 4:
                const topGames = getCommonGames().slice(0, 4);
                const winningGame = topGames.reduce((prev, current) => 
                    (votingResults[current.id] || 0) > (votingResults[prev.id] || 0) ? current : prev
                );
                
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white mb-6">Vote & Play</h3>
                        
                        <div className="space-y-3">
                            {topGames.map(game => (
                                <div key={game.id} className="glass rounded-xl p-4 hover:bg-white/15 transition-all duration-300">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-4">
                                            <div className="relative group cursor-pointer">
                                                <img 
                                                    src={game.image} 
                                                    alt={game.name}
                                                    className="w-20 h-12 rounded object-cover flex-shrink-0 transition-all duration-300 transform group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-coral-500/30 group-active:scale-95"
                                                    onError={(e) => {
                                                        e.target.src = getImageWithFallback(null, game.name);
                                                    }}
                                                    onClick={() => {
                                                        console.log(`Ready to vote for ${game.name}!`);
                                                    }}
                                                />
                                                {/* Hover overlay with vote count */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded flex items-end justify-center pb-1">
                                                    <span className="text-white text-xs font-medium">
                                                        {votingResults[game.id] || 0} votes
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-white font-medium hover:text-coral-300 transition-colors duration-300">{game.name}</h4>
                                                <p className="text-white/70 text-sm">{game.coverage}% coverage</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleVote(game.id)}
                                            className="btn-coral px-4 py-2"
                                        >
                                            Vote ({votingResults[game.id] || 0})
                                        </button>
                                    </div>
                                    
                                    {votingResults[game.id] && (
                                        <div className="mt-3">
                                            <div className="w-full bg-white/10 rounded-full h-2">
                                                <div 
                                                    className="bg-coral-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min((votingResults[game.id] / 4) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {Object.keys(votingResults).length > 0 && (
                            <div className="glass rounded-2xl p-6 text-center">
                                <h4 className="text-xl font-bold text-white mb-2">
                                    🏆 Winner: {winningGame.name}
                                </h4>
                                <p className="text-white/70 mb-4">
                                    {votingResults[winningGame.id]} votes • {winningGame.coverage}% squad coverage
                                </p>
                                <button className="btn-coral text-lg px-8 py-3">
                                    🎮 Launch Game Session
                                </button>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="page-container">
            {/* Floating Particles */}
            <div className="particles">
                {[...Array(30)].map((_, i) => (
                    <div 
                        key={i}
                        className="particle animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 6}s`,
                            animationDuration: `${4 + Math.random() * 4}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="content-wrapper">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-black text-white mb-4">
                        SquadUp
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-coral-500 to-marine-500">
                            {" "}Demo
                        </span>
                    </h1>
                    <p className="text-xl text-white/80 max-w-2xl mx-auto">
                        Interactive demo with mock Steam integration - no login required!
                    </p>
                </div>

                {/* Demo Navigation */}
                <div className="glass rounded-3xl p-6 mb-8">
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {demoSteps.map((step, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentStep(index)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                                    currentStep === index
                                        ? 'bg-coral-500 text-white'
                                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                                }`}
                            >
                                {index + 1}. {step}
                            </button>
                        ))}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                        <div 
                            className="bg-gradient-to-r from-coral-500 to-marine-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${((currentStep + 1) / demoSteps.length) * 100}%` }}
                        ></div>
                    </div>
                    
                    <p className="text-center text-white/70 text-sm">
                        {isLoggedIn ? 'Demo Mode Active' : 'Click "Connect Demo Steam Account" to start'} • Click steps to navigate manually
                    </p>
                </div>

                {/* Demo Content */}
                <div className="glass rounded-3xl p-8 mb-8 min-h-[500px]">
                    {renderStepContent()}
                </div>

                {/* CTA Section */}
                <div className="glass rounded-3xl p-8 text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Ready for the Real Thing?
                    </h2>
                    <p className="text-white/80 mb-6 max-w-md mx-auto">
                        Connect your actual Steam account and start finding games with your real squad
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/signup">
                            <button className="btn-coral text-lg px-8 py-3">
                                Create Real Account
                            </button>
                        </Link>
                        <Link to="/">
                            <button className="btn-ghost text-lg px-8 py-3">
                                ← Back to Home
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Demo Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-coral-400">100%</div>
                        <div className="text-white/70 text-sm">Demo Features</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-marine-400">0</div>
                        <div className="text-white/70 text-sm">Real Data Used</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-lavender-400">Safe</div>
                        <div className="text-white/70 text-sm">& Secure</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-green-400">Free</div>
                        <div className="text-white/70 text-sm">Demo Trial</div>
                    </div>
                </div>
            </div>
        </div>
    );
};