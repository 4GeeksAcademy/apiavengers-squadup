import React, { useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Navbar = () => {
    const [user, setUser] = React.useState(null);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const location = useLocation();

    // Check if we're on auth pages where we don't want to show the navbar
    const authPages = ['/login', '/signup'];
    const isAuthPage = authPages.includes(location.pathname);

    // Don't render navbar on auth pages
    if (isAuthPage) {
        return null;
    }

    // Check authentication status on component mount
    React.useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            // In real implementation, verify token and get user data
            setIsAuthenticated(true);
            setUser({ username: 'Player1', avatar_url: null });
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        setShowUserMenu(false);
        window.location.href = '/';
    };

    const navigateToProfile = () => {
        window.location.href = '/profile';
    };

    const navigateToLogin = () => {
        window.location.href = '/login';
    };

    const navigateToSignUp = () => {
        window.location.href = '/signup';
    };

    const navigateToHome = () => {
        window.location.href = '/';
    };

    const navigateToDashboard = () => {
        window.location.href = '/dashboard';
    };

    return (
        <nav className="fixed top-4 left-4 right-4 z-50">
            <div className="navbar-glass">
                <div className="flex justify-between items-center">
                    
                    {/* Logo and Brand */}
                    <button 
                        onClick={navigateToHome}
                        className="flex items-center space-x-3 group"
                    >
                        <div className="w-10 h-10 bg-gradient-to-r from-coral-500 to-marine-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <span className="text-white font-bold text-2xl group-hover:text-coral-400 transition-colors duration-300 text-shadow">
                            SquadUp
                        </span>
                    </button>

                    {/* Navigation Links and User Menu */}
                    <div className="flex items-center space-x-6">
                        
                        {/* Navigation Links - Show different links based on auth status */}
                        {isAuthenticated ? (
                            <>
                                <button 
                                    onClick={navigateToDashboard}
                                    className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block"
                                >
                                    Dashboard
                                </button>
                                <button 
                                    className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block"
                                >
                                    Find Games
                                </button>
                                <button 
                                    className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block"
                                >
                                    Friends
                                </button>
                            </>
                        ) : (
                            <button 
                                className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block"
                            >
                                About
                            </button>
                        )}

                        {/* User Menu or Auth Buttons */}
                        {isAuthenticated ? (
                            <div className="flex items-center space-x-4">
                                {/* User Avatar and Menu */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center space-x-2 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300"
                                    >
                                        {user?.avatar_url ? (
                                            <img 
                                                src={user.avatar_url} 
                                                alt="Avatar" 
                                                className="w-8 h-8 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center">
                                                <span className="text-white font-bold text-sm">
                                                    {user?.username?.[0]?.toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                        )}
                                        <span className="text-white font-medium hidden sm:block">
                                            {user?.username || 'User'}
                                        </span>
                                        <svg 
                                            className={`w-4 h-4 text-white/60 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    
                                    {/* Dropdown menu */}
                                    <div className={`nav-dropdown ${showUserMenu ? 'active' : ''}`}>
                                        <button className="dropdown-item" onClick={navigateToProfile}>
                                            <span className="flex items-center space-x-2">
                                                <span>👤</span>
                                                <span>Profile Settings</span>
                                            </span>
                                        </button>
                                        <button className="dropdown-item" onClick={navigateToDashboard}>
                                            <span className="flex items-center space-x-2">
                                                <span>📊</span>
                                                <span>Dashboard</span>
                                            </span>
                                        </button>
                                        <button className="dropdown-item">
                                            <span className="flex items-center space-x-2">
                                                <span>🎮</span>
                                                <span>Gaming Preferences</span>
                                            </span>
                                        </button>
                                        <button className="dropdown-item">
                                            <span className="flex items-center space-x-2">
                                                <span>🔗</span>
                                                <span>Steam Integration</span>
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
                            /* Auth Buttons for non-authenticated users */
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={navigateToLogin}
                                    className="text-white/80 hover:text-white transition-colors duration-300 font-medium"
                                >
                                    Login
                                </button>
                                <button
                                    onClick={navigateToSignUp}
                                    className="btn-coral"
                                >
                                    Sign Up
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Click outside to close dropdown */}
            {showUserMenu && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                ></div>
            )}
        </nav>
    );
};