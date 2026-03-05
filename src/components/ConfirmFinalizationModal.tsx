import { AlertCircle } from 'lucide-react'

interface Props {
  isOpen: boolean
  planCodes: number
  planItems: number
  insertedCodes: number
  insertedItems: number
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmFinalizationModal({
  isOpen,
  planCodes,
  planItems,
  insertedCodes,
  insertedItems,
  loading,
  onConfirm,
  onCancel
}: Props) {
  if (!isOpen) return null

  const coveragePercent = planCodes > 0 ? Math.round((insertedCodes / planCodes) * 100) : 0
  const itemsCoveragePercent = planItems > 0 ? Math.round((insertedItems / planItems) * 100) : 0
  const missingCodes = Math.max(0, planCodes - insertedCodes)
  const missingItems = Math.max(0, planItems - insertedItems)
  const isComplete = coveragePercent === 100 && itemsCoveragePercent === 100

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full shadow-xl">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${isComplete ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <AlertCircle className={`h-6 w-6 ${isComplete ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Finalizar Contagem?
              </h2>
              {!isComplete && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Esta ação não poderá ser desfeita
                </p>
              )}
            </div>
          </div>

          {/* Status da Contagem */}
          <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
            <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
              Status da Contagem
            </h3>

            {/* Códigos */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Códigos Contados</span>
                <span className="font-semibold">
                  {insertedCodes} de {planCodes}
                </span>
              </div>
              <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${coveragePercent === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: `${Math.min(100, coveragePercent)}%` }}
                />
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {coveragePercent}% completo
                {missingCodes > 0 && ` • Faltam ${missingCodes}`}
              </div>
            </div>

            {/* Itens */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Itens Contados</span>
                <span className="font-semibold">
                  {insertedItems} de {planItems}
                </span>
              </div>
              <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${itemsCoveragePercent === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: `${Math.min(100, itemsCoveragePercent)}%` }}
                />
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {itemsCoveragePercent}% completo
                {missingItems > 0 && ` • Faltam ${missingItems}`}
              </div>
            </div>
          </div>

          {/* Avisos */}
          {!isComplete && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Contagem incompleta. Tem certeza que deseja finalizar?
              </p>
            </div>
          )}

          {isComplete && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ Contagem completa! Pronto para finalizar.
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 font-semibold"
            >
              {loading ? 'Processando…' : 'Confirmar Finalização'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
