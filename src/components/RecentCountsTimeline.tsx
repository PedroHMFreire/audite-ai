import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Clock, Play } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export function RecentCountsTimeline() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCounts()
  }, [])

  async function loadCounts() {
    try {
      setLoading(true)
      const { data } = await supabase
        .from('counts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8)

      setRows(data || [])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-5 w-5 text-green-500" />
    if (status === 'in_progress') return <Play className="h-5 w-5 text-blue-500" />
    return <Clock className="h-5 w-5 text-zinc-400" />
  }

  const getStatusLabel = (status: string) => {
    if (status === 'completed') return 'Concluído'
    if (status === 'in_progress') return 'Em Andamento'
    return 'Pendente'
  }

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    if (status === 'in_progress') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-sm font-semibold mb-4">Histórico Recente</div>
        <div className="text-xs text-zinc-500">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Histórico Recente</h3>
        <Link to="/contagens" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
          Ver todas
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-zinc-500 py-4">Nenhuma contagem realizada ainda</div>
      ) : (
        <div className="space-y-3">
          {rows.map((count, idx) => {
            const createdDate = new Date(count.created_at)
            const updatedDate = new Date(count.updated_at)
            const now = new Date()
            
            const createdDiff = now.getTime() - createdDate.getTime()
            const createdMins = Math.floor(createdDiff / 60000)
            const createdHours = Math.floor(createdDiff / 3600000)
            const createdDays = Math.floor(createdDiff / 86400000)

            let timeText = ''
            if (createdMins < 60) timeText = `há ${createdMins}min`
            else if (createdHours < 24) timeText = `há ${createdHours}h`
            else timeText = `há ${createdDays}d`

            return (
              <Link
                key={count.id}
                to={`/contagens/${count.id}`}
                className="group flex items-start gap-4 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="flex items-center justify-center">
                    {getStatusIcon(count.status || 'pending')}
                  </div>
                  {idx < rows.length - 1 && (
                    <div className="w-0.5 h-8 bg-zinc-200 dark:bg-zinc-700 mt-2" />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white group-hover:text-primary-600 transition-colors truncate">
                        {count.nome}
                      </p>
                      {count.loja && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">📍 {count.loja}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(count.status || 'pending')}`}>
                        {getStatusLabel(count.status || 'pending')}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all"
                        style={{ width: `${Math.random() * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {timeText}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
