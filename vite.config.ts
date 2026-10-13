import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { copyFileSync } from 'fs'

/**
 * Hospedagens estáticas sem regra de reescrita (como o Render) respondem 404
 * para rotas internas do app (/assinatura, /redefinir-senha...). Elas servem
 * o arquivo /404.html nesses casos; sendo uma cópia do index.html, o app abre
 * na rota certa mesmo assim.
 */
function spaFallback() {
  let outDir = 'dist'
  return {
    name: 'audite-spa-fallback',
    apply: 'build' as const,
    configResolved(config: { build: { outDir: string }; root: string }) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      copyFileSync(path.join(outDir, 'index.html'), path.join(outDir, '404.html'))
    },
  }
}

export default defineConfig({
  plugins: [react(), spaFallback()],
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
          // PDF separado (só carrega ao exportar o relatório)
          pdf: ['jspdf'],
        },
      },
    },
  },
})
