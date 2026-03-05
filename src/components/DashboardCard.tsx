import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { SimpleSparkline } from './SimpleSparkline'

interface DashboardCardProps {
  title: string
  value: number | string
  trend?: string
  trendDirection?: 'up' | 'down' | 'stable'
  color: 'green' | 'orange' | 'red' | 'blue'
  icon: ReactNode
  sparkline?: number[]
}

export function DashboardCard({
  title,
  value,
  trend,
  trendDirection = 'stable',
  color,
  icon,
  sparkline
}: DashboardCardProps) {
  const colorMap = {
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-900/50',
      text: 'text-green-700 dark:text-green-300',
      icon: 'text-green-500'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-900/50',
      text: 'text-orange-700 dark:text-orange-300',
      icon: 'text-orange-500'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-900/50',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-500'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-900/50',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-500'
    }
  }

  const scheme = colorMap[color]

  const isTrendPositive = 
    (color === 'green' && trendDirection === 'up') ||
    (color === 'red' && trendDirection === 'down')

  return (
    <div className={`${scheme.bg} ${scheme.border} p-6 rounded-2xl border`}>
      {/* Header com Título e Ícone */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {title}
        </h3>
        <div className={`${scheme.icon} h-8 w-8`}>
          {icon}
        </div>
      </div>

      {/* Valor Grande */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>

        {/* Trend Badge */}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
            isTrendPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {trendDirection === 'up' ? (
              <TrendingUp className="h-4 w-4" />
            ) : trendDirection === 'down' ? (
              <TrendingDown className="h-4 w-4" />
            ) : null}
            {trend}
          </div>
        )}
      </div>

      {/* Mini Sparkline */}
      {sparkline && (
        <div className="h-10 -mx-6 px-6">
          <SimpleSparkline data={sparkline} color={color} />
        </div>
      )}
    </div>
  )
}
