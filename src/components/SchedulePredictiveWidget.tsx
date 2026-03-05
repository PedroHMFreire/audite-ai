import { useEffect, useState } from 'react'
import { getCounts, type Result } from '../lib/db'
import { useToast } from './Toast'
import { generateScheduleMetricsFromCounts, type ScheduleMetrics } from '../lib/scheduleAnalytics'

const WEEKDAY_MAP = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sab',
  7: 'Dom'
} as const

interface SchedulePredictiveWidgetProps {
  auto_refresh?: boolean
}

export default function SchedulePredictiveWidget({ auto_refresh = true }: SchedulePredictiveWidgetProps) {
  const { addToast } = useToast()
  const [metrics, setMetrics] = useState<ScheduleMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMetrics()
    
    if (auto_refresh) {
      const interval = setInterval(loadMetrics, 30000) // 30 segundos
      return () => clearInterval(interval)
    }
  }, [auto_refresh])

  async function loadMetrics() {
    try {
      setError(null)
      setLoading(true)
      const countData = await getCounts()
      
      if (Array.isArray(countData) && countData.length > 0) {
        const _metrics = generateScheduleMetricsFromCounts(countData as any)
        setMetrics(_metrics)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('Erro ao carregar métricas:', error)
      setError(msg)
      addToast({
        type: 'error',
        message: 'Erro ao gerar insights',
        duration: 3000
      })
    } finally {
      setLoading(false)
    }
  }

  if (error && !loading) {
    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        ⚠️ Erro ao carregar insights: {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-24" />
        ))}
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Insights do Cronograma</h2>
        <button
          onClick={loadMetrics}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
        >
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Lojas com Risco */}
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="text-sm text-gray-600">Lojas com Risco</div>
          <div className="text-2xl font-bold text-orange-600">{metrics.lorasComRisco}</div>
          <div className="text-xs text-gray-500 mt-1">de {metrics.totalLojas} lojas</div>
        </div>

        {/* Card 2: Melhor Dia da Semana */}
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600">Melhor Dia</div>
          <div className="text-2xl font-bold text-blue-600">
            {WEEKDAY_MAP[metrics.diaOptimo as unknown as keyof typeof WEEKDAY_MAP] || '-'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Menor taxa de erro</div>
        </div>

        {/* Card 3: Média de Erros */}
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="text-sm text-gray-600">Média Global</div>
          <div className="text-2xl font-bold text-yellow-600">
            {metrics.mediaErrosGlobal.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Divergência média</div>
        </div>

        {/* Card 4: Recomendações */}
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600">Alertas Ativos</div>
          <div className="text-2xl font-bold text-green-600">
            {metrics.recomendacoes?.length || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Ações sugeridas</div>
        </div>
      </div>

      {/* Lojas com melhor e pior desempenho */}
      {metrics.logosMelhorDesempenho.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="text-xs font-semibold text-green-700 mb-2">Melhor Desempenho</div>
            <div className="space-y-1">
              {metrics.logosMelhorDesempenho.map((loja: string) => (
                <div key={loja} className="text-sm text-green-700">✓ {loja}</div>
              ))}
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="text-xs font-semibold text-red-700 mb-2">Requer Atenção</div>
            <div className="space-y-1">
              {metrics.logosMaiorRisco.map((loja: string) => (
                <div key={loja} className="text-sm text-red-700">⚠ {loja}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
