/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/front/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Outfit"', 'system-ui', 'sans-serif'],
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
      },
      colors: {
        dark: {
          900: '#121212',
          800: '#181818',
          700: '#282828',
        },
        brand: {
          DEFAULT: '#FF7F50',
          hover: '#E66B45',
        },
        'neutral-text': {
          DEFAULT: '#EAEAEA',
          muted: '#A0A0A0',
        },
      },
    },
  },
  plugins: [],
}