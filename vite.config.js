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
    strictPort: true,
    allowedHosts: [
      '7749bdd2-06ed-4f87-9f73-8161673c0072-00-28l0rbh6jd7tj.sisko.replit.dev',
      'fantastic-space-carnival-vwwq5ggqgww3xr99-3000.app.github.dev',
      // GitHub Codespaces 動態 URL 支援
      /.*\.app\.github\.dev$/,
      /.*\.preview\.app\.github\.dev$/,
      /.*-3000\.app\.github\.dev$/,
      'localhost',
      '127.0.0.1',
      '0.0.0.0'
    ],
    hmr: {
      port: parseInt(process.env.PORT) || 3000,
      host: '0.0.0.0'
    },
    watch: {
      usePolling: true,
      interval: 1000
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
