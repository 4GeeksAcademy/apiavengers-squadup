// src/front/components/GamingAnimations.jsx
import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

/**
 * Enhanced container with advanced GSAP animations and particle effects
 */
export const GamingAnimations = ({ children, className = "" }) => {
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
    
    const masterTL = gsap.timeline();
    masterTL.fromTo(container, 
      { opacity: 0, scale: 0.8, filter: 'blur(10px)' }, 
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: "power3.out" }
    );
    
    const animatedElements = container.querySelectorAll('[data-animate]');
    if (animatedElements.length > 0) { 
      masterTL.fromTo(animatedElements, 
        { opacity: 0, y: 60, rotationX: -20, scale: 0.8 }, 
        { 
          opacity: 1, 
          y: 0, 
          rotationX: 0, 
          scale: 1, 
          duration: 0.8, 
          stagger: { amount: 0.6, from: "start" }, 
          ease: "back.out(1.7)" 
        }, 
        "-=0.8"
      ); 
    }
    
    createParticleSystem();
    addMagneticEffects();
    createEnergyFlow();
    setupScrollTriggers();
  };

  const createParticleSystem = () => {
    const container = containerRef.current; 
    if (!container) return;
    
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        const particleTypes = [
          'w-1 h-1 bg-cyan-400 rounded-full', 
          'w-2 h-2 bg-purple-500 rounded-full', 
          'w-1 h-4 bg-gradient-to-t from-cyan-400 to-transparent'
        ];
        particle.className = `particle absolute ${particleTypes[layer]} opacity-60 pointer-events-none`;
        particle.style.left = `${Math.random() * 100}%`; 
        particle.style.top = `${Math.random() * 100}%`; 
        particle.style.zIndex = -1;
        container.appendChild(particle); 
        particlesRef.current.push(particle);
        
        const baseAnimation = { 
          duration: Math.random() * 6 + 4, 
          repeat: -1, 
          yoyo: true, 
          ease: "sine.inOut", 
          delay: Math.random() * 3 
        };
        
        switch (layer) {
          case 0: 
            gsap.to(particle, { 
              ...baseAnimation, 
              x: (Math.random() - 0.5) * 200, 
              y: (Math.random() - 0.5) * 200, 
              rotation: 360, 
              opacity: Math.random() * 0.8 + 0.2, 
              scale: Math.random() * 1.5 + 0.5 
            }); 
            break;
          case 1: 
            gsap.to(particle, { 
              ...baseAnimation, 
              motionPath: { 
                path: "M0,0 Q50,-50 100,0 T200,0", 
                autoRotate: true 
              }, 
              opacity: Math.random() * 0.6 + 0.3 
            }); 
            break;
          case 2: 
            gsap.to(particle, { 
              ...baseAnimation, 
              x: (Math.random() - 0.5) * 800, 
              y: (Math.random() - 0.5) * 400, 
              scaleY: Math.random() * 3 + 1, 
              opacity: Math.random() * 0.4 + 0.1 
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
        const deltaX = (e.clientX - centerX) * 0.15; 
        const deltaY = (e.clientY - centerY) * 0.15; 
        gsap.to(element, { 
          x: deltaX, 
          y: deltaY, 
          rotation: deltaX * 0.1, 
          duration: 0.3, 
          ease: "power2.out" 
        }); 
        gsap.to(element, { 
          boxShadow: `0 0 30px rgba(0, 255, 255, 0.4)`, 
          duration: 0.3 
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
          boxShadow: "none", 
          duration: 0.6, 
          ease: "elastic.out(1, 0.3)" 
        }); 
      };
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
    });
  };

  const createEnergyFlow = () => {
    const energyElements = containerRef.current?.querySelectorAll('.energy-flow');
    energyElements?.forEach(element => { 
      gsap.timeline({ repeat: -1 })
        .to(element, { 
          backgroundPosition: "200% 0", 
          duration: 2, 
          ease: "none" 
        })
        .to(element, { 
          opacity: 0.8, 
          duration: 0.5, 
          yoyo: true, 
          repeat: 1 
        }, 0); 
    });
  };
  
  const setupScrollTriggers = () => {
    const cards = containerRef.current?.querySelectorAll('.gaming-card');
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
      
      const cardContent = card.children[0]; 
      if (cardContent) { 
        gsap.to(cardContent, { 
          y: -20, 
          duration: 1, 
          ease: "none", 
          scrollTrigger: { 
            trigger: card, 
            start: "top bottom", 
            end: "bottom top", 
            scrub: 1 
          } 
        }); 
      } 
    });
    
    const stats = containerRef.current?.querySelectorAll('.stat-number');
    stats?.forEach(stat => { 
      const target = parseInt(stat.getAttribute('data-target')) || 0; 
      const suffix = stat.getAttribute('data-suffix') || ''; 
      gsap.fromTo(stat, 
        { textContent: 0 }, 
        { 
          textContent: target, 
          duration: 2.5, 
          ease: "power2.out", 
          snap: { textContent: 1 }, 
          scrollTrigger: { 
            trigger: stat, 
            start: "top 80%", 
            toggleActions: "play none none reverse" 
          }, 
          onUpdate: function() { 
            const value = Math.round(this.targets()[0].textContent); 
            const formatted = value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : 
                             value >= 1000 ? `${(value / 1000).toFixed(0)}K` : 
                             value.toString(); 
            stat.textContent = formatted + suffix; 
          } 
        }
      ); 
      gsap.to(stat, { 
        textShadow: "0 0 20px currentColor", 
        duration: 0.5, 
        repeat: -1, 
        yoyo: true, 
        scrollTrigger: { 
          trigger: stat, 
          start: "top 80%", 
          toggleActions: "play none none reverse" 
        } 
      }); 
    });
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden ${className}`} 
      style={{ 
        perspective: '1000px', 
        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(191,0,255,0.1) 0%, transparent 50%)' 
      }}
    > 
      {children} 
    </div>
  );
};

/**
 * Enhanced Link component with advanced GSAP animations
 */
export const GamingLink = ({ 
    to, 
    children, 
    variant = 'primary', 
    className = '', 
    ...props 
}) => {
    const linkRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const link = linkRef.current; 
        if (!link) return;
        
        const handleHover = () => { 
            gsap.to(link, { 
                y: -3, 
                scale: 1.02, 
                duration: 0.3, 
                ease: "power2.out" 
            }); 
            gsap.to(link, { 
                boxShadow: "0 10px 30px rgba(255, 127, 80, 0.5)", 
                duration: 0.3 
            }); 
            const shimmer = link.querySelector('.shimmer'); 
            if (shimmer) { 
                gsap.fromTo(shimmer, 
                    { x: '-100%', opacity: 0 }, 
                    { x: '100%', opacity: 1, duration: 0.8, ease: "power2.out" }
                ); 
            } 
        };
        
        const handleLeave = () => { 
            gsap.to(link, { 
                y: 0, 
                scale: 1, 
                boxShadow: "0 4px 14px rgba(255, 127, 80, 0.3)", 
                duration: 0.4, 
                ease: "elastic.out(1, 0.3)" 
            }); 
        };
        
        link.addEventListener('mouseenter', handleHover);
        link.addEventListener('mouseleave', handleLeave);
        
        return () => { 
            link.removeEventListener('mouseenter', handleHover); 
            link.removeEventListener('mouseleave', handleLeave); 
        };
    }, []);

    const handleClick = (e) => { 
        e.preventDefault(); 
        gsap.timeline()
            .to(linkRef.current, { scale: 0.95, duration: 0.1 })
            .to(linkRef.current, { 
                scale: 1, 
                duration: 0.4, 
                ease: "elastic.out(1, 0.3)", 
                onComplete: () => navigate(to) 
            }); 
    };

    const getVariantClasses = () => { 
        switch (variant) { 
            case 'neon': 
                return 'bg-transparent border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black'; 
            case 'ghost': 
                return 'bg-white/10 border border-white/30 text-white hover:bg-white/20'; 
            case 'secondary': 
                return 'px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-lg transition-all duration-300';
            case 'primary':
            default: 
                return 'px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105'; 
        } 
    };

    const classes = `inline-block text-center no-underline relative overflow-hidden font-semibold transition-all duration-300 transform magnetic ${getVariantClasses()} ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

    return (
        <Link 
            ref={linkRef} 
            to={to} 
            onClick={handleClick} 
            className={classes} 
            {...props}
        > 
            <span className="relative z-10">{children}</span> 
            <div className="shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full opacity-0"/> 
        </Link>
    );
};

/**
 * Enhanced button component with advanced GSAP animations
 */
export const GamingButton = ({ 
    children, 
    variant = 'primary', 
    className = '',
    onClick,
    disabled = false,
    loading = false,
    icon = null,
    ...props 
}) => {
    const buttonRef = useRef(null);

    useEffect(() => {
        const button = buttonRef.current; 
        if (!button) return;
        
        const handleHover = () => { 
            gsap.to(button, { 
                y: -3, 
                scale: 1.02, 
                duration: 0.3, 
                ease: "power2.out" 
            }); 
            gsap.to(button, { 
                boxShadow: "0 10px 30px rgba(255, 127, 80, 0.5)", 
                duration: 0.3 
            }); 
            const shimmer = button.querySelector('.shimmer'); 
            if (shimmer) { 
                gsap.fromTo(shimmer, 
                    { x: '-100%', opacity: 0 }, 
                    { x: '100%', opacity: 1, duration: 0.8, ease: "power2.out" }
                ); 
            } 
        };
        
        const handleLeave = () => { 
            gsap.to(button, { 
                y: 0, 
                scale: 1, 
                boxShadow: "0 4px 14px rgba(255, 127, 80, 0.3)", 
                duration: 0.4, 
                ease: "elastic.out(1, 0.3)" 
            }); 
        };
        
        button.addEventListener('mouseenter', handleHover);
        button.addEventListener('mouseleave', handleLeave);
        
        return () => { 
            button.removeEventListener('mouseenter', handleHover); 
            button.removeEventListener('mouseleave', handleLeave); 
        };
    }, []);

    const handleClick = (e) => { 
        if (onClick) { 
            onClick(e); 
        } 
        gsap.timeline()
            .to(buttonRef.current, { scale: 0.95, duration: 0.1 })
            .to(buttonRef.current, { 
                scale: 1, 
                duration: 0.2, 
                ease: "elastic.out(1, 0.3)" 
            }); 
    };

    const getVariantClasses = () => { 
        switch (variant) { 
            case 'neon': 
                return 'bg-transparent border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black'; 
            case 'ghost': 
                return 'px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300';
            case 'success': 
                return 'px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-300';
            case 'danger': 
                return 'px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg transition-all duration-300';
            case 'secondary':
                return 'px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-lg transition-all duration-300';
            case 'primary':
            default: 
                return 'px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105'; 
        } 
    };

    const baseClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const classes = `relative overflow-hidden font-semibold transition-all duration-300 transform magnetic ${getVariantClasses()} ${baseClasses} ${className}`;

    return (
        <button 
            ref={buttonRef} 
            className={classes} 
            onClick={handleClick} 
            disabled={disabled || loading}
            {...props}
        > 
            <div className="flex items-center justify-center space-x-2 relative z-10">
                {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : icon ? (
                    <span>{icon}</span>
                ) : null}
                <span>{children}</span>
            </div>
            <div className="shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full opacity-0"/> 
        </button>
    );
};

/**
 * Enhanced gaming card with 3D hover effects
 */
export const GamingCard = ({ 
    children, 
    className = '',
    hover = true,
    glow = false,
    ...props 
}) => {
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
            const rotateX = (e.clientY - centerY) / 15; 
            const rotateY = (centerX - e.clientX) / 15; 
            gsap.to(card, { 
                rotationX: rotateX, 
                rotationY: rotateY, 
                transformPerspective: 1000, 
                duration: 0.3, 
                ease: "power2.out" 
            }); 
            const lightX = ((e.clientX - rect.left) / rect.width) * 100; 
            const lightY = ((e.clientY - rect.top) / rect.height) * 100; 
            card.style.background = `radial-gradient(circle at ${lightX}% ${lightY}%, rgba(0, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(191, 0, 255, 0.1) 100%)`; 
        };
        
        const handleMouseEnter = () => { 
            isHovering = true; 
            gsap.to(card, { 
                scale: hover ? 1.03 : 1, 
                y: hover ? -5 : 0, 
                boxShadow: glow ? "0 25px 50px rgba(0, 255, 255, 0.2)" : "0 25px 50px rgba(0, 0, 0, 0.37)", 
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
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.37)", 
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
    }, [hover, glow]);
    
    const hoverClasses = hover ? 'hover:scale-105 hover:shadow-2xl' : '';
    const glowClasses = glow ? 'hover:shadow-coral-500/25' : '';
    
    const classes = `gaming-card backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl transition-all duration-300 preserve-3d ${hoverClasses} ${glowClasses} ${className}`;

    return (
        <div 
            ref={cardRef} 
            className={classes} 
            style={{ transformStyle: 'preserve-3d' }} 
            data-animate="true" 
            {...props}
        > 
            {children} 
        </div>
    );
};

/**
 * Floating action button for gaming features
 */
export const FloatingActionButton = ({ 
    children, 
    onClick, 
    position = 'bottom-right',
    className = '',
    ...props 
}) => {
    const positionClasses = {
        'bottom-right': 'fixed bottom-6 right-6',
        'bottom-left': 'fixed bottom-6 left-6',
        'top-right': 'fixed top-6 right-6',
        'top-left': 'fixed top-6 left-6'
    };

    const classes = `${positionClasses[position]} w-14 h-14 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center z-50 magnetic ${className}`;

    return (
        <button className={classes} onClick={onClick} {...props}>
            {children}
        </button>
    );
};

/**
 * Progress bar with gaming theme
 */
export const GamingProgressBar = ({ 
    progress = 0, 
    className = '',
    showPercentage = true,
    animated = true,
    color = 'coral'
}) => {
    const colorClasses = {
        coral: 'bg-gradient-to-r from-coral-500 to-coral-600',
        green: 'bg-gradient-to-r from-green-500 to-green-600',
        blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
        purple: 'bg-gradient-to-r from-purple-500 to-purple-600'
    };

    const animationClass = animated ? 'transition-all duration-500 ease-out' : '';

    return (
        <div className={`w-full bg-white/10 rounded-full h-3 ${className}`}>
            <div 
                className={`${colorClasses[color]} h-3 rounded-full ${animationClass} flex items-center justify-center`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            >
                {showPercentage && progress > 20 && (
                    <span className="text-white text-xs font-bold">
                        {Math.round(progress)}%
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * Gaming badge/tag component
 */
export const GamingBadge = ({ 
    children, 
    variant = 'default',
    size = 'normal',
    className = ''
}) => {
    const variantClasses = {
        default: 'bg-white/20 text-white border border-white/30',
        success: 'bg-green-500/20 text-green-300 border border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        danger: 'bg-red-500/20 text-red-300 border border-red-500/30',
        info: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    };

    const sizeClasses = {
        small: 'px-2 py-1 text-xs',
        normal: 'px-3 py-1 text-sm',
        large: 'px-4 py-2 text-base'
    };

    const classes = `${variantClasses[variant]} ${sizeClasses[size]} rounded-full font-medium ${className}`;

    return (
        <span className={classes}>
            {children}
        </span>
    );
};

export default {
    GamingAnimations,
    GamingLink,
    GamingButton,
    GamingCard,
    FloatingActionButton,
    GamingProgressBar,
    GamingBadge
};