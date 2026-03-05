import { CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  planCodes: number
  insertedCodes: number
  planItems: number
  insertedItems: number
  showLabel?: boolean
  compact?: boolean
}

export default function CoverageProgressBar({
  planCodes,
  insertedCodes,
  planItems,
  insertedItems,
  showLabel = true,
  compact = false
}: Props) {
  const codesCoverage = planCodes > 0 ? Math.round((insertedCodes / planCodes) * 100) : 0
  const itemsCoverage = planItems > 0 ? Math.round((insertedItems / planItems) * 100) : 0
  
  const isCodesComplete = codesCoverage === 100
  const isItemsComplete = itemsCoverage === 100
  const isFullyComplete = isCodesComplete && isItemsComplete

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Códigos */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Códigos
              </span>
              {isCodesComplete && (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              )}
            </div>
            <span className="text-xs font-semibold text-zinc-900 dark:text-white">
              {insertedCodes}/{planCodes}
            </span>
          </div>
          <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all ${
                isCodesComplete ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, codesCoverage)}%` }}
            />
          </div>
        </div>

        {/* Itens */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Itens
              </span>
              {isItemsComplete && (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              )}
            </div>
            <span className="text-xs font-semibold text-zinc-900 dark:text-white">
              {insertedItems}/{planItems}
            </span>
          </div>
          <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all ${
                isItemsComplete ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, itemsCoverage)}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            Cobertura da Contagem
            {isFullyComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            )}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {isFullyComplete
              ? '✓ Contagem completa!'
              : `${Math.min(codesCoverage, itemsCoverage)}% do processo concluído`}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Códigos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Códigos Contados
            </span>
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
              {insertedCodes} de {planCodes}
            </span>
          </div>
          <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                isCodesComplete ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, codesCoverage)}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {codesCoverage}% concluído
            </span>
            {!isCodesComplete && (
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                Faltam {planCodes - insertedCodes}
              </span>
            )}
          </div>
        </div>

        {/* Itens */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Itens Contados
            </span>
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
              {insertedItems} de {planItems}
            </span>
          </div>
          <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                isItemsComplete ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, itemsCoverage)}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {itemsCoverage}% concluído
            </span>
            {!isItemsComplete && (
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                Faltam {planItems - insertedItems}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {Math.round((codesCoverage + itemsCoverage) / 2)}%
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Progresso Geral</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {isFullyComplete ? '✓' : '○'}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {isFullyComplete ? 'Completo' : 'Em Progresso'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
