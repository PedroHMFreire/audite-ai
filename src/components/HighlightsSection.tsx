import React, { useEffect, useState } from 'react'
import {
  Calendar,
  AlertTriangle,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface NextSchedule {
  id: string
  store_name: string
  scheduled_date: string
  category: string
}

interface CriticalAlert {
  id: string
  store_name: string
  type: 'excesso' | 'falta' | 'anomalia'
  message: string
  created_at: string
}

export const HighlightsSection: React.FC = () => {
  const [nextSchedules, setNextSchedules] = useState<NextSchedule[]>([])
  const [alerts, setAlerts] = useState<CriticalAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHighlights()
  }, [])

  const loadHighlights = async () => {
    try {
      setLoading(true)

      // Próximos agendamentos (próximos 3 dias)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { data: schedules } = await supabase
        .from('schedule_items')
        .select(
          `
          id,
          store_name,
          scheduled_date,
          categories:category_id (
            name
          )
        `
        )
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .lte(
          'scheduled_date',
          thirtyDaysFromNow.toISOString().split('T')[0]
        )
        .order('scheduled_date')
        .limit(3)

      if (schedules) {
        setNextSchedules(
          schedules.map(s => ({
            id: s.id,
            store_name: s.store_name,
            scheduled_date: s.scheduled_date,
            category:
              s.categories && typeof s.categories === 'object'
                ? (s.categories as any).name
                : 'Geral',
          }))
        )
      }

      // Alertas críticos (últimas 7 dias)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: results } = await supabase
        .from('results')
        .select('id, store_name, status, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .or('status.eq.excesso,status.eq.falta')
        .limit(3)

      if (results) {
        setAlerts(
          results.map(r => ({
            id: r.id,
            store_name: r.store_name,
            type: r.status as 'excesso' | 'falta' | 'anomalia',
            message: `Contagem com ${r.status}`,
            created_at: r.created_at,
          }))
        )
      }
    } catch (error) {
      console.error('Erro ao carregar highlights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'excesso':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      case 'falta':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'anomalia':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      default:
        return 'bg-zinc-50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'excesso':
        return <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      case 'falta':
        return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'anomalia':
        return <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-zinc-400" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Amanhã'
    }

    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="hidden lg:grid grid-cols-2 gap-4">
      {/* PRÓXIMAS AUDITORIAS */}
      <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-200 dark:bg-blue-700/50 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              Próximas Auditorias
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Próximos 30 dias
            </div>
          </div>
        </div>

        {nextSchedules.length > 0 ? (
          <div className="space-y-2">
            {nextSchedules.map(schedule => (
              <div
                key={schedule.id}
                className="flex items-start gap-3 p-2 bg-white dark:bg-zinc-800/50 rounded-lg"
              >
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {schedule.store_name}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    {schedule.category} • {formatDate(schedule.scheduled_date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Nenhuma auditoria agendada
          </div>
        )}
      </div>

      {/* ALERTAS CRÍTICOS */}
      <div className="card bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-200 dark:bg-red-700/50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              Alertas Críticos
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Últimos 7 dias
            </div>
          </div>
        </div>

        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-2 rounded-lg border ${getAlertColor(
                  alert.type
                )}`}
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {alert.store_name}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    {alert.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-zinc-600 dark:text-zinc-400">
            Nenhum alerta crítico
          </div>
        )}
      </div>
    </div>
  )
}
