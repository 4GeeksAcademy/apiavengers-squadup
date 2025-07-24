// src/front/components/Navbar.jsx - ENHANCED with ALL protected routes

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';
import toast from 'react-hot-toast';

const EnhancedNavbar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navRef = useRef(null);
  const logoRef = useRef(null);
  const navigate = useNavigate();

  // 🔧 FIX: Connect to global state
  const { store } = useGlobalReducer();
  const isAuthenticated = store?.isAuthenticated || false;
  const user = store?.user || null;

  console.log('🔍 Enhanced Navbar state:', { 
    isAuthenticated, 
    user: user?.username, 
    authLoading: store?.authLoading,
    hasUser: !!user 
  });

  useEffect(() => {
    initializeNavbarAnimations();
  }, []);

  const initializeNavbarAnimations = () => {
    const magneticElements = navRef.current?.querySelectorAll('.magnetic');
    magneticElements?.forEach(element => {
      let isHovering = false;
      
      const handleMouseMove = (e) => {
        if (!isHovering) return;
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) * 0.15;
        const deltaY = (e.clientY - centerY) * 0.15;
        
        gsap.to(element, {
          x: deltaX,
          y: deltaY,
          rotation: deltaX * 0.05,
          duration: 0.3,
          ease: "power2.out"
        });
      };

      const handleMouseEnter = () => {
        isHovering = true;
        gsap.to(element, {
          scale: 1.05,
          duration: 0.3,
          ease: "power2.out"
        });
      };

      const handleMouseLeave = () => {
        isHovering = false;
        gsap.to(element, {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          duration: 0.6,
          ease: "elastic.out(1, 0.3)"
        });
      };

      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
    });
  };

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);

    const navbar = navRef.current;
    const timeline = gsap.timeline();

    if (newCollapsedState) {
      timeline
        .to(navbar.querySelectorAll('.nav-content'), {
          opacity: 0,
          scale: 0.8,
          duration: 0.3,
          ease: "power2.inOut"
        })
        .to(navbar, {
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          duration: 0.5,
          ease: "power3.inOut"
        }, "-=0.1")
        .to(logoRef.current, {
          scale: 0.8,
          duration: 0.3,
          ease: "power2.out"
        }, "-=0.3");
    } else {
      timeline
        .to(navbar, {
          width: '95%',
          maxWidth: '1536px',
          height: '80px',
          borderRadius: '32px',
          duration: 0.5,
          ease: "power3.inOut"
        })
        .to(logoRef.current, {
          scale: 1,
          duration: 0.3,
          ease: "power2.out"
        }, "-=0.3")
        .to(navbar.querySelectorAll('.nav-content'), {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.05
        }, "-=0.2");
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    setShowMobileMenu(false);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      await authService.logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  return (
    <>
      <nav 
        ref={navRef}
        className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
          isCollapsed 
            ? 'w-20 h-20' 
            : 'w-[95%] max-w-6xl h-20'
        }`}
      >
        <div className="glass-navbar w-full h-full">
          <div className={`h-full flex items-center transition-all duration-700 ${
            isCollapsed ? 'justify-center' : 'justify-between px-8'
          }`}>
            
            {/* Logo Section */}
            <div 
              ref={logoRef}
              className={`cursor-pointer transition-all duration-700 ${
                isCollapsed ? 'scale-75' : 'scale-100'
              }`}
              onClick={toggleCollapse}
            >
              <div className="magnetic">
                {isCollapsed ? (
                  <div className="w-12 h-12 bg-gradient-to-r from-coral-500 to-blue-500 rounded-full flex items-center justify-center">
                    <svg 
                      className="w-6 h-6 text-white" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-coral-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg 
                        className="w-4 h-4 text-white" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                    <h1 className="text-2xl font-black whitespace-nowrap">
                      <span className="text-white glow-text">Squad</span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-purple">Up</span>
                    </h1>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Links */}
            <div className={`nav-content flex items-center space-x-6 transition-all duration-700 ${
              isCollapsed ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'
            }`}>
              
              {/* Always show Explore */}
              <button
                onClick={() => handleNavigation('/demo')}
                className="nav-link magnetic"
              >
                <span>Explore</span>
              </button>

              {/* 🔧 ENHANCED: Show different navigation based on authentication */}
              {!isAuthenticated ? (
                // 🔧 Not logged in - show Login and Sign Up
                <>
                  <button
                    onClick={() => handleNavigation('/login')}
                    className="nav-link magnetic"
                  >
                    <span>Login</span>
                  </button>
                  
                  <button
                    onClick={() => handleNavigation('/signup')}
                    className="glass-signup-button magnetic"
                  >
                    <span>Sign Up</span>
                  </button>
                </>
              ) : (
                // 🔧 ENHANCED: Logged in - show ALL protected navigation options
                <>
                  {/* Dashboard */}
                  <button
                    onClick={() => handleNavigation('/dashboard')}
                    className="nav-link magnetic"
                  >
                    <span>Dashboard</span>
                  </button>

                  {/* 🎮 Game Library */}
                  <button
                    onClick={() => handleNavigation('/game-library')}
                    className="nav-link magnetic"
                  >
                    <span>Game Library</span>
                  </button>

                  {/* 🔍 Find Games */}
                  <button
                    onClick={() => handleNavigation('/find-games')}
                    className="nav-link magnetic"
                  >
                    <span>Find Games</span>
                  </button>

                  {/* 👥 Friends */}
                  <button
                    onClick={() => handleNavigation('/friends')}
                    className="nav-link magnetic"
                  >
                    <span>Friends</span>
                  </button>

                  {/* Profile with Avatar */}
                  <button
                    onClick={() => handleNavigation('/profile')}
                    className="nav-link magnetic flex items-center space-x-2"
                  >
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt="Profile" 
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gradient-to-r from-coral-400 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <span>{user?.username || 'Profile'}</span>
                  </button>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="nav-link magnetic text-red-300 hover:text-red-200"
                  >
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Styles */}
        <style>{`
          .glass-navbar {
            backdrop-filter: blur(40px);
            -webkit-backdrop-filter: blur(40px);
            background: linear-gradient(135deg, 
              rgba(255, 255, 255, 0.15) 0%, 
              rgba(255, 255, 255, 0.08) 50%, 
              rgba(255, 255, 255, 0.15) 100%
            );
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: ${isCollapsed ? '50%' : '32px'};
            box-shadow: 
              0 25px 60px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.3),
              0 0 30px rgba(0, 255, 255, 0.1);
            transition: all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          }

          .nav-link {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            font-size: 15px;
            transition: all 0.3s ease;
            padding: 12px 20px;
            border-radius: 16px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
            border: none;
            background: transparent;
            cursor: pointer;
            white-space: nowrap;
          }

          .nav-link::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
              transparent, 
              rgba(0, 255, 255, 0.2), 
              transparent
            );
            transition: left 0.5s ease;
          }

          .nav-link:hover::before {
            left: 100%;
          }

          .nav-link:hover {
            color: rgba(0, 255, 255, 0.9);
            background: rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 20px rgba(0, 255, 255, 0.2);
            transform: translateY(-2px);
          }

          .glass-signup-button {
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            background: linear-gradient(135deg, 
              rgba(255, 127, 80, 0.8) 0%, 
              rgba(255, 107, 70, 0.8) 100%
            );
            border: 1px solid rgba(255, 127, 80, 0.4);
            border-radius: 16px;
            padding: 12px 24px;
            color: white;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.3s ease;
            box-shadow: 0 8px 20px rgba(255, 127, 80, 0.3);
            cursor: pointer;
            position: relative;
            overflow: hidden;
          }

          .glass-signup-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s ease;
          }

          .glass-signup-button:hover::before {
            left: 100%;
          }

          .glass-signup-button:hover {
            background: linear-gradient(135deg, 
              rgba(255, 127, 80, 0.9) 0%, 
              rgba(255, 107, 70, 0.9) 100%
            );
            border-color: rgba(255, 127, 80, 0.6);
            box-shadow: 0 12px 30px rgba(255, 127, 80, 0.5);
            transform: translateY(-3px) scale(1.02);
          }

          .glow-text {
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
          }

          .magnetic {
            transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          }

          .text-neon-cyan { color: #00ffff; }
          .text-neon-purple { color: #bf00ff; }
        `}</style>
      </nav>
    </>
  );
};

export default EnhancedNavbar;