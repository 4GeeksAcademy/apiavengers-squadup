import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Navbar = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const [user, setUser]                 = useState(null);
  const [isAuthenticated, setAuth]      = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const authPages  = ['/login', '/signup'];
  const isAuthPage = authPages.includes(location.pathname);

  useEffect(() => {
    if (isAuthPage) {         
      setAuth(false);
      setUser(null);
      return;
    }

    const token =
      sessionStorage.getItem('access_token') ||
      localStorage.getItem('access_token');

    if (!token) {
      setAuth(false);
      setUser(null);
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/verify`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('unauthorised');
        const data = await res.json();
        setAuth(true);
        setUser(data.user);
      } catch {
        setAuth(false);
        setUser(null);
        sessionStorage.removeItem('access_token');
        localStorage.removeItem('access_token');
      }
    })();
  }, [isAuthPage]);


  const handleLogout = () => {
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('access_token');
    setAuth(false);
    setUser(null);
    setShowUserMenu(false);
    navigate('/');
  };


  if (isAuthPage) return null;


  return (
    <nav className="fixed top-4 left-4 right-4 z-50">
      <div className="navbar-glass">
        <div className="flex justify-between items-center">
          {/* Brand / Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 group"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-coral-500 to-marine-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-white font-bold text-2xl group-hover:text-coral-400 transition-colors duration-300 text-shadow">
              SquadUp
            </span>
          </button>

          {/* Right-hand nav / user area */}
          <div className="flex items-center space-x-6">
            {/* Links */}
            {isAuthenticated ? (
              <>
                <button onClick={() => navigate('/dashboard')} className="nav-link">Dashboard</button>
                <button className="nav-link">Find Games</button>
                <button className="nav-link">Friends</button>
              </>
            ) : (
              <button className="nav-link">About</button>
            )}

            {/* Auth buttons vs. user dropdown */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300"
                >
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-marine-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user?.username?.[0]?.toUpperCase() ?? 'U'}
                      </span>
                    </div>
                  )}
                  <span className="text-white font-medium hidden sm:block">
                    {user?.username ?? 'User'}
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

                {/* Dropdown */}
                {showUserMenu && (
                  <div className="nav-dropdown">
                    <button className="dropdown-item" onClick={() => navigate('/profile')}>
                      👤 Profile Settings
                    </button>
                    <button className="dropdown-item" onClick={() => navigate('/dashboard')}>
                      📊 Dashboard
                    </button>
                    <button className="dropdown-item">🎮 Gaming Preferences</button>
                    <button className="dropdown-item">🔗 Steam Integration</button>
                    <hr className="my-2 border-white/20" />
                    <button className="dropdown-item text-red-300 hover:text-red-200" onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button onClick={() => navigate('/login')}  className="nav-link">Login</button>
                <button onClick={() => navigate('/signup')} className="btn-coral">Sign Up</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay to close dropdown */}
      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
      )}
    </nav>
  );
};

/* Utility classes used (Tailwind + custom) */
const navLinkClasses = 'text-white/80 hover:text-white font-medium transition-colors duration-300 hidden sm:block';