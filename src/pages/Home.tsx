import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QuickActionCard from '@/components/QuickActionCard'
import DashboardCards from '@/components/DashboardCards'
import Charts from '@/components/Charts'
import { RecentCountsTimeline } from '@/components/RecentCountsTimeline'
import StorePerformance from '@/components/StorePerformance'
import ContextualSidebar from '@/components/ContextualSidebar'
import TutorialModal from '@/components/TutorialModal'
import { createCount, getTotalsLastCounts } from '@/lib/db'
import { supabase } from '@/lib/supabaseClient'
import { SkeletonLoader } from '@/components/SkeletonLoader'

export default function Home() {
  const [totals, setTotals] = useState({ regular: 0, excesso: 0, falta: 0 })
  const [chart, setChart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [countTotal, setCountTotal] = useState(0)
  const [showTutorial, setShowTutorial] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const data = await getTotalsLastCounts(5)
        setChart(data)
        
        // Contar total de contagens
        const { count } = await supabase
          .from('counts')
          .select('*', { count: 'exact', head: true })
        
        setCountTotal(count || 0)

        // Aggregate totals
        let reg = 0, exc = 0, fal = 0
        for (const d of data) {
          reg += d.Regular; exc += d.Excesso; fal += d.Falta
        }
        setTotals({ regular: reg, excesso: exc, falta: fal })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function handleStartCount(nome: string, loja?: string | null) {
    const c = await createCount(nome.trim(), loja)
    nav(`/contagens/${c.id}`)
  }

  return (
    <div className="flex-1">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:pr-80">
        <div className="space-y-6">
          {/* Card de ação rápida */}
          <div data-quick-action>
            <QuickActionCard onStartCount={handleStartCount} />
          </div>

          {loading ? (
            <SkeletonLoader />
          ) : (
            <>
              {/* KPI Cards */}
              {(() => {
                const trends = {
                  regular: { value: '+12% vs semana passada', direction: 'up' as const },
                  excesso: { value: '-5% vs semana passada', direction: 'down' as const },
                  falta: { value: '+3% vs semana passada', direction: 'up' as const }
                }

                const sparklines = {
                  regular: chart.map(c => c.Regular),
                  excesso: chart.map(c => c.Excesso),
                  falta: chart.map(c => c.Falta)
                }

                return (
                  <DashboardCards 
                    totals={totals}
                    trends={trends}
                    sparklines={sparklines}
                    targets={{ regular: 100, excesso: 20, falta: 10 }}
                  />
                )
              })()}

              {/* Gráfico */}
              <Charts data={chart} />

              {/* Seção inferior com Timeline e Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Timeline de contagens */}
                <RecentCountsTimeline />

                {/* Performance por loja */}
                <StorePerformance />
              </div>
            </>
          )}
        </div>

        {/* Tutorial Modal */}
        <TutorialModal 
          isOpen={showTutorial} 
          onClose={() => setShowTutorial(false)} 
        />
      </div>

      {/* Sidebar contextual (desktop only) */}
      <ContextualSidebar onTutorialClick={() => setShowTutorial(true)} />
    </div>
  )
}
