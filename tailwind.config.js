/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ============================================================================
      // ENHANCED COLOR SYSTEM
      // ============================================================================
      colors: {
        // Primary brand colors with enhanced palettes
        coral: {
          50: '#fff5f3',
          100: '#ffe8e6',
          200: '#ffd5d1',
          300: '#ffb5af',
          400: '#ff897f',
          500: '#ff7f50',  // Main coral color
          600: '#e66b45',
          700: '#cc5a3a',
          800: '#b34a30',
          900: '#9a3b26',
          950: '#561c10'
        },
        
        marine: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',  // Main marine color
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49'
        },
        
        lavender: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',  // Main lavender color
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764'
        },
        
        // Gaming neon colors
        neon: {
          cyan: '#00ffff',
          purple: '#bf00ff',
          green: '#39ff14',
          pink: '#ff1493',
          blue: '#0080ff',
          yellow: '#ffff00',
          orange: '#ff8000'
        },
        
        // Enhanced Discord-inspired dark palette
        discord: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',  // Main dark background
          900: '#0f172a',
          950: '#020617'
        },
        
        // Gaming-specific electric colors
        electric: {
          blue: '#0080ff',
          purple: '#8000ff',
          cyan: '#00ffff',
          lime: '#80ff00'
        },
        
        // Enhanced status colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Success green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d'
        },
        
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',  // Warning yellow
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f'
        },
        
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',  // Error red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d'
        }
      },
      
      // ============================================================================
      // TYPOGRAPHY SYSTEM
      // ============================================================================
      fontFamily: {
        'gaming': ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        'display': ['Space Grotesk', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      
      // ============================================================================
      // SPACING & LAYOUT
      // ============================================================================
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem'
      },
      
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem'
      },
      
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      },
      
      // ============================================================================
      // ADVANCED SHADOW SYSTEM
      // ============================================================================
      boxShadow: {
        // Gaming glow effects
        'glow-sm': '0 0 10px rgba(0, 255, 255, 0.3)',
        'glow': '0 0 20px rgba(0, 255, 255, 0.4)',
        'glow-lg': '0 0 30px rgba(0, 255, 255, 0.5)',
        'glow-xl': '0 0 40px rgba(0, 255, 255, 0.6)',
        
        // Brand color glows
        'glow-coral': '0 0 20px rgba(255, 127, 80, 0.5)',
        'glow-marine': '0 0 20px rgba(56, 189, 248, 0.5)',
        'glow-lavender': '0 0 20px rgba(176, 112, 255, 0.5)',
        'glow-neon': '0 0 30px rgba(57, 255, 20, 0.6)',
        
        // Neon color glows
        'neon-purple': '0 0 20px rgba(191, 0, 255, 0.4)',
        'neon-green': '0 0 20px rgba(57, 255, 20, 0.4)',
        
        // Depth shadows
        'depth-1': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'depth-2': '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
        'depth-3': '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
        'depth-4': '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)',
        'depth-5': '0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)',
        
        // Glass effects
        'glass': '0 8px 32px rgba(0, 0, 0, 0.37)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.6)',
        'inner-glow': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.1)',
        'gaming': '0 8px 32px rgba(0, 0, 0, 0.37)'
      },
      
      // ============================================================================
      // BLUR EFFECTS
      // ============================================================================
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
        '4xl': '72px',
        '5xl': '96px'
      },
      
      // ============================================================================
      // ANIMATION SYSTEM
      // ============================================================================
      transitionTimingFunction: {
        'elastic': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'gaming': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1200': '1200ms',
        '1500': '1500ms',
        '2000': '2000ms'
      },
      
      scale: {
        '102': '1.02',
        '103': '1.03',
        '98': '0.98',
        '97': '0.97'
      },
      
      // ============================================================================
      // GRADIENT BACKGROUNDS
      // ============================================================================
      backgroundImage: {
        // Basic gradients
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        
        // Brand gradients
        'gradient-gaming': 'linear-gradient(135deg, #ff7f50 0%, #38bdf8 50%, #b070ff 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        'gradient-coral': 'linear-gradient(135deg, #ff897f 0%, #ff7f50 100%)',
        'gradient-marine': 'linear-gradient(135deg, #7dd3fc 0%, #38bdf8 100%)',
        'gradient-lavender': 'linear-gradient(135deg, #dcc4ff 0%, #b070ff 100%)',
        
        // Gaming effects
        'gaming-mesh': `
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)
        `,
        'energy-flow': 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.4), transparent)',
        'neon-glow': 'linear-gradient(45deg, #00ffff, #bf00ff, #39ff14)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))'
      },
      
      // ============================================================================
      // ADVANCED KEYFRAMES
      // ============================================================================
      keyframes: {
        // Enhanced float animation
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
        
        // Glow effects
        'glow': {
          '0%': { boxShadow: '0 0 5px #ff7f50, 0 0 10px #ff7f50, 0 0 15px #ff7f50' },
          '100%': { boxShadow: '0 0 20px #ff7f50, 0 0 30px #ff7f50, 0 0 40px #ff7f50' }
        },
        'glow-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)'
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.8)'
          }
        },
        
        // Shimmer effects
        'shimmer': {
          '0%': { 
            backgroundPosition: '-200% 0'
          },
          '100%': { 
            backgroundPosition: '200% 0'
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
        
        // Color shifting
        'mesh-shift': {
          '0%, 100%': { 
            filter: 'hue-rotate(0deg) brightness(1)'
          },
          '50%': { 
            filter: 'hue-rotate(90deg) brightness(1.1)'
          }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        
        // Entry animations
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
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
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' }
        }
      },
      
      // ============================================================================
      // ANIMATION DEFINITIONS
      // ============================================================================
      animation: {
        // Float and glow
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        
        // Shimmer effects
        'shimmer': 'shimmer 2s linear infinite',
        'energy-flow': 'energy-flow 3s ease-in-out infinite',
        
        // Color effects
        'mesh-shift': 'mesh-shift 8s ease-in-out infinite',
        'gradient-x': 'gradient-x 15s ease infinite',
        
        // Enhanced built-in animations
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        
        // Entry animations
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'bounce-in': 'bounce-in 0.6s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.5s ease-out',
        'scale-in': 'scale-in 0.4s ease-out',
        'rotate-in': 'rotate-in 0.6s ease-out',
        'wiggle': 'wiggle 1s ease-in-out infinite'
      }
    }
  },
  
  // ============================================================================
  // ENHANCED PLUGINS
  // ============================================================================
  plugins: [
    // Main utilities plugin
    function({ addUtilities, addComponents, theme }) {
      // ========================================================================
      // GLASSMORPHISM UTILITIES
      // ========================================================================
      addUtilities({
        '.glass': {
          'backdrop-filter': 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
          'background': 'rgba(255, 255, 255, 0.08)',
          'border': '1px solid rgba(255, 255, 255, 0.15)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.37)'
        },
        '.glass-dark': {
          'backdrop-filter': 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          'background': 'rgba(0, 0, 0, 0.3)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.6)'
        },
        '.glass-gaming': {
          'backdrop-filter': 'blur(24px)',
          '-webkit-backdrop-filter': 'blur(24px)',
          'background': 'linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(191, 0, 255, 0.1) 100%)',
          'border': '1px solid rgba(0, 255, 255, 0.2)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 255, 255, 0.1) inset'
        },
        '.glass-coral': {
          'background': 'rgba(255, 127, 80, 0.1)',
          'backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(255, 127, 80, 0.2)',
        },
        '.glass-marine': {
          'background': 'rgba(56, 189, 248, 0.1)',
          'backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(56, 189, 248, 0.2)',
        }
      })
      
      // ========================================================================
      // TEXT EFFECTS
      // ========================================================================
      addUtilities({
        '.text-shadow': {
          'text-shadow': '0 2px 4px rgba(0, 0, 0, 0.5)'
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
        }
      })
      
      // ========================================================================
      // UTILITY CLASSES
      // ========================================================================
      addUtilities({
        '.magnetic': {
          'transition': 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        },
        '.preserve-3d': {
          'transform-style': 'preserve-3d'
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none'
        },
        '.scrollbar-hide::-webkit-scrollbar': {
          'display': 'none'
        }
      })
      
      // ========================================================================
      // BUTTON COMPONENTS
      // ========================================================================
      addComponents({
        '.btn-coral': {
          'position': 'relative',
          'background': 'linear-gradient(135deg, #ff7f50, #e66b45)',
          'color': 'white',
          'font-weight': '600',
          'padding': '12px 32px',
          'border-radius': '12px',
          'border': 'none',
          'box-shadow': '0 4px 14px rgba(255, 127, 80, 0.3)',
          'transition': 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          'cursor': 'pointer',
          'transform': 'translateY(0)',
          'overflow': 'hidden',
          '&:hover': {
            'background': 'linear-gradient(135deg, #e66b45, #cc5a3a)',
            'transform': 'translateY(-2px) scale(1.02)',
            'box-shadow': '0 8px 25px rgba(255, 127, 80, 0.4)'
          }
        },
        '.btn-marine': {
          'background': 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          'color': 'white',
          'font-weight': '600',
          'padding': '12px 32px',
          'border-radius': '12px',
          'border': 'none',
          'box-shadow': '0 4px 14px rgba(14, 165, 233, 0.3)',
          'transition': 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          'cursor': 'pointer',
          '&:hover': {
            'background': 'linear-gradient(135deg, #0284c7, #0369a1)',
            'transform': 'translateY(-2px)',
            'box-shadow': '0 8px 25px rgba(14, 165, 233, 0.4)'
          }
        },
        '.btn-ghost': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'border': '1px solid rgba(255, 255, 255, 0.3)',
          'color': 'white',
          'padding': '12px 32px',
          'border-radius': '12px',
          'font-weight': '600',
          'transition': 'all 0.3s ease',
          'cursor': 'pointer',
          '&:hover': {
            'background': 'rgba(255, 255, 255, 0.2)',
            'transform': 'translateY(-2px)'
          }
        },
        '.btn-neon': {
          'background': 'transparent',
          'border': '2px solid #00ffff',
          'color': '#00ffff',
          'padding': '12px 32px',
          'border-radius': '8px',
          'font-weight': '600',
          'text-transform': 'uppercase',
          'letter-spacing': '1px',
          'position': 'relative',
          'overflow': 'hidden',
          'transition': 'all 0.3s ease',
          'cursor': 'pointer',
          'box-shadow': '0 0 20px rgba(0, 255, 255, 0.3)',
          '&:hover': {
            'color': '#000',
            'background': '#00ffff',
            'box-shadow': '0 0 30px rgba(0, 255, 255, 0.6)'
          }
        },
        '.btn-gaming': {
          'padding': '0.75rem 1.5rem',
          'background': 'linear-gradient(135deg, #ff7f50 0%, #38bdf8 100%)',
          'color': 'white',
          'font-weight': '600',
          'border-radius': '0.75rem',
          'transition': 'all 0.3s ease',
          'transform': 'translateY(0)',
          'box-shadow': '0 4px 15px rgba(255, 127, 80, 0.3)',
          '&:hover': {
            'transform': 'translateY(-2px)',
            'box-shadow': '0 8px 25px rgba(255, 127, 80, 0.4)',
          }
        }
      })
      
      // ========================================================================
      // LAYOUT COMPONENTS
      // ========================================================================
      addComponents({
        '.page-container': {
          'min-height': '100vh',
          'background': 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 25%, #7c3aed 75%, #be185d 100%)',
          'position': 'relative',
          'overflow': 'hidden',
          'display': 'flex',
          'flex-direction': 'column'
        },
        '.content-wrapper': {
          'position': 'relative',
          'z-index': '10',
          'flex': '1',
          'display': 'flex',
          'flex-direction': 'column',
          'max-width': '1200px',
          'margin': '0 auto',
          'padding': '96px 24px 48px',
          'width': '100%'
        },
        '.navbar-glass': {
          'backdrop-filter': 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
          'background': 'rgba(255, 255, 255, 0.08)',
          'border': '1px solid rgba(255, 255, 255, 0.15)',
          'border-radius': '20px',
          'padding': '16px 24px',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.37)',
          'max-width': '1200px',
          'margin': '0 auto'
        },
        '.card-gaming': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
          'border-radius': '1.5rem',
          'padding': '2rem',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.3)',
          'transition': 'all 0.3s ease',
          '&:hover': {
            'background': 'rgba(255, 255, 255, 0.15)',
            'transform': 'translateY(-4px)',
            'box-shadow': '0 12px 40px rgba(0, 0, 0, 0.4)',
          }
        }
      })
      
      // ========================================================================
      // DROPDOWN COMPONENTS
      // ========================================================================
      addComponents({
        '.nav-dropdown': {
          'position': 'absolute',
          'top': '100%',
          'right': '0',
          'margin-top': '8px',
          'width': '240px',
          'backdrop-filter': 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          'background': 'rgba(0, 0, 0, 0.8)',
          'border': '1px solid rgba(255, 255, 255, 0.15)',
          'border-radius': '16px',
          'padding': '12px',
          'box-shadow': '0 12px 40px rgba(0, 0, 0, 0.6)',
          'transform': 'scale(0.95) translateY(-10px)',
          'opacity': '0',
          'pointer-events': 'none',
          'transition': 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          'z-index': '100',
          '&.active': {
            'transform': 'scale(1) translateY(0)',
            'opacity': '1',
            'pointer-events': 'auto'
          }
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
          'transition': 'all 0.2s ease',
          'cursor': 'pointer',
          'margin-bottom': '4px',
          '&:hover': {
            'background': 'rgba(255, 255, 255, 0.1)',
            'color': 'white'
          }
        }
      })
    },
    
    // ========================================================================
    // STAGGER ANIMATION PLUGIN
    // ========================================================================
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