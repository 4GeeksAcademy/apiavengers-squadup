/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Gaming-specific color palette (from your existing config)
      colors: {
        // Neon colors for gaming aesthetics
        neon: {
          cyan: '#00ffff',
          purple: '#bf00ff',
          green: '#39ff14',
          pink: '#ff1493',
          blue: '#0080ff',
          yellow: '#ffff00',
          orange: '#ff8000'
        },
        
        // Enhanced Discord-inspired palette
        discord: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        
        // Gaming coral palette
        coral: {
          50: '#fef7f4',
          100: '#fdeee6',
          200: '#fbd5c3',
          300: '#f8b69b',
          400: '#f4936e',
          500: '#ff7f50',
          600: '#e66b45',
          700: '#cc5a3a',
          800: '#b34a30',
          900: '#9a3b26'
        },
        
        // Enhanced marine palette
        marine: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e'
        },
        
        // Gaming-specific electric colors
        electric: {
          blue: '#0080ff',
          purple: '#8000ff',
          cyan: '#00ffff',
          lime: '#80ff00'
        },
        
        // Add lavender color that's referenced in your code
        lavender: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87'
        }
      },
      
      // Typography system optimized for gaming
      fontFamily: {
        'gaming': ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        'display': ['Space Grotesk', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      
      // Enhanced spacing scale
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem'
      },
      
      // Gaming-specific border radius
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem'
      },
      
      // Advanced shadow system with enhanced glows
      boxShadow: {
        'glow-sm': '0 0 10px rgba(0, 255, 255, 0.3)',
        'glow': '0 0 20px rgba(0, 255, 255, 0.4)',
        'glow-lg': '0 0 30px rgba(0, 255, 255, 0.5)',
        'glow-xl': '0 0 40px rgba(0, 255, 255, 0.6)',
        'neon-purple': '0 0 20px rgba(191, 0, 255, 0.4)',
        'neon-green': '0 0 20px rgba(57, 255, 20, 0.4)',
        'gaming': '0 8px 32px rgba(0, 0, 0, 0.37)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.37)',
        'depth-1': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'depth-2': '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
        'depth-3': '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
        'depth-4': '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)',
        'depth-5': '0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)'
      },
      
      // Advanced blur effects
      backdropBlur: {
        'xs': '2px',
        '4xl': '72px',
        '5xl': '96px'
      },
      
      // Animation timing functions
      transitionTimingFunction: {
        'elastic': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'gaming': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      
      // Custom durations
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1200': '1200ms',
        '1500': '1500ms',
        '2000': '2000ms'
      },
      
      // Gaming-specific transforms
      scale: {
        '102': '1.02',
        '103': '1.03',
        '98': '0.98',
        '97': '0.97'
      },
      
      // Advanced gradients
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gaming-mesh': `
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)
        `,
        'energy-flow': 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.4), transparent)',
        'neon-glow': 'linear-gradient(45deg, #00ffff, #bf00ff, #39ff14)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))'
      },
      
      // Enhanced keyframes for advanced animations
      keyframes: {
        'float': {
          '0%, 100%': { 
            transform: 'translateY(0px) rotate(0deg)',
            opacity: '0.4'
          },
          '50%': { 
            transform: 'translateY(-20px) rotate(180deg)',
            opacity: '0.8'
          }
        },
        'glow-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)',
            filter: 'brightness(1)'
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.8)',
            filter: 'brightness(1.2)'
          }
        },
        'shimmer': {
          '0%': { 
            backgroundPosition: '-200% 0',
            textShadow: '0 0 5px currentColor'
          },
          '100%': { 
            backgroundPosition: '200% 0',
            textShadow: '0 0 20px currentColor, 0 0 30px rgba(0, 255, 255, 0.5)'
          }
        },
        'energy-flow': {
          '0%, 100%': { 
            backgroundPosition: '-200% 0',
            opacity: '0'
          },
          '50%': { 
            backgroundPosition: '200% 0',
            opacity: '1'
          }
        },
        'mesh-shift': {
          '0%, 100%': { 
            filter: 'hue-rotate(0deg) brightness(1)',
            transform: 'scale(1) rotate(0deg)'
          },
          '33%': { 
            filter: 'hue-rotate(120deg) brightness(1.1)',
            transform: 'scale(1.05) rotate(1deg)'
          },
          '66%': { 
            filter: 'hue-rotate(240deg) brightness(0.9)',
            transform: 'scale(0.95) rotate(-1deg)'
          }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
            'filter': 'hue-rotate(0deg)'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
            'filter': 'hue-rotate(45deg)'
          }
        },
        'bounce-in': {
          '0%': {
            transform: 'scale(0.3)',
            opacity: '0'
          },
          '50%': {
            transform: 'scale(1.05)'
          },
          '70%': {
            transform: 'scale(0.9)'
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1'
          }
        },
        'slide-up': {
          '0%': {
            transform: 'translateY(100%)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1'
          }
        },
        'slide-down': {
          '0%': {
            transform: 'translateY(-100%)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1'
          }
        },
        'scale-in': {
          '0%': {
            transform: 'scale(0.9)',
            opacity: '0'
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1'
          }
        },
        'rotate-in': {
          '0%': {
            transform: 'rotate(-180deg) scale(0.5)',
            opacity: '0'
          },
          '100%': {
            transform: 'rotate(0deg) scale(1)',
            opacity: '1'
          }
        },
        'text-glow-pulse': {
          '0%, 100%': {
            textShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px rgba(0, 255, 255, 0.5)'
          },
          '50%': {
            textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px rgba(0, 255, 255, 0.8), 0 0 40px rgba(191, 0, 255, 0.6)'
          }
        },
        'particle-float': {
          '0%': { 
            transform: 'translateY(0) translateX(0) rotate(0deg)',
            opacity: '0.4'
          },
          '50%': { 
            transform: 'translateY(-100vh) translateX(20px) rotate(180deg)',
            opacity: '0.8'
          },
          '100%': { 
            transform: 'translateY(-200vh) translateX(-10px) rotate(360deg)',
            opacity: '0'
          }
        }
      },
      
      // Enhanced animation definitions
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'energy-flow': 'energy-flow 3s ease-in-out infinite',
        'mesh-shift': 'mesh-shift 8s ease-in-out infinite',
        'gradient-x': 'gradient-x 15s ease infinite',
        'bounce-in': 'bounce-in 0.6s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.5s ease-out',
        'scale-in': 'scale-in 0.4s ease-out',
        'rotate-in': 'rotate-in 0.6s ease-out',
        'text-glow-pulse': 'text-glow-pulse 3s ease-in-out infinite',
        'particle-float': 'particle-float 25s linear infinite'
      },
      
      // Custom z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      }
    }
  },
  plugins: [
    // Enhanced plugin for gaming utilities with rich effects
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Enhanced glassmorphism utilities
        '.glass-effect': {
          'backdrop-filter': 'blur(16px) saturate(180%) brightness(110%)',
          '-webkit-backdrop-filter': 'blur(16px) saturate(180%) brightness(110%)',
          'background': 'rgba(255, 255, 255, 0.08)',
          'border': '1px solid rgba(255, 255, 255, 0.15)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.37)',
          'will-change': 'backdrop-filter'
        },
        '.glass-dark': {
          'backdrop-filter': 'blur(20px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(180%)',
          'background': 'rgba(0, 0, 0, 0.3)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.6)'
        },
        '.glass-gaming': {
          'backdrop-filter': 'blur(24px) saturate(200%) brightness(115%)',
          '-webkit-backdrop-filter': 'blur(24px) saturate(200%) brightness(115%)',
          'background': 'linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(191, 0, 255, 0.1) 100%)',
          'border': '1px solid rgba(0, 255, 255, 0.2)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 255, 255, 0.1) inset'
        },
        
        // Enhanced navbar glassmorphism
        '.navbar-glass': {
          'backdrop-filter': 'blur(16px) saturate(180%) brightness(110%)',
          '-webkit-backdrop-filter': 'blur(16px) saturate(180%) brightness(110%)',
          'background': 'rgba(255, 255, 255, 0.08)',
          'border': '1px solid rgba(255, 255, 255, 0.15)',
          'border-radius': '20px',
          'padding': '16px 24px',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.37), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
          'max-width': '1200px',
          'margin': '0 auto',
          'transition': 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          'will-change': 'transform, backdrop-filter, background'
        },
        
        // Enhanced dropdown
        '.nav-dropdown': {
          'position': 'absolute',
          'top': '100%',
          'right': '0',
          'margin-top': '8px',
          'width': '240px',
          'backdrop-filter': 'blur(20px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(180%)',
          'background': 'rgba(0, 0, 0, 0.85)',
          'border': '1px solid rgba(255, 255, 255, 0.15)',
          'border-radius': '16px',
          'padding': '12px',
          'box-shadow': '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
          'transform': 'scale(0.95) translateY(-10px)',
          'opacity': '0',
          'pointer-events': 'none',
          'transition': 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          'z-index': '100',
          'will-change': 'transform, opacity'
        },
        '.nav-dropdown.active': {
          'transform': 'scale(1) translateY(0)',
          'opacity': '1',
          'pointer-events': 'auto'
        },
        '.dropdown-item': {
          'display': 'block',
          'width': '100%',
          'padding': '12px 16px',
          'text-align': 'left',
          'color': 'rgba(255, 255, 255, 0.9)',
          'background': 'transparent',
          'border': 'none',
          'border-radius': '8px',
          'font-size': '14px',
          'font-weight': '500',
          'transition': 'all 0.3s ease',
          'cursor': 'pointer',
          'margin-bottom': '4px',
          'will-change': 'background, transform'
        },
        '.dropdown-item:hover': {
          'background': 'rgba(255, 255, 255, 0.15)',
          'color': 'white',
          'transform': 'translateX(5px)',
          'box-shadow': '0 0 15px rgba(0, 255, 255, 0.2)'
        },
        
        // Enhanced text effects
        '.text-shadow-glow': {
          'text-shadow': '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px rgba(0, 255, 255, 0.5)',
          'animation': 'text-glow-pulse 3s ease-in-out infinite'
        },
        '.text-glow': {
          'text-shadow': '0 0 10px currentColor'
        },
        '.text-glow-lg': {
          'text-shadow': '0 0 20px currentColor, 0 0 40px currentColor'
        },
        '.text-neon': {
          'color': '#00ffff',
          'text-shadow': '0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 15px #00ffff'
        },
        
        // Enhanced magnetic effect
        '.magnetic': {
          'transition': 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          'will-change': 'transform'
        },
        '.magnetic:hover': {
          'filter': 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.3))'
        },
        
        // Preserve 3D transforms
        '.preserve-3d': {
          'transform-style': 'preserve-3d'
        },
        
        // Hide scrollbars
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none'
        },
        '.scrollbar-hide::-webkit-scrollbar': {
          'display': 'none'
        }
      }
      
      addUtilities(newUtilities)
    },
    
    // Plugin for stagger animations
    function({ addUtilities }) {
      const staggerUtilities = {}
      
      for (let i = 1; i <= 10; i++) {
        staggerUtilities[`.stagger-${i}`] = {
          'animation-delay': `${i * 0.1}s`
        }
      }
      
      addUtilities(staggerUtilities)
    }
  ]
}