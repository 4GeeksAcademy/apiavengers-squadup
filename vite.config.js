import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0', // This is crucial to allow external connections in Codespaces
    
    // This hmr block is the key to fixing the refresh loop
    hmr: {
      // Check if we're in Codespaces environment
      ...(process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ? {
        // These settings tell the Vite client in the browser how to connect to the server
        protocol: 'wss', // Use secure web sockets
        host: `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`,
        // The client port needs to be 443, the standard port for HTTPS/WSS traffic.
        // GitHub's proxy will then route it internally to port 3000.
        clientPort: 443
      } : {
        // Local development fallback
        protocol: 'ws',
        host: 'localhost'
      })
    }
  },
  
  // Define environment variables that will be available in your React app
  define: {
    // Make these available to your frontend for API calls
    __CODESPACE_NAME__: JSON.stringify(process.env.CODESPACE_NAME || null),
    __GITHUB_CODESPACES_DOMAIN__: JSON.stringify(process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || null),
    __IS_CODESPACE__: JSON.stringify(!!process.env.CODESPACE_NAME),
  },
  
  // Preview configuration for production builds in Codespaces
  preview: {
    port: 3000,
    host: '0.0.0.0'
  },
  
  // Build configuration
  build: {
    // Ensure environment info is available in production build
    define: {
      __CODESPACE_NAME__: JSON.stringify(process.env.CODESPACE_NAME || null),
      __GITHUB_CODESPACES_DOMAIN__: JSON.stringify(process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || null),
      __IS_CODESPACE__: JSON.stringify(!!process.env.CODESPACE_NAME),
    }
  }
})