import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['lucide-react', 'framer-motion', 'clsx', 'tailwind-merge', 'sonner'],
          'supabase': ['@supabase/supabase-js'],
          'pdf': ['html2pdf.js'],
          'xlsx': ['xlsx']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
