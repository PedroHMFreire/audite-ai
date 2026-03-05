import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { validateCountCalculations, formatValidationReport, CountValidationReport } from '@/lib/countValidation'

type Props = {
  count_id: string
  auto_validate?: boolean
}

export default function CountValidationChecker({ count_id, auto_validate = true }: Props) {
  const [report, setReport] = useState<CountValidationReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  useEffect(() => {
    if (!auto_validate) return

    const checkValidation = async () => {
      setLoading(true)
      try {
        const result = await validateCountCalculations(count_id)
        setReport(result)
        setLastChecked(new Date())
      } finally {
        setLoading(false)
      }
    }

    // Primeiro check imediato
    checkValidation()

    // Re-validar a cada 5 segundos se houver mudanças
    const interval = setInterval(checkValidation, 5000)
    return () => clearInterval(interval)
  }, [count_id, auto_validate])

  if (!report) return null

  const isValid = report.is_valid
  const hasErrors = report.errors.length > 0

  return (
    <div className={`card mt-4 ${!isValid ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20' : 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          )}
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              {isValid ? '✓ Contagem Válida' : '⚠️ Revisar Contagem'}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Verificado há {Math.round((Date.now() - (lastChecked?.getTime() || 0)) / 1000)}s
            </p>
          </div>
        </div>
        {loading && (
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        )}
      </div>

      {/* Resumo Rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
        <div className="p-2 rounded bg-white dark:bg-zinc-800">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Itens do Plano</div>
          <div className="font-bold text-lg text-zinc-900 dark:text-white">{report.summary.total_plan_items}</div>
        </div>
        <div className="p-2 rounded bg-white dark:bg-zinc-800">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Processados</div>
          <div className="font-bold text-lg text-blue-600 dark:text-blue-400">{report.summary.items_processed}</div>
        </div>
        <div className="p-2 rounded bg-white dark:bg-zinc-800">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Ignorados</div>
          <div className="font-bold text-lg text-orange-600 dark:text-orange-400">{report.summary.items_ignored}</div>
        </div>
        <div className="p-2 rounded bg-white dark:bg-zinc-800">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Entradas</div>
          <div className="font-bold text-lg text-zinc-900 dark:text-white">{report.summary.total_manual_entries}</div>
        </div>
      </div>

      {/* Cálculos Detalhados */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-800">
          <span className="text-zinc-700 dark:text-zinc-300">✓ Regular</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {report.calculations.regular_items} itens × {report.calculations.regular_units} unidades
          </span>
        </div>
        {report.calculations.falta_items > 0 && (
          <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300">⚠️ Falta</span>
            <span className="font-semibold text-yellow-600 dark:text-yellow-400">
              {report.calculations.falta_items} itens × {report.calculations.falta_units} unidades
            </span>
          </div>
        )}
        {report.calculations.excesso_items > 0 && (
          <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300">🔴 Excesso</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {report.calculations.excesso_items} itens × {report.calculations.excesso_units} unidades
            </span>
          </div>
        )}
        {report.calculations.unknown_codes > 0 && (
          <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300">❓ Desconhecidos</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {report.calculations.unknown_codes} códigos
            </span>
          </div>
        )}
      </div>

      {/* Validações */}
      {Object.entries(report.validation_checks).length > 0 && (
        <div className="space-y-1 mb-4 text-xs">
          {Object.entries(report.validation_checks).map(([check, passed]) => (
            <div key={check} className={`flex items-center gap-2 ${passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${passed ? 'bg-green-600' : 'bg-red-600'}`} />
              <span className="capitalize">{check.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Erros */}
      {hasErrors && (
        <div className="p-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
          <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              {report.errors.map((error, idx) => (
                <div key={idx}>{error}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
