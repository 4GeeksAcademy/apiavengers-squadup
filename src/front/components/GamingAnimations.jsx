import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Advanced Gaming Animation Component with GSAP Integration
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
      particlesRef.current.forEach(particle => {
        if (particle && particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      });
    };
  }, []);

  const initializeAnimations = () => {
    const container = containerRef.current;
    if (!container) return;

    // Master timeline for entrance animations
    const masterTL = gsap.timeline();

    // 1. Container entrance with dramatic effect
    masterTL.fromTo(container, 
      { 
        opacity: 0, 
        scale: 0.8,
        filter: 'blur(10px)'
      },
      { 
        opacity: 1, 
        scale: 1,
        filter: 'blur(0px)',
        duration: 1.2, 
        ease: "power3.out" 
      }
    );

    // 2. Staggered element animations
    const animatedElements = container.querySelectorAll('[data-animate]');
    if (animatedElements.length > 0) {
      masterTL.fromTo(animatedElements,
        { 
          opacity: 0, 
          y: 60, 
          rotationX: -20,
          scale: 0.8
        },
        { 
          opacity: 1, 
          y: 0, 
          rotationX: 0,
          scale: 1,
          duration: 0.8,
          stagger: {
            amount: 0.6,
            from: "start"
          },
          ease: "back.out(1.7)"
        },
        "-=0.8"
      );
    }

    // 3. Initialize all advanced effects
    createParticleSystem();
    addMagneticEffects();
    createEnergyFlow();
    setupScrollTriggers();
    addMouseFollower();
    createFloatingElements();
  };

  const createParticleSystem = () => {
    const container = containerRef.current;
    if (!container) return;

    // Create multiple particle layers
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        
        // Different particle types per layer
        const particleTypes = [
          'w-1 h-1 bg-cyan-400 rounded-full',
          'w-2 h-2 bg-purple-500 rounded-full',
          'w-1 h-4 bg-gradient-to-t from-cyan-400 to-transparent'
        ];
        
        particle.className = `particle absolute ${particleTypes[layer]} opacity-60 pointer-events-none`;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.zIndex = -1;
        
        container.appendChild(particle);
        particlesRef.current.push(particle);

        // Unique animation per layer
        const baseAnimation = {
          duration: Math.random() * 6 + 4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: Math.random() * 3
        };

        switch(layer) {
          case 0: // Floating particles
            gsap.to(particle, {
              ...baseAnimation,
              x: (Math.random() - 0.5) * 200,
              y: (Math.random() - 0.5) * 200,
              rotation: 360,
              opacity: Math.random() * 0.8 + 0.2,
              scale: Math.random() * 1.5 + 0.5
            });
            break;
          case 1: // Orbital particles  
            gsap.to(particle, {
              ...baseAnimation,
              motionPath: {
                path: "M0,0 Q50,-50 100,0 T200,0",
                autoRotate: true
              },
              opacity: Math.random() * 0.6 + 0.3
            });
            break;
          case 2: // Streak particles
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

        // Add glow effect
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
      // Multi-layer energy animation
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

    // Create dynamic energy waves
    const createEnergyWave = () => {
      const wave = document.createElement('div');
      wave.className = 'absolute inset-0 rounded-full pointer-events-none';
      wave.style.background = 'radial-gradient(circle, rgba(0,255,255,0.3) 0%, transparent 70%)';
      wave.style.transform = 'scale(0)';
      
      containerRef.current?.appendChild(wave);
      
      gsap.timeline()
        .to(wave, {
          scale: 3,
          opacity: 0,
          duration: 2,
          ease: "power2.out",
          onComplete: () => {
            wave.remove();
          }
        });
    };

    // Trigger energy waves periodically
    setInterval(createEnergyWave, 3000);
  };

  const setupScrollTriggers = () => {
    // Enhanced scroll animations for cards
    const cards = containerRef.current?.querySelectorAll('.gaming-card');
    cards?.forEach((card, index) => {
      // Main card animation
      gsap.fromTo(card, 
        { 
          opacity: 0, 
          y: 100, 
          rotationY: -15,
          scale: 0.8
        },
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

      // Parallax effect for card content
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

    // Animated counter for stats
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
            const formatted = value >= 1000000 
              ? (value / 1000000).toFixed(1) + 'M'
              : value >= 1000 
              ? (value / 1000).toFixed(0) + 'K'
              : value.toString();
            
            stat.textContent = formatted + suffix;
          }
        }
      );

      // Glow effect on count
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

    // Background parallax
    gsap.to(containerRef.current, {
      backgroundPosition: "50% 100%",
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: 1
      }
    });
  };

  const addMouseFollower = () => {
    // Create cursor follower
    const cursor = document.createElement('div');
    cursor.className = 'fixed w-6 h-6 pointer-events-none z-50 mix-blend-difference rounded-full';
    cursor.style.background = 'radial-gradient(circle, rgba(0,255,255,0.8) 0%, transparent 70%)';
    cursor.style.transform = 'translate(-50%, -50%)';
    cursor.style.transition = 'width 0.3s, height 0.3s';
    
    document.body.appendChild(cursor);

    const handleMouseMove = (e) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.1,
        ease: "power2.out"
      });
    };

    const handleMouseEnter = () => {
      gsap.to(cursor, {
        scale: 2,
        duration: 0.3,
        ease: "power2.out"
      });
    };

    const handleMouseLeave = () => {
      gsap.to(cursor, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    
    // Add hover effects for interactive elements
    const interactiveElements = document.querySelectorAll('button, a, .magnetic');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    // Cleanup function
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cursor.remove();
    };
  };

  const createFloatingElements = () => {
    // Create geometric shapes that float around
    const shapes = ['circle', 'triangle', 'square'];
    
    shapes.forEach((shape, index) => {
      const element = document.createElement('div');
      element.className = `floating-${shape} absolute pointer-events-none`;
      
      // Style based on shape
      switch(shape) {
        case 'circle':
          element.style.cssText = `
            width: 20px; height: 20px; 
            background: linear-gradient(45deg, rgba(0,255,255,0.3), rgba(191,0,255,0.3));
            border-radius: 50%;
          `;
          break;
        case 'triangle':
          element.style.cssText = `
            width: 0; height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 20px solid rgba(57,255,20,0.3);
          `;
          break;
        case 'square':
          element.style.cssText = `
            width: 15px; height: 15px;
            background: linear-gradient(45deg, rgba(255,20,147,0.3), rgba(255,140,0,0.3));
            transform: rotate(45deg);
          `;
          break;
      }
      
      element.style.left = Math.random() * 100 + '%';
      element.style.top = Math.random() * 100 + '%';
      element.style.zIndex = '-1';
      
      containerRef.current?.appendChild(element);
      
      // Animate floating movement
      gsap.to(element, {
        x: (Math.random() - 0.5) * 300,
        y: (Math.random() - 0.5) * 300,
        rotation: 360,
        scale: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.7 + 0.3,
        duration: Math.random() * 8 + 6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: index * 1
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

// Enhanced Gaming Button Component
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

    // Create pulse effect
    const createPulse = () => {
      const pulse = document.createElement('div');
      pulse.className = 'absolute inset-0 rounded-xl pointer-events-none';
      pulse.style.background = 'rgba(255, 255, 255, 0.3)';
      pulse.style.transform = 'scale(0)';
      
      button.appendChild(pulse);
      
      gsap.timeline()
        .to(pulse, {
          scale: 1,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          onComplete: () => pulse.remove()
        });
    };

    const handleClick = (e) => {
      // Ripple effect from click position
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('div');
      ripple.className = 'absolute rounded-full pointer-events-none';
      ripple.style.cssText = `
        left: ${x}px; top: ${y}px;
        width: 20px; height: 20px;
        background: rgba(255, 255, 255, 0.6);
        transform: translate(-50%, -50%) scale(0);
      `;
      
      button.appendChild(ripple);
      
      gsap.to(ripple, {
        scale: 10,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        onComplete: () => ripple.remove()
      });

      // Button press animation
      gsap.timeline()
        .to(button, { scale: 0.95, duration: 0.1 })
        .to(button, { scale: 1, duration: 0.2, ease: "elastic.out(1, 0.3)" });
    };

    const handleHover = () => {
      gsap.to(button, {
        y: -3,
        scale: 1.02,
        duration: 0.3,
        ease: "power2.out"
      });

      // Enhanced glow
      gsap.to(button, {
        boxShadow: "0 10px 30px rgba(255, 127, 80, 0.5)",
        duration: 0.3
      });

      // Shimmer effect
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
        className="shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full opacity-0"
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

      // Dynamic lighting effect
      const lightX = ((e.clientX - rect.left) / rect.width) * 100;
      const lightY = ((e.clientY - rect.top) / rect.height) * 100;
      
      card.style.background = `
        radial-gradient(circle at ${lightX}% ${lightY}%, 
        rgba(0, 255, 255, 0.15) 0%, 
        rgba(255, 255, 255, 0.08) 50%, 
        rgba(191, 0, 255, 0.1) 100%)
      `;
    };

    const handleMouseEnter = () => {
      isHovering = true;
      gsap.to(card, {
        scale: 1.03,
        y: -5,
        boxShadow: "0 25px 50px rgba(0, 255, 255, 0.2)",
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

      // Reset background
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

export { GamingAnimations, GamingButton, GamingCard };