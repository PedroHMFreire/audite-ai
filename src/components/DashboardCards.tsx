import { CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react'
import KPICard from './KPICard'

type Props = {
  totals: { regular: number; excesso: number; falta: number }
  trends?: {
    regular: { value: string; direction: 'up' | 'down' | 'stable' }
    excesso: { value: string; direction: 'up' | 'down' | 'stable' }
    falta: { value: string; direction: 'up' | 'down' | 'stable' }
  }
  sparklines?: {
    regular: number[]
    excesso: number[]
    falta: number[]
  }
  targets?: {
    regular: number
    excesso: number
    falta: number
  }
  onCardClick?: (category: string) => void
}

export default function DashboardCards({ 
  totals, 
  trends,
  sparklines,
  targets,
  onCardClick
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <KPICard
        title="Produtos Regulares"
        value={totals.regular}
        target={targets?.regular}
        trend={trends?.regular.value}
        trendDirection={trends?.regular.direction}
        color="green"
        icon={<CheckCircle className="h-8 w-8" />}
        sparkline={sparklines?.regular}
        onClick={() => onCardClick?.('regular')}
      />
      
      <KPICard
        title="Excesso"
        value={totals.excesso}
        target={targets?.excesso}
        trend={trends?.excesso.value}
        trendDirection={trends?.excesso.direction}
        color="orange"
        icon={<TrendingUp className="h-8 w-8" />}
        sparkline={sparklines?.excesso}
        onClick={() => onCardClick?.('excesso')}
      />
      
      <KPICard
        title="Em Falta"
        value={totals.falta}
        target={targets?.falta}
        trend={trends?.falta.value}
        trendDirection={trends?.falta.direction}
        color="red"
        icon={<AlertTriangle className="h-8 w-8" />}
        sparkline={sparklines?.falta}
        onClick={() => onCardClick?.('falta')}
      />
    </div>
  )
}
