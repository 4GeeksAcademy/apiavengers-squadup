import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Enhanced Gaming Animations Component
const GamingAnimations = ({ children, className = "" }) => {
  const containerRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    initializeAnimations();
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      particlesRef.current.forEach(p => {
        if (p && p.parentNode) {
          p.parentNode.removeChild(p);
        }
      });
    };
  }, []);

  const initializeAnimations = () => {
    const container = containerRef.current;
    if (!container) return;
    
    // Master timeline for container entrance
    const masterTL = gsap.timeline();
    masterTL.fromTo(container, 
      { opacity: 0, scale: 0.95, filter: 'blur(10px)' }, 
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: "power3.out" }
    );
    
    // Animate elements with data-animate attribute
    const animatedElements = container.querySelectorAll('[data-animate]');
    if (animatedElements.length > 0) { 
      masterTL.fromTo(animatedElements, 
        { opacity: 0, y: 60, rotationX: -15, scale: 0.9 }, 
        { 
          opacity: 1, 
          y: 0, 
          rotationX: 0, 
          scale: 1, 
          duration: 0.8, 
          stagger: { amount: 0.8, from: "start" }, 
          ease: "back.out(1.7)" 
        }, 
        "-=0.6"
      ); 
    }
    
    createParticleSystem();
    addMagneticEffects();
    setupScrollTriggers();
  };

  const createParticleSystem = () => {
    const container = containerRef.current;
    if (!container) return;
    
    // Create multiple layers of particles
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        const particleTypes = [
          'w-1 h-1 bg-neon-cyan rounded-full opacity-60', 
          'w-2 h-2 bg-neon-purple rounded-full opacity-40', 
          'w-1 h-4 bg-gradient-to-t from-neon-cyan to-transparent opacity-30'
        ];
        
        particle.className = `particle absolute ${particleTypes[layer]} pointer-events-none`;
        particle.style.left = `${Math.random() * 100}%`; 
        particle.style.top = `${Math.random() * 100}%`; 
        particle.style.zIndex = '1';
        container.appendChild(particle); 
        particlesRef.current.push(particle);
        
        // Animate particles with different behaviors per layer
        const baseAnimation = { 
          duration: Math.random() * 8 + 6, 
          repeat: -1, 
          yoyo: true, 
          ease: "sine.inOut", 
          delay: Math.random() * 4 
        };
        
        switch (layer) {
          case 0: 
            gsap.to(particle, { 
              ...baseAnimation, 
              x: (Math.random() - 0.5) * 300, 
              y: (Math.random() - 0.5) * 300, 
              rotation: 360, 
              scale: Math.random() * 2 + 0.5 
            }); 
            break;
          case 1: 
            gsap.to(particle, { 
              ...baseAnimation, 
              x: (Math.random() - 0.5) * 500, 
              y: (Math.random() - 0.5) * 200, 
              rotation: Math.random() * 180
            }); 
            break;
          case 2: 
            gsap.to(particle, { 
              ...baseAnimation, 
              x: (Math.random() - 0.5) * 800, 
              y: (Math.random() - 0.5) * 400, 
              scaleY: Math.random() * 4 + 1
            }); 
            break;
        }
      }
    }
  };

  const addMagneticEffects = () => {
    const magneticElements = containerRef.current?.querySelectorAll('.magnetic');
    magneticElements?.forEach(element => {
      let isHovering = false;
      
      const handleMouseMove = (e) => { 
        if (!isHovering) return; 
        const rect = element.getBoundingClientRect(); 
        const centerX = rect.left + rect.width / 2; 
        const centerY = rect.top + rect.height / 2; 
        const deltaX = (e.clientX - centerX) * 0.12; 
        const deltaY = (e.clientY - centerY) * 0.12; 
        
        gsap.to(element, { 
          x: deltaX, 
          y: deltaY, 
          rotation: deltaX * 0.08, 
          duration: 0.3, 
          ease: "power2.out" 
        }); 
      };
      
      const handleMouseEnter = () => { 
        isHovering = true; 
        gsap.to(element, { 
          scale: 1.05, 
          duration: 0.4, 
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

  const setupScrollTriggers = () => {
    const cards = containerRef.current?.querySelectorAll('.glass-card');
    cards?.forEach((card, index) => { 
      gsap.fromTo(card, 
        { opacity: 0, y: 100, rotationY: -15, scale: 0.8 }, 
        { 
          opacity: 1, 
          y: 0, 
          rotationY: 0, 
          scale: 1, 
          duration: 1, 
          ease: "back.out(1.7)", 
          scrollTrigger: { 
            trigger: card, 
            start: "top 85%", 
            end: "bottom 20%", 
            toggleActions: "play none none reverse" 
          }, 
          delay: index * 0.2 
        }
      ); 
    });
    
    // Animate stats numbers
    const stats = containerRef.current?.querySelectorAll('.stat-number');
    stats?.forEach(stat => { 
      const target = stat.getAttribute('data-target') || '0'; 
      const suffix = stat.getAttribute('data-suffix') || ''; 
      
      gsap.fromTo(stat, 
        { textContent: 0 }, 
        { 
          textContent: target, 
          duration: 2.5, 
          ease: "power2.out", 
          scrollTrigger: { 
            trigger: stat, 
            start: "top 80%", 
            toggleActions: "play none none reverse" 
          }, 
          onUpdate: function() { 
            const value = Math.round(this.targets()[0].textContent); 
            stat.textContent = value + suffix; 
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
      {children} 
    </div>
  );
};

// Modern Glass Card Component
const GlassCard = ({ children, className = "", variant = "default", ...props }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    
    let isHovering = false;
    
    const handleMouseMove = (e) => { 
      if (!isHovering) return; 
      const rect = card.getBoundingClientRect(); 
      const centerX = rect.left + rect.width / 2; 
      const centerY = rect.top + rect.height / 2; 
      const rotateX = (e.clientY - centerY) / 20; 
      const rotateY = (centerX - e.clientX) / 20; 
      
      gsap.to(card, { 
        rotationX: rotateX, 
        rotationY: rotateY, 
        transformPerspective: 1000, 
        duration: 0.3, 
        ease: "power2.out" 
      }); 
      
      // Dynamic lighting effect
      const lightX = ((e.clientX - rect.left) / rect.width) * 100; 
      const lightY = ((e.clientY - rect.top) / rect.height) * 100; 
      card.style.background = `radial-gradient(circle at ${lightX}% ${lightY}%, 
        rgba(0, 255, 255, 0.15) 0%, 
        rgba(255, 255, 255, 0.08) 50%, 
        rgba(191, 0, 255, 0.1) 100%)`; 
    };
    
    const handleMouseEnter = () => { 
      isHovering = true; 
      gsap.to(card, { 
        scale: 1.02, 
        y: -8, 
        duration: 0.4, 
        ease: "power2.out" 
      }); 
    };
    
    const handleMouseLeave = () => { 
      isHovering = false; 
      gsap.to(card, { 
        rotationX: 0, 
        rotationY: 0, 
        scale: 1, 
        y: 0, 
        duration: 0.6, 
        ease: "elastic.out(1, 0.3)" 
      }); 
      card.style.background = ''; 
    };
    
    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);
    
    return () => { 
      card.removeEventListener('mousemove', handleMouseMove); 
      card.removeEventListener('mouseenter', handleMouseEnter); 
      card.removeEventListener('mouseleave', handleMouseLeave); 
    };
  }, []);

  const variants = {
    default: "glass-default hover:glass-glow",
    feature: "glass-feature hover:glass-feature-glow",
    stats: "glass-stats hover:glass-stats-glow",
    cta: "glass-cta hover:glass-cta-glow"
  };

  return (
    <div 
      ref={cardRef}
      className={`glass-card ${variants[variant]} p-8 transition-all duration-500 ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
      {...props}
    >
      {children}
    </div>
  );
};

// Modern Glass Button Component
const GlassButton = ({ children, variant = "primary", className = "", onClick, ...props }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    
    const handleHover = () => { 
      gsap.to(button, { 
        y: -4, 
        scale: 1.05, 
        duration: 0.3, 
        ease: "power2.out" 
      }); 
    };
    
    const handleLeave = () => { 
      gsap.to(button, { 
        y: 0, 
        scale: 1, 
        duration: 0.4, 
        ease: "elastic.out(1, 0.3)" 
      }); 
    };
    
    const handleClick = (e) => {
      gsap.timeline()
        .to(button, { scale: 0.95, duration: 0.1 })
        .to(button, { scale: 1.05, duration: 0.2, ease: "elastic.out(1, 0.3)" });
      
      if (onClick) onClick(e);
    };
    
    button.addEventListener('mouseenter', handleHover);
    button.addEventListener('mouseleave', handleLeave);
    button.addEventListener('click', handleClick);
    
    return () => { 
      button.removeEventListener('mouseenter', handleHover); 
      button.removeEventListener('mouseleave', handleLeave); 
      button.removeEventListener('click', handleClick);
    };
  }, [onClick]);

  const variants = {
    primary: "glass-button-primary",
    neon: "glass-button-neon", 
    ghost: "glass-button-ghost"
  };

  return (
    <button 
      ref={buttonRef}
      className={`glass-button ${variants[variant]} magnetic ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
};

// Main Home Component
export const Home = () => {
  const [activeTab, setActiveTab] = useState(null);
  const heroRef = useRef(null);
  
  const tabs = [
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: '👤',
      description: 'Manage your gaming profile and connect with your Steam account for the ultimate experience!' 
    },
    { 
      id: 'features', 
      label: 'Features', 
      icon: '⚡',
      description: 'Advanced game matching, library sync, and intelligent recommendations powered by AI technology' 
    },
    { 
      id: 'gaming', 
      label: 'Gaming', 
      icon: '🎮',
      description: 'Find perfect squad mates, vote on games together, and create unforgettable gaming sessions!' 
    },
    { 
      id: 'community', 
      label: 'Community', 
      icon: '🌟',
      description: 'Join thousands of gamers in our vibrant community - Exciting features coming very soon!' 
    }
  ];

  const stats = [
    { number: '1200000', suffix: '+', label: 'Active Players', color: 'neon-cyan', icon: '👥' },
    { number: '85000', suffix: '+', label: 'Games Matched', color: 'neon-purple', icon: '🎮' },
    { number: '99', suffix: '%', label: 'Uptime', color: 'green-400', icon: '⚡' },
    { number: '24', suffix: '/7', label: 'Support', color: 'orange-400', icon: '🛠️' }
  ];

  const features = [
    {
      icon: '🎯',
      title: 'Smart Matching',
      description: 'Advanced AI algorithms analyze your gaming patterns and preferences to find the perfect squad mates.',
      gradient: 'from-neon-cyan to-blue-500'
    },
    {
      icon: '⚡',
      title: 'Real-time Sync',
      description: 'Instant synchronization across all your devices with seamless multiplayer coordination.',
      gradient: 'from-neon-purple to-pink-500'
    },
    {
      icon: '🚀',
      title: 'Lightning Fast',
      description: 'Optimized performance with sub-millisecond response times for competitive gaming excellence.',
      gradient: 'from-green-400 to-teal-500'
    }
  ];

  const toggleTab = (tabId) => {
    setActiveTab(activeTab === tabId ? null : tabId);
  };

  useEffect(() => {
    // Hero text animation
    if (heroRef.current) {
      const heroText = heroRef.current.querySelector('.hero-title');
      if (heroText) {
        gsap.fromTo(heroText.children,
          { opacity: 0, y: 100, rotationX: -90 },
          { 
            opacity: 1, 
            y: 0, 
            rotationX: 0,
            duration: 1.2,
            stagger: 0.2,
            ease: "back.out(1.7)",
            delay: 0.5
          }
        );
      }
    }
  }, []);

  return (
    <GamingAnimations className="min-h-screen modern-bg">
      {/* Enhanced Background Layers */}
      <div className="absolute inset-0 modern-gradient"></div>
      
      {/* Floating Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-30 max-w-7xl mx-auto px-6 py-12 pt-40">
        
        {/* Hero Section */}
        <div ref={heroRef} className="text-center mb-24" data-animate="true">
          <h1 className="hero-title text-7xl md:text-8xl font-black mb-8 magnetic">
            <span className="text-white hero-glow">Squad</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-neon-purple to-pink-500 animate-gradient-x">
              Up
            </span>
          </h1>
          <p className="text-2xl md:text-3xl text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
            Next-generation gaming platform with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-purple font-semibold">
              Bringing gamers together
            </span>
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-20" data-animate="true">
          <GlassCard className="p-6">
            <div className="flex flex-wrap justify-center gap-4">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => toggleTab(tab.id)}
                  className={`glass-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <span className="text-xl mr-2">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Tab Content */}
        {activeTab && (
          <div className="flex justify-center mb-20">
            <GlassCard variant="feature" className="max-w-4xl text-center animate-scale-in">
              <div className="relative">
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full animate-pulse"></div>
                <p className="text-xl text-white/90 leading-relaxed">
                  {tabs.find(t => t.id === activeTab)?.description}
                </p>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {features.map((feature, index) => (
            <div key={feature.title} data-animate="true">
              <GlassCard variant="feature" className="text-center h-full group">
                <div className={`feature-icon bg-gradient-to-r ${feature.gradient} group-hover:scale-110 group-hover:rotate-6`}>
                  <span className="text-4xl">{feature.icon}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-6 group-hover:text-neon-cyan transition-colors duration-500">
                  {feature.title}
                </h3>
                <p className="text-white/70 leading-relaxed text-lg">
                  {feature.description}
                </p>
              </GlassCard>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-8 mb-24" data-animate="true">
          <GlassButton variant="primary" className="text-lg px-12 py-5">
            <span className="mr-3">🚀</span> Start Gaming
          </GlassButton>
          <GlassButton variant="neon" className="text-lg px-12 py-5">
            <span className="mr-3">⚡</span> Try Demo
          </GlassButton>
          <GlassButton variant="ghost" className="text-lg px-12 py-5">
            <span className="mr-3">👤</span> Sign In
          </GlassButton>
        </div>

        {/* Stats Section */}
        <div data-animate="true">
          <GlassCard variant="stats" className="mb-24">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={stat.label} className="text-center magnetic group">
                  <div className="mb-4">
                    <span className="text-3xl mb-3 block group-hover:scale-125 transition-transform duration-500">
                      {stat.icon}
                    </span>
                    <div 
                      className={`stat-number text-5xl font-black text-${stat.color} group-hover:brightness-125`}
                      data-target={stat.number}
                      data-suffix={stat.suffix}
                    >
                      0{stat.suffix}
                    </div>
                  </div>
                  <div className="stat-label">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* CTA Section */}
        <div className="text-center" data-animate="true">
          <GlassCard variant="cta" className="magnetic relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full blur-3xl animate-float"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-3xl animate-float-delayed"></div>
            </div>
            
            <div className="relative z-10">
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
                Ready to{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-coral-400 via-neon-purple to-neon-cyan animate-gradient-x">
                  Squad Up
                </span>
                <span className="text-white">?</span>
              </h2>
              <p className="text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
                Join <span className="text-neon-cyan font-semibold">thousands of gamers</span> finding their perfect squad. 
                Connect your Steam library, create groups, and vote on what to play next!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <GlassButton variant="primary" className="text-xl px-16 py-6">
                  <span className="mr-3">🎮</span> Get Started Free
                </GlassButton>
                <GlassButton variant="ghost" className="text-xl px-16 py-6">
                  <span className="mr-3">📺</span> Watch Demo
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Enhanced Styles */}
      <style>{`
        .modern-bg {
          background: linear-gradient(135deg, #0a0f1c 0%, #1a1f3a 25%, #2d1b69 75%, #4338ca 100%);
        }
        
        .modern-gradient {
          background: 
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%);
          animation: mesh-shift 15s ease-in-out infinite;
        }
        
        .glass-card {
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 
            0 25px 60px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transform-style: preserve-3d;
        }
        
        .glass-default {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.12) 0%, 
            rgba(255, 255, 255, 0.06) 50%, 
            rgba(255, 255, 255, 0.12) 100%
          );
        }
        
        .glass-feature {
          background: linear-gradient(135deg, 
            rgba(0, 255, 255, 0.08) 0%, 
            rgba(255, 255, 255, 0.06) 50%, 
            rgba(191, 0, 255, 0.08) 100%
          );
        }
        
        .glass-stats {
          background: linear-gradient(135deg, 
            rgba(168, 85, 247, 0.1) 0%, 
            rgba(255, 255, 255, 0.06) 50%, 
            rgba(0, 255, 255, 0.1) 100%
          );
        }
        
        .glass-cta {
          background: linear-gradient(135deg, 
            rgba(255, 127, 80, 0.1) 0%, 
            rgba(255, 255, 255, 0.06) 50%, 
            rgba(0, 255, 255, 0.1) 100%
          );
        }
        
        .glass-glow:hover {
          border-color: rgba(0, 255, 255, 0.4);
          box-shadow: 
            0 30px 70px rgba(0, 0, 0, 0.4),
            0 0 40px rgba(0, 255, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        .glass-feature-glow:hover {
          border-color: rgba(0, 255, 255, 0.5);
          box-shadow: 
            0 30px 70px rgba(0, 255, 255, 0.2),
            0 0 40px rgba(0, 255, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        .glass-stats-glow:hover {
          border-color: rgba(168, 85, 247, 0.5);
          box-shadow: 
            0 30px 70px rgba(168, 85, 247, 0.2),
            0 0 40px rgba(168, 85, 247, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        .glass-cta-glow:hover {
          border-color: rgba(255, 127, 80, 0.5);
          box-shadow: 
            0 30px 70px rgba(255, 127, 80, 0.2),
            0 0 40px rgba(255, 127, 80, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        .glass-button {
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 20px;
          padding: 16px 32px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          position: relative;
          overflow: hidden;
        }
        
        .glass-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }
        
        .glass-button:hover::before {
          left: 100%;
        }
        
        .glass-button-primary {
          background: linear-gradient(135deg, 
            rgba(255, 127, 80, 0.8) 0%, 
            rgba(255, 107, 70, 0.8) 100%
          );
          border: 1px solid rgba(255, 127, 80, 0.4);
          color: white;
          box-shadow: 0 15px 35px rgba(255, 127, 80, 0.3);
        }
        
        .glass-button-primary:hover {
          background: linear-gradient(135deg, 
            rgba(255, 127, 80, 0.9) 0%, 
            rgba(255, 107, 70, 0.9) 100%
          );
          box-shadow: 0 20px 50px rgba(255, 127, 80, 0.5);
        }
        
        .glass-button-neon {
          background: rgba(0, 255, 255, 0.1);
          border: 2px solid rgba(0, 255, 255, 0.6);
          color: #00ffff;
          box-shadow: 0 15px 35px rgba(0, 255, 255, 0.2);
        }
        
        .glass-button-neon:hover {
          background: rgba(0, 255, 255, 0.8);
          color: black;
          box-shadow: 0 20px 50px rgba(0, 255, 255, 0.5);
        }
        
        .glass-button-ghost {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          box-shadow: 0 15px 35px rgba(255, 255, 255, 0.1);
        }
        
        .glass-button-ghost:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
          box-shadow: 0 20px 50px rgba(255, 255, 255, 0.2);
        }
        
        .glass-tab {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 18px;
          padding: 14px 24px;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 600;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
        }
        
        .glass-tab:hover {
          background: rgba(255, 255, 255, 0.12);
          color: white;
          transform: translateY(-2px);
        }
        
        .glass-tab.active {
          background: linear-gradient(135deg, 
            rgba(0, 255, 255, 0.2) 0%, 
            rgba(168, 85, 247, 0.2) 100%
          );
          border-color: rgba(0, 255, 255, 0.4);
          color: rgba(0, 255, 255, 0.9);
          box-shadow: 0 15px 30px rgba(0, 255, 255, 0.2);
        }
        
        .feature-icon {
          width: 80px;
          height: 80px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
          transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
        }
        
        .floating-shape {
          position: absolute;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          animation: float-gentle 12s ease-in-out infinite;
        }
        
        .shape-1 {
          top: 10%;
          left: 5%;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          animation-delay: 0s;
        }
        
        .shape-2 {
          top: 25%;
          right: 10%;
          width: 80px;
          height: 80px;
          animation-delay: 2s;
        }
        
        .shape-3 {
          bottom: 30%;
          left: 15%;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          animation-delay: 4s;
        }
        
        .shape-4 {
          bottom: 10%;
          right: 20%;
          width: 60px;
          height: 60px;
          animation-delay: 6s;
        }
        
        .hero-glow {
          text-shadow: 0 0 30px rgba(255, 255, 255, 0.6);
        }
        
        .stat-number {
          transition: all 0.5s ease;
        }
        
        .stat-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        
        .magnetic {
          transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .animate-scale-in {
          animation: scale-in 0.6s ease-out;
        }
        
        /* Color definitions */
        .text-neon-cyan { color: #00ffff; }
        .text-neon-purple { color: #bf00ff; }
        .bg-neon-cyan { background-color: #00ffff; }
        .bg-neon-purple { background-color: #bf00ff; }
        
        @keyframes float-gentle {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
            opacity: 0.4;
          }
          50% { 
            transform: translateY(-30px) rotate(180deg);
            opacity: 0.8;
          }
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px);
            opacity: 0.6;
          }
          50% { 
            transform: translateY(-20px);
            opacity: 1;
          }
        }
        
        @keyframes float-delayed {
          0%, 100% { 
            transform: translateY(0px) translateX(0px);
            opacity: 0.4;
          }
          50% { 
            transform: translateY(-25px) translateX(10px);
            opacity: 0.8;
          }
        }
        
        @keyframes mesh-shift {
          0%, 100% { 
            filter: hue-rotate(0deg) brightness(1);
          }
          50% { 
            filter: hue-rotate(60deg) brightness(1.1);
          }
        }
        
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 4s ease infinite;
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
      `}</style>
    </GamingAnimations>
  );
};

export default Home;