// src/front/components/Navbar.jsx - Updated to use your Tailwind config

import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GamingLink } from './GamingAnimations';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService.js';
import toast from 'react-hot-toast';

// Import steamService with fallback
let steamService;
try {
    steamService = require('../services/steamService.js').default;
} catch (error) {
    console.warn('steamService not found, using fallback');
    steamService = {
        connectViaOpenID: async (redirectUrl) => {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            window.location.href = `${backendUrl}/api/auth/steam/login?return_to=${encodeURIComponent(redirectUrl)}`;
        },
        connectManually: async (steamId) => {
            try {
                const response = await authService.authenticatedFetch('/api/steam/connect', {
                    method: 'POST',
                    body: JSON.stringify({ steam_id: steamId })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    return {
                        success: true,
                        user: result.user,
                        newGames: result.new_games || 0,
                        message: result.message || 'Steam connected successfully'
                    };
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to connect Steam');
                }
            } catch (error) {
                throw error;
            }
        },
        showSteamIdInstructions: () => ({
            title: 'Find Your Steam ID',
            steps: [
                '1. Go to your Steam profile',
                '2. Right-click and copy profile URL',
                '3. If URL has numbers after /profiles/, that\'s your Steam ID',
                '4. If custom URL, use steamid.io converter'
            ],
            example: '76561198000000000',
            note: 'Must be 17 digits starting with 765611...'
        }),
        getErrorMessage: (error) => {
            if (error.response?.data?.error) {
                return error.response.data.error;
            }
            return error.message || 'Steam connection failed';
        }
    };
}

gsap.registerPlugin(ScrollTrigger);

export const Navbar = () => {
    const { store, dispatch } = useGlobalReducer();
    const isAuthenticated = store.isAuthenticated;
    const user = store.user;
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showExploreMenu, setShowExploreMenu] = useState(false);
    const [isConnectingSteam, setIsConnectingSteam] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
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
        console.log('Profile button clicked, current showUserMenu:', showUserMenu);
        setShowUserMenu(!showUserMenu);
        setShowExploreMenu(false);
    };

    const handleExploreToggle = (event) => {
        event.stopPropagation();
        setShowExploreMenu(!showExploreMenu);
        setShowUserMenu(false);
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

    const handleLogout = async () => {
        console.log('Logout clicked');
        try {
            await authService.logout();
            dispatch({ type: 'LOGOUT' });
            setShowUserMenu(false);
            navigate('/');
            toast.success('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Error logging out');
        }
    };

    const handleSteamIntegration = async () => {
        console.log('Steam Integration clicked');
        
        // If already connected, show status
        if (user?.steam_connected || user?.is_steam_connected) {
            toast.success(`Steam already connected as ${user.steam_username || 'Steam User'}`);
            setShowUserMenu(false);
            return;
        }
        
        setIsConnectingSteam(true);
        
        try {
            const useOpenID = window.confirm(
                'Choose Steam connection method:\n\n' +
                'OK = Use Steam OpenID (Automatic - Recommended)\n' +
                'Cancel = Enter Steam ID manually'
            );

            if (useOpenID) {
                await steamService.connectViaOpenID('/dashboard?steam_connected=true');
            } else {
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
                    dispatch({ 
                        type: 'SET_USER', 
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

    const handleMenuItemClick = () => {
        setShowUserMenu(false);
        setShowExploreMenu(false);
    };

    const handlePinToggle = () => {
        setIsCollapsed(!isCollapsed);
        // Close any open dropdowns when collapsing
        if (!isCollapsed) {
            setShowUserMenu(false);
            setShowExploreMenu(false);
        }
    };

    // Get user avatar with fallback
    const getUserAvatar = () => {
        if (user?.steam_avatar_url) return user.steam_avatar_url;
        if (user?.avatar_url) return user.avatar_url;
        return null;
    };

    const getUserInitial = () => {
        return user?.username?.[0]?.toUpperCase() || 'U';
    };

    return (
        <nav className="fixed top-4 left-4 right-4 z-50">
            {/* Collapsed state - just the S logo */}
            {isCollapsed ? (
                <div className="flex justify-center">
                    <button
                        onClick={handlePinToggle}
                        className="w-12 h-12 bg-gradient-to-r from-coral-500 to-marine-500 rounded-xl flex items-center justify-center shadow-gaming hover:scale-110 transition-all duration-300 group"
                        title="Expand navbar"
                    >
                        <span className="text-white font-bold text-lg group-hover:rotate-12 transition-transform duration-300">S</span>
                    </button>
                </div>
            ) : (
                /* Full navbar using your glass-effect utility */
                <div className="glass-effect rounded-6xl px-6 py-3 max-w-screen-xl mx-auto shadow-gaming">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <Link 
                                to="/"
                                className="flex items-center space-x-3 group"
                            >
                                <div className="w-10 h-10 bg-gradient-to-r from-coral-500 to-marine-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-gaming">
                                    <span className="text-white font-bold text-lg">S</span>
                                </div>
                                <span className="text-white font-bold text-2xl group-hover:text-coral-400 transition-colors duration-300 text-shadow">
                                    SquadUp
                                </span>
                            </Link>

                            {/* Pin/Collapse button */}
                            <button
                                onClick={handlePinToggle}
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/70 hover:text-white transition-all duration-300 ml-2"
                                title="Collapse Nav"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>

                        {/* Navigation items with proper spacing */}
                        <div className="flex items-center space-x-16">
                            {isAuthenticated ? (
                                <>
                                    <Link 
                                        to="/dashboard" 
                                        className={`text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block ${
                                            location.pathname === '/dashboard' ? 'text-coral-400' : ''
                                        }`}
                                    >
                                        Dashboard
                                    </Link>
                                    <Link 
                                        to="/groups" 
                                        className={`text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block ${
                                            location.pathname.startsWith('/groups') ? 'text-coral-400' : ''
                                        }`}
                                    >
                                        Groups
                                    </Link>
                                    <Link 
                                        to="/sessions" 
                                        className={`text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block whitespace-nowrap ${
                                            location.pathname === '/sessions' ? 'text-coral-400' : ''
                                        }`}
                                    >
                                        Find Games
                                    </Link>
                                    <Link 
                                        to="/game-library" 
                                        className={`text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block whitespace-nowrap ${
                                            location.pathname === '/game-library' ? 'text-coral-400' : ''
                                        }`}
                                    >
                                        Game Library
                                    </Link>
                                    <Link 
                                        to="/friends" 
                                        className={`text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block ${
                                            location.pathname === '/friends' ? 'text-coral-400' : ''
                                        }`}
                                    >
                                        Friends
                                    </Link>
                                </>
                            ) : (
                                <div className="relative z-60">
                                    <button
                                        onClick={handleExploreToggle}
                                        className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:flex items-center space-x-1"
                                    >
                                        <span>Explore</span>
                                        <svg className={`w-4 h-4 transition-transform duration-200 ${showExploreMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    
                                    {showExploreMenu && (
                                        <div 
                                            ref={exploreDropdownRef}
                                            className={`absolute top-full right-0 mt-2 min-w-[600px] glass-effect rounded-3xl p-6 shadow-depth-4 transition-all duration-300 z-70 grid grid-cols-2 gap-4 ${
                                                showExploreMenu ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
                                            }`}
                                            style={{ pointerEvents: showExploreMenu ? 'auto' : 'none' }}  
                                            onClick={(e) => e.stopPropagation()}
                                        >  
                                            {/* Profile Demo */}
                                            <Link 
                                                to="/demo" 
                                                className="card-base p-4 hover:bg-white/15 transition-all duration-300 group"
                                                onClick={handleMenuItemClick}
                                            >
                                                <div className="flex items-center mb-3">
                                                    <div className="w-10 h-10 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                                                        <span className="text-lg">👤</span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white">Profile Demo</h3>
                                                </div>
                                                <p className="text-white/70 text-sm">See how profiles work with Steam integration and game libraries.</p>
                                            </Link>
                                            
                                            {/* Features */}
                                            <div className="card-base p-4">
                                                <div className="flex items-center mb-3">
                                                    <div className="w-10 h-10 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center mr-3">
                                                        <span className="text-lg">⚙️</span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white">Features</h3>
                                                </div>
                                                <p className="text-white/70 text-sm">Create groups, sync Steam libraries, vote on games, and find your squad's next adventure!</p>
                                            </div>
                                            
                                            {/* Gaming Groups */}
                                            <div className="card-base p-4">
                                                <div className="flex items-center mb-3">
                                                    <div className="w-10 h-10 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center mr-3">
                                                        <span className="text-lg">🎮</span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white">Gaming Groups</h3>
                                                </div>
                                                <p className="text-white/70 text-sm">Create or join gaming groups, sync libraries, and vote on what to play next!</p>
                                            </div>
                                            
                                            {/* Community */}
                                            <div className="card-base p-4">
                                                <div className="flex items-center mb-3">
                                                    <div className="w-10 h-10 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center mr-3">
                                                        <span className="text-lg">👥</span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white">Community</h3>
                                                </div>
                                                <p className="text-white/70 text-sm">Connect with gamers, find friends, and build your perfect gaming squad.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isAuthenticated ? (
                                <div className="flex items-center space-x-6">
                                    {/* Steam Connection Status Indicator */}
                                    {user && !(user.steam_connected || user.is_steam_connected) && (
                                        <button
                                            onClick={handleSteamIntegration}
                                            disabled={isConnectingSteam}
                                            className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors duration-300 disabled:opacity-50"
                                        >
                                            <span className="text-orange-300 text-sm">🎮</span>
                                            <span className="text-orange-300 text-sm font-medium">
                                                {isConnectingSteam ? 'Connecting...' : 'Connect Steam'}
                                            </span>
                                        </button>
                                    )}

                                    <div className="relative z-60">
                                        <button 
                                            onClick={handleToggle}
                                            className="flex items-center space-x-2 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300"
                                        >
                                            {getUserAvatar() ? (
                                                <img 
                                                    src={getUserAvatar()} 
                                                    alt="Avatar" 
                                                    className="w-8 h-8 rounded-full border border-white/20" 
                                                />
                                            ) : (
                                                <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white font-bold text-sm">
                                                        {getUserInitial()}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="text-white font-medium hidden sm:block">
                                                {user?.username || 'Profile'}
                                            </span>
                                            <svg className={`w-4 h-4 text-white/60 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        
                                        <div 
                                            ref={dropdownRef}
                                            className={`absolute top-full right-0 mt-2 w-60 glass-effect rounded-2xl p-3 shadow-depth-4 transition-all duration-300 z-70 ${
                                                showUserMenu ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
                                            }`}
                                            style={{ pointerEvents: showUserMenu ? 'auto' : 'none' }}  
                                            onClick={(e) => e.stopPropagation()}
                                        >  
                                            <Link to="/profile" className="block w-full px-4 py-3 text-left text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 mb-1" onClick={handleMenuItemClick}>
                                                <span className="flex items-center space-x-3">
                                                    <span>👤</span>
                                                    <span>Profile Settings</span>
                                                </span>
                                            </Link>
                                            <Link to="/dashboard" className="block w-full px-4 py-3 text-left text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 mb-1" onClick={handleMenuItemClick}>
                                                <span className="flex items-center space-x-3">
                                                    <span>📊</span>
                                                    <span>Dashboard</span>
                                                </span>
                                            </Link>
                                            <Link to="/sessions" className="block w-full px-4 py-3 text-left text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 mb-1" onClick={handleMenuItemClick}>
                                                <span className="flex items-center space-x-3">
                                                    <span>🎮</span>
                                                    <span>Find Games</span>
                                                </span>
                                            </Link>
                                            <Link to="/game-library" className="block w-full px-4 py-3 text-left text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 mb-1" onClick={handleMenuItemClick}>
                                                <span className="flex items-center space-x-3">
                                                    <span>📚</span>
                                                    <span>Game Library</span>
                                                </span>
                                            </Link>
                                            
                                            {/* Enhanced Steam Integration Button */}
                                            <button 
                                                className="block w-full px-4 py-3 text-left text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 mb-1 disabled:opacity-50" 
                                                onClick={handleSteamIntegration}
                                                disabled={isConnectingSteam}
                                            >
                                                <span className="flex items-center space-x-3">
                                                    {isConnectingSteam ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                            <span>Connecting...</span>
                                                        </>
                                                    ) : (user?.steam_connected || user?.is_steam_connected) ? (
                                                        <>
                                                            <span>✅</span>
                                                            <span>Steam: {user?.steam_username || 'Connected'}</span>
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
                                            <button className="block w-full px-4 py-3 text-left text-red-300 hover:text-red-200 hover:bg-white/10 rounded-lg transition-all duration-200" onClick={handleLogout}>
                                                <span className="flex items-center space-x-3">
                                                    <span>🚪</span>
                                                    <span>Logout</span>
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-4">
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
            )}
        </nav>
    );
};