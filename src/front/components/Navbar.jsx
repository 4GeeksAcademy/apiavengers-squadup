import React, { useContext } from 'react';

export const Navbar = () => {
    // In your actual implementation, you'll use your global reducer
    // For now, I'll simulate the auth state
    const [user, setUser] = React.useState(null);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);

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
        // Navigate to home
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
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-6 py-4 shadow-2xl">
                <div className="flex justify-between items-center">
                    
                    {/* Logo and Brand */}
                    <button 
                        onClick={navigateToHome}
                        className="flex items-center space-x-3 group"
                    >
                        <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-white font-bold text-sm">S</span>
                        </div>
                        <span className="text-white font-bold text-xl group-hover:text-coral-400 transition-colors duration-300">
                            SquadUp
                        </span>
                    </button>

                    {/* Navigation Links and User Menu */}
                    <div className="flex items-center space-x-4">
                        
                        {/* Navigation Links - Show different links based on auth status */}
                        {isAuthenticated ? (
                            <>
                                <button 
                                    onClick={navigateToDashboard}
                                    className="text-white/80 hover:text-white transition-colors duration-300 font-medium"
                                >
                                    Dashboard
                                </button>
                                <button 
                                    className="text-white/80 hover:text-white transition-colors duration-300 font-medium"
                                >
                                    Find Games
                                </button>
                                <button 
                                    className="text-white/80 hover:text-white transition-colors duration-300 font-medium"
                                >
                                    Friends
                                </button>
                            </>
                        ) : (
                            <button 
                                className="text-white/80 hover:text-white transition-colors duration-300 font-medium"
                            >
                                About
                            </button>
                        )}

                        {/* User Menu or Auth Buttons */}
                        {isAuthenticated ? (
                            <div className="flex items-center space-x-3">
                                {/* User Avatar and Menu */}
                                <div className="relative group">
                                    <button 
                                        onClick={navigateToProfile}
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
                                        <span className="text-white font-medium">
                                            {user?.username || 'User'}
                                        </span>
                                    </button>
                                    
                                    {/* Dropdown menu - would be positioned absolute in real implementation */}
                                </div>

                                {/* Logout Button */}
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 hover:text-red-200 rounded-xl transition-all duration-300 font-medium"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            /* Auth Buttons for non-authenticated users */
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={navigateToLogin}
                                    className="px-4 py-2 text-white/80 hover:text-white transition-colors duration-300 font-medium"
                                >
                                    Login
                                </button>
                                <button
                                    onClick={navigateToSignUp}
                                    className="px-4 py-2 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
                                >
                                    Sign Up
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .navbar-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 8px;
                    width: 200px;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 8px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(-10px);
                    transition: all 0.3s ease;
                }

                .group:hover .navbar-dropdown {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }

                .dropdown-item {
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    text-align: left;
                    color: rgba(255, 255, 255, 0.8);
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    font-size: 14px;
                }

                .dropdown-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                }
            `}</style>
        </nav>
    );
};
