/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Point Tailwind's font families to our CSS variables for consistency
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      // Point Tailwind's color system to our CSS variables
      colors: {
        dark: {
          900: 'var(--color-dark-900)',
          800: 'var(--color-dark-800)',
          700: 'var(--color-dark-700)',
          600: 'var(--color-dark-600)',
        },
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
        },
        'neutral-text': {
          DEFAULT: 'var(--color-neutral-text)',
          muted: 'var(--color-neutral-text-muted)',
        },
      },
    },
  },
  plugins: [],
}