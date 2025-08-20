import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    open: true,
    watch: {
      // Fix for timeout issues
      usePolling: true,
      interval: 1000,
    },
    hmr: {
      // Fix for HMR timeout issues
      timeout: 120000,
      overlay: true,
    }
  },
  build: {
    // Improve build stability
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
        }
      }
    }
  },
  optimizeDeps: {
    // Ensure dependencies are properly pre-bundled
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react', '@supabase/supabase-js'],
    exclude: []
  }
});