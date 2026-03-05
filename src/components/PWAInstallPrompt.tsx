import { Download, X, Share2 } from 'lucide-react'
import { usePWAPrompt } from '@/hooks/usePWAPrompt'

export default function PWAInstallPrompt() {
  const { showPrompt, isIOS, canInstall, handleInstall, handleDismiss } = usePWAPrompt()

  if (!showPrompt) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-x-4 bottom-4 sm:bottom-8 sm:right-8 sm:left-auto sm:w-96 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-r from-purple-600 to-cyan-500 p-6 text-white">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pr-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold">Instale Audite.AI</h2>
              </div>
              <p className="text-sm text-white/90">
                Acesse sua app diretamente da tela inicial
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Benefits */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-green-700 dark:text-green-400">✓</span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-zinc-900 dark:text-white">Acesso rápido</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Ícone na tela inicial para abrir em segundos</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">✓</span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-zinc-900 dark:text-white">Funciona offline</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Continue contando mesmo sem conexão</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400">✓</span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-zinc-900 dark:text-white">Mais rápido</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Carregamento em menos de 100ms</p>
                </div>
              </div>
            </div>

            {/* iOS Instructions */}
            {isIOS && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4" />
                  Para iPhone/iPad:
                </p>
                <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Toque no botão Compartilhar (⬆️) no Safari</li>
                  <li>Selecione "Adicionar à tela inicial"</li>
                  <li>Nomeie como "Audite.AI" e confirme</li>
                </ol>
              </div>
            )}

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDismiss}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Talvez depois
              </button>
              {!isIOS && (
                <button
                  onClick={handleInstall}
                  disabled={!canInstall}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Instalar
                </button>
              )}
            </div>

            {/* Footer note */}
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 pt-2">
              Você pode desinstalar a qualquer momento
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
