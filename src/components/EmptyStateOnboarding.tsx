import { CheckCircle, ArrowRight } from 'lucide-react'

type Props = {
  countCount: number
  onStartCount: () => void
  onViewTutorial: () => void
}

export default function EmptyStateOnboarding({
  countCount,
  onStartCount,
  onViewTutorial
}: Props) {
  if (countCount > 0) return null

  return (
    <div className="card bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-100 dark:from-primary-900/30 dark:via-secondary-900/30 dark:to-primary-900/20 border border-primary-200 dark:border-primary-800 py-12">
      <div className="text-center space-y-6">
        {/* Ilustração emoji */}
        <div className="text-6xl">📦</div>

        {/* Títle */}
        <div>
          <h2 className="text-2xl font-bold font-display text-zinc-900 dark:text-white mb-2">
            Comece Sua Primeira Contagem
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            O Audite-AI ajuda você a gerenciar inventários com precisão
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            { num: 1, title: 'Criar contagem', desc: 'Defina nome e loja' },
            { num: 2, title: 'Registrar itens', desc: 'Insira quantities de cada categoria' },
            { num: 3, title: 'Analisar', desc: 'Veja insights e relatórios' }
          ].map(step => (
            <div key={step.num} className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary-600 text-white font-bold text-sm w-8 h-8 flex items-center justify-center flex-shrink-0">
                  {step.num}
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-white text-sm">{step.title}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            '✓ Contagens em tempo real',
            '✓ Relatórios detalhados',
            '✓ Análise de desempenho',
            '✓ Histórico completo'
          ].map((feat, idx) => (
            <div key={idx} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {feat}
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button
            onClick={onStartCount}
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            Iniciar Primeira Contagem
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={onViewTutorial}
            className="btn bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Ver Tutorial
          </button>
        </div>

        {/* Help text */}
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Não tem certeza? Veja o{' '}
          <button onClick={onViewTutorial} className="text-primary-600 dark:text-primary-400 hover:underline font-semibold">
            guia passo a passo
          </button>
        </p>
      </div>
    </div>
  )
}
