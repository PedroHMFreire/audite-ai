import { useEffect, useState } from 'react'
import { getCounts, getCategories } from '../lib/db'
import { useToast } from './Toast'

interface AnomalyAlert {
  store_id: string
  count_id: string
  status: string
  timestamp: Date
}

interface AnomalyAlertsProps {
  threshold?: number
  auto_refresh?: boolean
}

const SEVERITY_COLORS = {
  LOW: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' },
  MEDIUM: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100' },
  HIGH: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' }
}

export default function AnomalyAlerts({ threshold = 2.0, auto_refresh = true }: AnomalyAlertsProps) {
  const { addToast } = useToast()
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnomalies()
    
    if (auto_refresh) {
      const interval = setInterval(loadAnomalies, 10000) // 10 segundos
      return () => clearInterval(interval)
    }
  }, [threshold, auto_refresh])

  async function loadAnomalies() {
    try {
      setError(null)
      setLoading(true)
      const countData = await getCounts()

      // Detecta anomalias: contagens com status 'pending' ou 'error'
      const detectedAnomalies: AnomalyAlert[] = []
      
      if (Array.isArray(countData) && countData.length > 0) {
        countData.forEach(count => {
          // Flags anomalias: status pendente ou error
          if (count.status === 'pending' || count.status === 'error') {
            detectedAnomalies.push({
              store_id: count.store_id || 'Unknown Store',
              count_id: count.id,
              status: count.status,
              timestamp: new Date(count.created_at || new Date())
            })
          }
        })
      }

      // Ordena por timestamp (mais recentes primeiro)
      detectedAnomalies.sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      )

      setAnomalies(detectedAnomalies)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('Erro ao detectar anomalias:', error)
      setError(msg)
      addToast({
        type: 'error',
        message: 'Erro ao detectar anomalias',
        duration: 3000
      })
    } finally {
      setLoading(false)
    }
  }

  if (error && !loading) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        ⚠️ Erro ao carregar alertas: {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-16" />
        ))}
      </div>
    )
  }

  if (anomalies.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div className="text-green-700 font-medium">✓ Nenhuma anomalia detectada</div>
        <div className="text-sm text-green-600 mt-1">Todas as contagens processadas normalmente</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Alertas de Anomalias</h3>
        <button
          onClick={loadAnomalies}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
        >
          Atualizar
        </button>
      </div>

      <div className="space-y-3">
        {anomalies.map((anomaly, idx) => {
          const severity = anomaly.status === 'error' ? 'HIGH' : 'MEDIUM'
          const colors = SEVERITY_COLORS[severity]
          
          return (
            <div
              key={idx}
              className={`${colors.bg} rounded-lg p-4 border-l-4 ${colors.border}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`${colors.badge} ${colors.text} px-2 py-1 rounded text-xs font-semibold`}>
                      {severity}
                    </span>
                    <span className={`${colors.text} font-semibold`}>{anomaly.store_id}</span>
                    <span className="text-gray-600 text-sm">— {anomaly.status}</span>
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    ID: <code className="bg-white px-2 py-1 rounded text-xs">{anomaly.count_id.substring(0, 8)}...</code>
                  </div>

                  <div className="text-xs text-gray-600 mt-2">
                    {anomaly.timestamp.toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
