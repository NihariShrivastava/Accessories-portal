import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor';
            if (id.includes('xlsx')) return 'xlsx';
            if (id.includes('html2pdf')) return 'pdf';
            if (id.includes('lucide') || id.includes('framer-motion') || id.includes('tailwind')) return 'ui';
            if (id.includes('@supabase')) return 'supabase';
            return 'deps';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
