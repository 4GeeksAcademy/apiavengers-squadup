import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GamingLink } from './GamingAnimations'; // ✅ Import the new GamingLink component

gsap.registerPlugin(ScrollTrigger);

export const Navbar = () => {
    const [user, setUser] = React.useState(null);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const authPages = ['/login', '/signup'];
    const isAuthPage = authPages.includes(location.pathname);

    if (isAuthPage) {
        return null;
    }

    React.useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
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
        navigate('/');
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
                                <Link to="/friends" className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block">
                                    Friends
                                </Link>
                            </>
                        ) : (
                            <Link to="/demo" className="text-white/80 hover:text-white transition-colors duration-300 font-medium hidden sm:block">
                                Demo
                            </Link>
                        )}

                        {isAuthenticated ? (
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowUserMenu(!showUserMenu)}
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
                                            {user?.username || 'User'}
                                        </span>
                                        <svg className={`w-4 h-4 text-white/60 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    
                                    <div className={`nav-dropdown ${showUserMenu ? 'active' : ''}`}>
                                        <Link to="/profile" className="dropdown-item">
                                            <span className="flex items-center space-x-2"><span>👤</span><span>Profile Settings</span></span>
                                        </Link>
                                        <Link to="/dashboard" className="dropdown-item">
                                            <span className="flex items-center space-x-2"><span>📊</span><span>Dashboard</span></span>
                                        </Link>
                                        <Link to="/sessions" className="dropdown-item">
                                            <span className="flex items-center space-x-2"><span>🎮</span><span>Find Games</span></span>
                                        </Link>
                                        <button className="dropdown-item">
                                            <span className="flex items-center space-x-2"><span>🔗</span><span>Steam Integration</span></span>
                                        </button>
                                        <hr className="my-2 border-white/20" />
                                        <button className="dropdown-item text-red-300 hover:text-red-200" onClick={handleLogout}>
                                            <span className="flex items-center space-x-2"><span>🚪</span><span>Logout</span></span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Link to="/login" className="text-white/80 hover:text-white transition-colors duration-300 font-medium">
                                    Login
                                </Link>
                                {/* ✅ FIXED: Replaced standard Link with GamingLink for animated navigation */}
                                <GamingLink
                                    to="/signup"
                                    variant="primary" // Matches the coral/orange theme for primary actions
                                >
                                    Sign Up
                                </GamingLink>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showUserMenu && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                ></div>
            )}
        </nav>
    );
};