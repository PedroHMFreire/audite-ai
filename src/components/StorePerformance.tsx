import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

type StoreData = {
  loja: string
  totalCounts: number
  avgRegular: number
  avgExcesso: number
  avgFalta: number
  trend: 'up' | 'down' | 'stable'
}

export default function StorePerformance() {
  const [stores, setStores] = useState<StoreData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStorePerformance()
  }, [])

  async function loadStorePerformance() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('counts')
        .select('loja, Regular, Excesso, Falta, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        const grouped = new Map<string, any[]>()

        data.forEach(item => {
          if (item.loja) {
            if (!grouped.has(item.loja)) grouped.set(item.loja, [])
            grouped.get(item.loja)!.push(item)
          }
        })

        const storeStats: StoreData[] = Array.from(grouped.entries())
          .map(([loja, items]) => {
            const avgRegular = items.reduce((s, i) => s + (i.Regular || 0), 0) / items.length
            const avgExcesso = items.reduce((s, i) => s + (i.Excesso || 0), 0) / items.length
            const avgFalta = items.reduce((s, i) => s + (i.Falta || 0), 0) / items.length

            // Calcula trend comparando primeira metade com segunda metade
            const mid = Math.floor(items.length / 2)
            const firstHalf = items.slice(0, mid).reduce((s, i) => s + (i.Falta || 0), 0) / Math.max(mid, 1)
            const secondHalf = items.slice(mid).reduce((s, i) => s + (i.Falta || 0), 0) / Math.max(items.length - mid, 1)
            const trendValue: 'up' | 'down' | 'stable' = firstHalf > secondHalf ? 'down' : firstHalf < secondHalf ? 'up' : 'stable'

            return {
              loja,
              totalCounts: items.length,
              avgRegular,
              avgExcesso,
              avgFalta,
              trend: trendValue
            }
          })
          .sort((a, b) => b.avgFalta - a.avgFalta)
          .slice(0, 6)

        setStores(storeStats)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="card text-xs text-zinc-500">Carregando performance...</div>
  }

  if (stores.length === 0) {
    return <div className="card text-xs text-zinc-500">Sem dados de lojas</div>
  }

  return (
    <div className="space-y-4">
      {/* Top problemas */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold">Lojas com Mais Faltas</h3>
        </div>
        <div className="space-y-2">
          {stores.slice(0, 3).map((store, idx) => (
            <div key={store.loja} className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  #{idx + 1} {store.loja}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Média de {store.avgFalta.toFixed(0)} faltas por contagem
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {store.avgFalta.toFixed(0)}
                </div>
                {store.trend === 'down' && (
                  <TrendingDown className="h-4 w-4 text-green-500 mx-auto" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top performance */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <h3 className="text-sm font-semibold">Lojas com Melhor Performance</h3>
        </div>
        <div className="space-y-2">
          {stores
            .filter(s => s.avgFalta < stores[0].avgFalta * 0.5)
            .slice(0, 3)
            .map(store => (
              <div key={store.loja} className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    ✓ {store.loja}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {store.totalCounts} contagens, {store.avgFalta.toFixed(0)} faltas em média
                  </p>
                </div>
                <div className="text-right text-green-600 dark:text-green-400 font-semibold">
                  {Math.round((1 - store.avgFalta / stores[0].avgFalta) * 100)}% melhor
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
