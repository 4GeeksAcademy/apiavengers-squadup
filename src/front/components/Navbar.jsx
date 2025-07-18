import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GamingLink } from './GamingAnimations';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService.js';
import steamService from '../services/steamService.js'; // Import your steamService
import toast from 'react-hot-toast';

gsap.registerPlugin(ScrollTrigger);

export const Navbar = () => {
    const { store, dispatch } = useGlobalReducer();
    const isAuthenticated = store.isAuthenticated;
    const user = store.user;
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showExploreMenu, setShowExploreMenu] = useState(false);
    const [isConnectingSteam, setIsConnectingSteam] = useState(false); // Add loading state
    const location = useLocation();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const exploreDropdownRef = useRef(null);

    const authPages = ['/login', '/signup'];
    const isAuthPage = authPages.includes(location.pathname);

    if (isAuthPage) {
        return null;
    }

    const handleToggle = (event) => {
        event.stopPropagation();
        setShowUserMenu(!showUserMenu);
        setShowExploreMenu(false); // Close explore menu if open
    };

    const handleExploreToggle = (event) => {
        event.stopPropagation();
        setShowExploreMenu(!showExploreMenu);
        setShowUserMenu(false); // Close user menu if open
    };

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
            if (exploreDropdownRef.current && !exploreDropdownRef.current.contains(event.target)) {
                setShowExploreMenu(false);
            }
        };
        if (showUserMenu || showExploreMenu) {
            document.addEventListener('click', handleOutsideClick);
        }
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [showUserMenu, showExploreMenu]);

    const handleLogout = () => {
        console.log('Logout clicked');
        dispatch({ type: 'logout' });
        setShowUserMenu(false);
        navigate('/');
    };

    // 🔧 FIXED: Steam integration using your steamService
    const handleSteamIntegration = async () => {
        console.log('Steam Integration clicked');
        setIsConnectingSteam(true);
        
        try {
            // Show options to user: OpenID or Manual
            const useOpenID = window.confirm(
                'Choose Steam connection method:\n\n' +
                'OK = Use Steam OpenID (Automatic - Recommended)\n' +
                'Cancel = Enter Steam ID manually'
            );

            if (useOpenID) {
                // Use Steam OpenID (automatic method)
                await steamService.connectViaOpenID('/dashboard?steam_connected=true');
                // Note: This will redirect to Steam, so code below won't execute
            } else {
                // Manual Steam ID entry
                const instructions = steamService.showSteamIdInstructions();
                const steamId = prompt(
                    `${instructions.title}\n\n` +
                    `${instructions.steps.join('\n')}\n\n` +
                    `Example: ${instructions.example}\n\n` +
                    `Note: ${instructions.note}\n\n` +
                    'Enter your 17-digit Steam ID:'
                );

                if (!steamId) {
                    setIsConnectingSteam(false);
                    return;
                }

                const result = await steamService.connectManually(steamId);
                
                if (result.success) {
                    // Update user state with new Steam connection
                    dispatch({ 
                        type: 'set_user', 
                        payload: result.user 
                    });
                    
                    toast.success(
                        `Steam connected! ${result.newGames} games added to your library.`
                    );
                    
                    setShowUserMenu(false);
                } else {
                    throw new Error(result.error || 'Failed to connect Steam account');
                }
            }
        } catch (error) {
            console.error('Steam integration failed:', error);
            const friendlyError = steamService.getErrorMessage(error);
            toast.error(friendlyError);
        } finally {
            setIsConnectingSteam(false);
        }
    };

    const handleProfileClick = () => {
        console.log('Profile Settings clicked');
        setShowUserMenu(false);
    };

    const handleDashboardClick = () => {
        console.log('Dashboard clicked');
        setShowUserMenu(false);
    };

    const handleFindGamesClick = () => {
        console.log('Find Games clicked');
        setShowUserMenu(false);
    };

    return (
        <nav className="fixed top-4 left-4 right-4 z-50">
            <div className="navbar-glass">
                <div className="flex justify-between items-center">
                    <Link 
                        to="/"
                        className="flex items-center space-x-3 group"
                    >
                        <div className="w-10 h-10 bg-gradient-to-r from-coral-500 to-marine-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <span className="text-white font-bold text-2xl group-hover:text-coral-400 transition-colors duration-300 text-shadow">
                            SquadUp
                        </span>
                    </Link>

                    <div className="flex items-center space-x-6">
                        {isAuthenticated ? (
                            <>
                                <Link to="/dashboard" className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block">
                                    Dashboard
                                </Link>
                                <Link to="/sessions" className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block">
                                    Find Games
                                </Link>
                                <Link to="/game-library" className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block">
                                    Game Library
                                </Link>
                                <Link to="/friends" className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block">
                                    Friends
                                </Link>
                            </>
                        ) : (
                            <div className="relative z-[60]">
                                <button
                                    onClick={handleExploreToggle}
                                    className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block"
                                >
                                    Explore
                                </button>
                                
                                {showExploreMenu && (
                                    <div 
                                        ref={exploreDropdownRef}
                                        className={`nav-dropdown ${showExploreMenu ? 'active' : ''}`} 
                                        style={{ pointerEvents: showExploreMenu ? 'auto' : 'none', zIndex: 70 }}  
                                        onClick={(e) => e.stopPropagation()}
                                    >  
                                        {/* Profile (Home) */}
                                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
                                            <div className="flex items-center mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center mr-4">
                                                    <span className="text-xl">👤</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white">Profile</h3>
                                            </div>
                                            <p className="text-white/70">Manage your gaming profile, connect Steam, and view your game library.</p>
                                        </div>
                                        
                                        {/* Features */}
                                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
                                            <div className="flex items-center mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center mr-4">
                                                    <span className="text-xl">⚙️</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white">Features</h3>
                                            </div>
                                            <p className="text-white/70">Create account, link Steam to sync games, create/join groups, vote on common games, and play the winner!</p>
                                        </div>
                                        
                                        {/* Gaming */}
                                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
                                            <div className="flex items-center mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center mr-4">
                                                    <span className="text-xl">🎮</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white">Gaming</h3>
                                            </div>
                                            <p className="text-white/70">Stay tuned!</p>
                                        </div>
                                        
                                        {/* Community */}
                                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
                                            <div className="flex items-center mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center mr-4">
                                                    <span className="text-xl">👥</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white">Community</h3>
                                            </div>
                                            <p className="text-white/70">Stay tuned!</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {isAuthenticated ? (
                            <div className="flex items-center space-x-4">
                                {/* Steam Connection Status Indicator */}
                                {user && !user.steam_connected && (
                                    <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                                        <span className="text-orange-300 text-sm">🎮</span>
                                        <span className="text-orange-300 text-sm font-medium">Connect Steam</span>
                                    </div>
                                )}

                                <div className="relative z-[60]">  {/* Increased z-index for stacking context */}
                                    <button 
                                        onClick={handleToggle}
                                        className="flex items-center space-x-2 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300"
                                    >
                                        {user?.avatar_url ? (
                                            <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center">
                                                <span className="text-white font-bold text-sm">
                                                    {user?.username?.[0]?.toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                        )}
                                        <span className="text-white font-medium hidden sm:block">
                                            Profile
                                        </span>
                                        <svg className={`w-4 h-4 text-white/60 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    
                                    <div 
                                        ref={dropdownRef}
                                        className={`nav-dropdown ${showUserMenu ? 'active' : ''}`} 
                                        style={{ pointerEvents: showUserMenu ? 'auto' : 'none', zIndex: 70 }}  
                                        onClick={(e) => e.stopPropagation()}
                                    >  
                                        <Link to="/profile" className="dropdown-item" onClick={handleProfileClick}>
                                            <span className="flex items-center space-x-2">
                                                <span>👤</span>
                                                <span>Profile Settings</span>
                                            </span>
                                        </Link>
                                        <Link to="/dashboard" className="dropdown-item" onClick={handleDashboardClick}>
                                            <span className="flex items-center space-x-2">
                                                <span>📊</span>
                                                <span>Dashboard</span>
                                            </span>
                                        </Link>
                                        <Link to="/sessions" className="dropdown-item" onClick={handleFindGamesClick}>
                                            <span className="flex items-center space-x-2">
                                                <span>🎮</span>
                                                <span>Find Games</span>
                                            </span>
                                        </Link>
                                        
                                        {/* Enhanced Steam Integration Button */}
                                        <button 
                                            className="dropdown-item" 
                                            onClick={handleSteamIntegration}
                                            disabled={isConnectingSteam}
                                        >
                                            <span className="flex items-center space-x-2">
                                                {isConnectingSteam ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                        <span>Connecting...</span>
                                                    </>
                                                ) : user?.steam_connected ? (
                                                    <>
                                                        <span>✅</span>
                                                        <span>Steam Connected</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>🔗</span>
                                                        <span>Connect Steam</span>
                                                    </>
                                                )}
                                            </span>
                                        </button>
                                        
                                        <hr className="my-2 border-white/20" />
                                        <button className="dropdown-item text-red-300 hover:text-red-200" onClick={handleLogout}>
                                            <span className="flex items-center space-x-2">
                                                <span>🚪</span>
                                                <span>Logout</span>
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Link to="/login" className="text-white/80 hover:text-white transition-colors duration-300 font-medium">
                                    Login
                                </Link>
                                <GamingLink
                                    to="/signup"
                                    variant="primary"
                                >
                                    Sign Up
                                </GamingLink>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};