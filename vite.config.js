import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss() // Tailwind v4 Vite plugin
  ],
  server: {
    port: 3000,
    host: true, // Good for Codespaces
  },
  build: {
    outDir: 'dist'
  }
})
