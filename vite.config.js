// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT) || 3000,
    open: false,
    hmr: {
      port: parseInt(process.env.PORT) || 3000,
      host: 'localhost'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'framer-motion']
        }
      }
    }
  },
  preview: {
    port: parseInt(process.env.PORT) || 3000,
    host: '0.0.0.0'
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
}))
