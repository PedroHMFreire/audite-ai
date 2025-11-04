import { CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react'

type Props = {
  totals: { regular: number; excesso: number; falta: number }
}

export default function DashboardCards({ totals }: Props) {
  return (
    <div className="dashboard-cards grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center">
          <CheckCircle className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
          <div className="ml-4">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Produtos Regulares
            </p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totals.regular.toLocaleString()}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center">
          <TrendingUp className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
          <div className="ml-4">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Excesso
            </p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totals.excesso.toLocaleString()}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center">
          <AlertTriangle className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
          <div className="ml-4">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Em Falta
            </p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totals.falta.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
