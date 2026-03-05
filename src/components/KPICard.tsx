import { ChevronRight } from 'lucide-react'

type Props = {
  title: string
  value: number
  target?: number
  trend?: string
  trendDirection?: 'up' | 'down' | 'stable'
  color: 'green' | 'orange' | 'red' | 'blue'
  icon: React.ReactNode
  onClick?: () => void
  sparkline?: number[]
}

const colorClasses = {
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
    icon: 'bg-green-100 dark:bg-green-900/40',
    bar: 'bg-gradient-to-r from-green-300 to-green-500'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-300',
    icon: 'bg-orange-100 dark:bg-orange-900/40',
    bar: 'bg-gradient-to-r from-orange-300 to-orange-500'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    icon: 'bg-red-100 dark:bg-red-900/40',
    bar: 'bg-gradient-to-r from-red-300 to-red-500'
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'bg-blue-100 dark:bg-blue-900/40',
    bar: 'bg-gradient-to-r from-blue-300 to-blue-500'
  }
}

export default function KPICard({
  title,
  value,
  target,
  trend,
  trendDirection,
  color,
  icon,
  onClick,
  sparkline
}: Props) {
  const css = colorClasses[color]
  const progressPercent = target ? Math.min((value / target) * 100, 100) : 0

  const trendIcon =
    trendDirection === 'up' ? '↑' :
    trendDirection === 'down' ? '↓' : '→'

  return (
    <div
      onClick={onClick}
      className={`card ${css.bg} border ${css.border} cursor-pointer transition-all hover:shadow-lg hover:scale-105 group`}
    >
      {/* Header com icon e título */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            {title}
          </p>
        </div>
        <div className={`p-2 rounded-lg ${css.icon} flex-shrink-0`}>
          {icon}
        </div>
      </div>

      {/* Valor principal */}
      <div className="mb-3">
        <div className="text-3xl font-bold text-zinc-900 dark:text-white">
          {value.toLocaleString('pt-BR')}
        </div>
        {target && (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Meta: {target.toLocaleString('pt-BR')} ({Math.round(progressPercent)}%)
          </div>
        )}
      </div>

      {/* Barra de progresso */}
      {target && (
        <div className="mb-3 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${css.bar} transition-all duration-500`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Trend */}
      {trend && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {trend}
          </span>
          <span className={`text-sm font-semibold ${css.text}`}>
            {trendIcon}
          </span>
        </div>
      )}

      {/* Sparkline visual */}
      {sparkline && sparkline.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-end gap-1 h-10">
            {sparkline.map((val, idx) => {
              const min = Math.min(...sparkline)
              const max = Math.max(...sparkline)
              const range = max - min || 1
              const height = ((val - min) / range) * 100
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-t ${css.bar} opacity-60 hover:opacity-100 transition-opacity`}
                  style={{ height: `${Math.max(height, 20)}%` }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Hover indicator */}
      {onClick && (
        <div className="mt-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Clique para expandir</div>
          <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  )
}
