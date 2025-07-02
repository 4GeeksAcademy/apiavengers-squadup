import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Advanced Gaming Animation Component with GSAP
const GamingAnimations = ({ children, className = "" }) => {
  const containerRef = useRef(null);
  const particlesRef = useRef([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    initializeAnimations();
    
    return () => {
      // Cleanup GSAP animations
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const initializeAnimations = () => {
    const container = containerRef.current;
    if (!container) return;

    // Timeline for entrance animations
    const tl = gsap.timeline();

    // Animate container entrance
    tl.fromTo(container, 
      { opacity: 0, y: 50, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power2.out" }
    );

    // Animate child elements with stagger
    const animatedElements = container.querySelectorAll('[data-animate]');
    if (animatedElements.length > 0) {
      tl.fromTo(animatedElements,
        { opacity: 0, y: 30, rotationX: -15 },
        { 
          opacity: 1, 
          y: 0, 
          rotationX: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "back.out(1.7)"
        },
        "-=0.4"
      );
    }

    // Create floating particles animation
    createParticleSystem();
    
    // Add magnetic hover effects
    addMagneticEffects();
    
    // Create energy flow animation
    createEnergyFlow();

    // Scroll-triggered animations
    setupScrollTriggers();
  };

  const createParticleSystem = () => {
    const container = containerRef.current;
    if (!container) return;

    // Create particles
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60 pointer-events-none';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      
      container.appendChild(particle);
      particlesRef.current.push(particle);

      // Animate each particle
      gsap.to(particle, {
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        opacity: Math.random() * 0.8 + 0.2,
        scale: Math.random() * 2 + 0.5,
        duration: Math.random() * 4 + 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: Math.random() * 2
      });
    }
  };

  const addMagneticEffects = () => {
    const magneticElements = containerRef.current?.querySelectorAll('.magnetic');
    
    magneticElements?.forEach(element => {
      const handleMouseMove = (e) => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        gsap.to(element, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.3,
          ease: "power2.out"
        });
      };

      const handleMouseLeave = () => {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: "elastic.out(1, 0.3)"
        });
      };

      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseleave', handleMouseLeave);
    });
  };

  const createEnergyFlow = () => {
    const energyElements = containerRef.current?.querySelectorAll('.energy-flow');
    
    energyElements?.forEach(element => {
      gsap.to(element, {
        backgroundPosition: "200% 0",
        duration: 3,
        repeat: -1,
        ease: "none"
      });
    });
  };

  const setupScrollTriggers = () => {
    // Scroll-triggered animations for cards
    const cards = containerRef.current?.querySelectorAll('.gaming-card');
    cards?.forEach((card, index) => {
      gsap.fromTo(card, 
        { 
          opacity: 0, 
          y: 100, 
          rotationY: -15 
        },
        {
          opacity: 1,
          y: 0,
          rotationY: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          },
          delay: index * 0.1
        }
      );
    });

    // Stats counter animation
    const stats = containerRef.current?.querySelectorAll('.stat-number');
    stats?.forEach(stat => {
      const target = stat.getAttribute('data-target');
      gsap.fromTo(stat, 
        { textContent: 0 },
        {
          textContent: target,
          duration: 2,
          ease: "power2.out",
          snap: { textContent: 1 },
          scrollTrigger: {
            trigger: stat,
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ perspective: '1000px' }}
    >
      {/* Energy flow background */}
      <div 
        className="absolute inset-0 opacity-30 energy-flow"
        style={{
          background: `linear-gradient(45deg, 
            transparent 30%, 
            rgba(0,255,255,0.1) 50%, 
            transparent 70%),
            linear-gradient(-45deg, 
            transparent 30%, 
            rgba(191,0,255,0.1) 50%, 
            transparent 70%)`,
          backgroundSize: '200% 200%'
        }}
      />
      
      {children}
    </div>
  );
};

// Enhanced Gaming Button Component with GSAP
const GamingButton = ({ 
  children, 
  variant = "primary", 
  className = "", 
  onClick,
  disabled = false,
  ...props 
}) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleClick = () => {
      gsap.to(button, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      });
    };

    const handleHover = () => {
      gsap.to(button, {
        y: -2,
        scale: 1.05,
        boxShadow: "0 8px 25px rgba(255, 127, 80, 0.4)",
        duration: 0.3,
        ease: "power2.out"
      });

      // Shimmer effect
      const shimmer = button.querySelector('.shimmer');
      if (shimmer) {
        gsap.fromTo(shimmer, 
          { x: '-100%' },
          { x: '100%', duration: 0.6, ease: "power2.out" }
        );
      }
    };

    const handleLeave = () => {
      gsap.to(button, {
        y: 0,
        scale: 1,
        boxShadow: "0 4px 14px rgba(255, 127, 80, 0.3)",
        duration: 0.3,
        ease: "power2.out"
      });
    };

    button.addEventListener('click', handleClick);
    button.addEventListener('mouseenter', handleHover);
    button.addEventListener('mouseleave', handleLeave);

    return () => {
      button.removeEventListener('click', handleClick);
      button.removeEventListener('mouseenter', handleHover);
      button.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  const getVariantClasses = () => {
    switch (variant) {
      case 'neon':
        return 'bg-transparent border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black';
      case 'ghost':
        return 'bg-white/10 border border-white/30 text-white hover:bg-white/20';
      default:
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700';
    }
  };

  return (
    <button
      ref={buttonRef}
      className={`
        relative overflow-hidden px-8 py-3 rounded-xl font-semibold
        transition-all duration-300 transform magnetic
        ${getVariantClasses()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      
      {/* Shimmer effect */}
      <div 
        className="shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full"
      />
    </button>
  );
};

// Gaming Card Component with 3D GSAP effects
const GamingCard = ({ children, className = "", ...props }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const rotateX = (e.clientY - centerY) / 10;
      const rotateY = (centerX - e.clientX) / 10;

      gsap.to(card, {
        rotationX: rotateX,
        rotationY: rotateY,
        transformPerspective: 1000,
        duration: 0.3,
        ease: "power2.out"
      });

      // Glow effect
      gsap.to(card, {
        boxShadow: "0 20px 40px rgba(0, 255, 255, 0.2)",
        duration: 0.3
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotationX: 0,
        rotationY: 0,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.37)",
        duration: 0.5,
        ease: "elastic.out(1, 0.3)"
      });
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`
        gaming-card backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8
        shadow-2xl transition-all duration-300 preserve-3d
        ${className}
      `}
      style={{ transformStyle: 'preserve-3d' }}
      data-animate="true"
      {...props}
    >
      {children}
    </div>
  );
};

// Main Home Component with Full GSAP Integration
export const Home = () => {
  const [activeTab, setActiveTab] = useState('home');
  
  return (
    <GamingAnimations className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header with animated logo */}
        <div className="text-center mb-12" data-animate="true">
          <h1 className="text-6xl font-black mb-4 magnetic">
            Squad
            <span 
              className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"
            >
              Up
            </span>
          </h1>
          <p className="text-xl text-white/80 mb-8">
            Next-generation gaming platform with cutting-edge motion design
          </p>
        </div>

        {/* Navigation with magnetic effects */}
        <div className="flex justify-center mb-12" data-animate="true">
          <div className="backdrop-blur-xl bg-white/10 border border-cyan-400/30 rounded-2xl p-2">
            {['home', 'features', 'gaming', 'community'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-6 py-3 rounded-xl font-medium transition-all duration-300 magnetic
                  ${activeTab === tab 
                    ? 'bg-cyan-400 text-black' 
                    : 'text-white hover:bg-white/10'
                  }
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Animated cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          
          <GamingCard>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 magnetic">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Smart Matching</h3>
              <p className="text-white/70 leading-relaxed">
                AI-powered game matching that analyzes your preferences and finds perfect squad mates.
              </p>
            </div>
          </GamingCard>

          <GamingCard>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 magnetic">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Real-time Sync</h3>
              <p className="text-white/70 leading-relaxed">
                Instant synchronization across all devices with seamless multiplayer coordination.
              </p>
            </div>
          </GamingCard>

          <GamingCard>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6 magnetic">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Lightning Fast</h3>
              <p className="text-white/70 leading-relaxed">
                Optimized performance with sub-millisecond response times for competitive gaming.
              </p>
            </div>
          </GamingCard>
        </div>

        {/* Interactive buttons showcase */}
        <div className="flex flex-wrap justify-center gap-6 mb-12" data-animate="true">
          <Link to="/signup">
            <GamingButton variant="primary">
              Start Gaming
            </GamingButton>
          </Link>
          <Link to="/demo">
            <GamingButton variant="neon">
              Try Demo
            </GamingButton>
          </Link>
          <Link to="/login">
            <GamingButton variant="ghost">
              Sign In
            </GamingButton>
          </Link>
        </div>

        {/* Stats section with animated counters */}
        <GamingCard data-animate="true">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="magnetic">
              <div className="stat-number text-4xl font-black text-cyan-400 mb-2" data-target="1000000">0</div>
              <div className="text-white/70 text-sm uppercase tracking-wide">Active Players</div>
            </div>
            <div className="magnetic">
              <div className="stat-number text-4xl font-black text-purple-400 mb-2" data-target="50000">0</div>
              <div className="text-white/70 text-sm uppercase tracking-wide">Games Matched</div>
            </div>
            <div className="magnetic">
              <div className="stat-number text-4xl font-black text-green-400 mb-2" data-target="99">0</div>
              <div className="text-white/70 text-sm uppercase tracking-wide">% Uptime</div>
            </div>
            <div className="magnetic">
              <div className="stat-number text-4xl font-black text-orange-400 mb-2" data-target="24">0</div>
              <div className="text-white/70 text-sm uppercase tracking-wide">Hour Support</div>
            </div>
          </div>
        </GamingCard>

        {/* Call to Action with GSAP entrance */}
        <div className="text-center mt-16" data-animate="true">
          <GamingCard className="magnetic">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-coral-500 to-marine-500">Squad Up</span>?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of gamers finding their perfect squad. Connect your Steam library, 
              create groups, and vote on what to play next!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <GamingButton variant="primary" className="text-lg px-12 py-4">
                  Get Started Free
                </GamingButton>
              </Link>
              <Link to="/demo">
                <GamingButton variant="ghost" className="text-lg px-12 py-4">
                  Watch Demo
                </GamingButton>
              </Link>
            </div>
          </GamingCard>
        </div>
      </div>
    </GamingAnimations>
  );
};