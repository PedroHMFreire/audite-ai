import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    chunkSizeWarningLimit: 1600, // só ajusta o alerta (opcional)
    rollupOptions: {
      output: {
        manualChunks: {
          // React e router separados
          react: ['react', 'react-dom', 'react-router-dom'],
          // Supabase separado (carrega quando necessário)
          supabase: ['@supabase/supabase-js'],
          // PDF e captura de tela separados (só carregam quando você for usar relatório/PDF)
          pdf: ['jspdf', 'html2canvas', 'dompurify'],
        },
      },
    },
  },
})
