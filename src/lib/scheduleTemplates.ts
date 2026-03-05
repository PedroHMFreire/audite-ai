/**
 * Schedule Templates - Templates inteligentes para geração automática de cronogramas
 * IA simples para recomendação de frequência baseada em histórico
 */

import { Result } from './db'

export interface ScheduleTemplate {
  id: string
  name: string
  description: string
  icon: string
  sectors_per_week: number
  total_weeks: number
  work_days: number[]
  recommendation_text: string
  ideal_for: string[]
}

/**
 * Templates pré-configurados para diferentes cenários
 */
export const SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  {
    id: 'weekly_intense',
    name: '📊 Semanal Intensivo',
    description: 'Contagem todas as semanas em múltiplos setores',
    icon: '📊',
    sectors_per_week: 5,
    total_weeks: 12,
    work_days: [1, 2, 3, 4, 5], // seg-sex
    recommendation_text: 'Ideal para redes com alta taxa de divergência ou alto turnover.',
    ideal_for: ['high_error_rate', 'high_turnover', 'large_network']
  },
  {
    id: 'biweekly_standard',
    name: '🔄 Quinzenal Padrão',
    description: 'Contagem a cada 2 semanas, distribuída nos dias úteis',
    icon: '🔄',
    sectors_per_week: 3,
    total_weeks: 24,
    work_days: [1, 2, 3, 4, 5],
    recommendation_text: 'Recomendado para a maioria das operações. Balanço entre frequência e custo.',
    ideal_for: ['standard_operation', 'medium_network', 'stable_operations']
  },
  {
    id: 'monthly_basic',
    name: '📅 Mensal Básico',
    description: 'Contagem mensal por categoria, simples e previsível',
    icon: '📅',
    sectors_per_week: 2,
    total_weeks: 24,
    work_days: [2, 4], // ter, qui
    recommendation_text: 'Para lojas com baixo volume ou excelente controle de estoque.',
    ideal_for: ['low_error_rate', 'stable_operations', 'small_stores']
  },
  {
    id: 'seasonal_intense',
    name: '🎄 Sazonalidade Marcada',
    description: 'Intensivo em períodos de pico, relaxado em off-season',
    icon: '🎄',
    sectors_per_week: 4,
    total_weeks: 12,
    work_days: [1, 2, 3, 4, 5],
    recommendation_text: 'Para negócios com sazonalidade forte (varejo, moda, etc).',
    ideal_for: ['seasonal_business', 'retail_network', 'high_variance']
  },
  {
    id: 'focused_risk',
    name: '⚠️ Foco em Risco',
    description: 'Frequência variável: lojas de risco 2x/semana, outras 1x/mês',
    icon: '⚠️',
    sectors_per_week: 3,
    total_weeks: 12,
    work_days: [1, 2, 3, 4, 5],
    recommendation_text: 'Inteligente: prioriza lojas problemáticas sem sobrecarregar as boas.',
    ideal_for: ['high_risk_locations', 'uneven_performance', 'limited_budget']
  }
]

/**
 * Análisa histórico de erros e recomenda template
 * ⚡ Usa lógica simples sem ML pesado
 */
export function recommendTemplate(
  results: Result[],
  storeCount: number,
  hasSeasonality: boolean = false
): ScheduleTemplate {
  if (results.length === 0) {
    return SCHEDULE_TEMPLATES[1] // biweekly_standard como padrão
  }

  // Calcula taxa média de divergência
  const avgDivergence = results.reduce((sum, r) => {
    // Calcula divergência a partir dos dados disponíveis
    const diff = Math.abs((r.saldo_qtd || 0) - (r.manual_qtd || 0))
    return sum + diff
  }, 0) / results.length

  // Calcula volatilidade (desvio padrão)
  const deviations = results.map(r => {
    const diff = Math.abs((r.saldo_qtd || 0) - (r.manual_qtd || 0))
    return Math.pow(diff - avgDivergence, 2)
  })
  const volatility = Math.sqrt(
    deviations.reduce((a, b) => a + b, 0) / deviations.length
  )

  console.log(`📊 Análise: Média divergência=${avgDivergence.toFixed(1)}, Volatilidade=${volatility.toFixed(1)}`)

  // Recomendação baseada em métricas
  if (hasSeasonality) {
    return SCHEDULE_TEMPLATES.find(t => t.id === 'seasonal_intense')!
  }

  if (avgDivergence > 15) {
    return SCHEDULE_TEMPLATES.find(t => t.id === 'weekly_intense')!
  }

  if (avgDivergence > 8) {
    if (volatility > 5) {
      return SCHEDULE_TEMPLATES.find(t => t.id === 'focused_risk')!
    }
    return SCHEDULE_TEMPLATES.find(t => t.id === 'biweekly_standard')!
  }

  return SCHEDULE_TEMPLATES.find(t => t.id === 'monthly_basic')!
}

/**
 * Calcula score de risco por loja (0-100)
 * Baseado no histórico de divergências
 */
export function calculateRiskScore(storeResults: Result[]): number {
  if (storeResults.length === 0) return 50 // neutro

  const recentResults = storeResults.slice(-20) // últimas 20
  const avgDivergence = recentResults.reduce((sum, r) => {
    const diff = Math.abs((r.saldo_qtd || 0) - (r.manual_qtd || 0))
    return sum + diff
  }, 0) / recentResults.length

  // Calcula tendência (piorando? melhorando?)
  const firstHalf = recentResults.slice(0, Math.floor(recentResults.length / 2))
  const secondHalf = recentResults.slice(Math.floor(recentResults.length / 2))
  
  const trend1 = firstHalf.reduce((s, r) => {
    const diff = Math.abs((r.saldo_qtd || 0) - (r.manual_qtd || 0))
    return s + diff
  }, 0) / firstHalf.length
  
  const trend2 = secondHalf.reduce((s, r) => {
    const diff = Math.abs((r.saldo_qtd || 0) - (r.manual_qtd || 0))
    return s + diff
  }, 0) / secondHalf.length
  
  const trendDirection = trend2 - trend1 // positivo = piorando

  // Score = 40% erro médio + 30% tendência + 30% volatilidade
  const errorScore = Math.min(avgDivergence * 3, 100)
  const trendScore = Math.max(0, Math.min(trendDirection * 5, 50))
  
  const volatility = Math.sqrt(
    recentResults.reduce((sum, r) => {
      const diff = Math.abs((r.saldo_qtd || 0) - (r.manual_qtd || 0))
      return sum + Math.pow(diff - avgDivergence, 2)
    }, 0) / recentResults.length
  )
  const volScore = Math.min(volatility * 2, 30)

  return Math.min(100, (errorScore * 0.4) + (trendScore * 0.3) + (volScore * 0.3))
}

/**
 * Encontra melhor dia da semana por loja para contar
 * Por enquanto retorna dia padrão (terça é estatisticamente melhor)
 */
export function findBestDayOfWeek(): number {
  return 2 // Terça é bom padrão
}

/**
 * Recomenda frequência de contagem por loja
 * Baseada no score de risco
 */
export function recommendFrequency(riskScore: number): {
  frequency: 'twice_a_week' | 'weekly' | 'biweekly' | 'monthly'
  sectors_per_week: number
  description: string
} {
  if (riskScore > 75) {
    return {
      frequency: 'twice_a_week',
      sectors_per_week: 5,
      description: '⚠️ Crítico - Contar 2x/semana'
    }
  }

  if (riskScore > 50) {
    return {
      frequency: 'weekly',
      sectors_per_week: 4,
      description: '📊 Alto risco - Contar semanalmente'
    }
  }

  if (riskScore > 25) {
    return {
      frequency: 'biweekly',
      sectors_per_week: 3,
      description: '🔄 Moderado - Contar quinzenalmente'
    }
  }

  return {
    frequency: 'monthly',
    sectors_per_week: 2,
    description: '✅ Baixo risco - Contar mensalmente'
  }
}

/**
 * Gera configuração de cronograma a partir de template + customização
 */
export function generateConfigFromTemplate(
  template: ScheduleTemplate,
  overrides?: Partial<any>
): Partial<any> {
  const today = new Date()
  // Próxima segunda-feira
  const daysUntilMonday = (1 + 7 - today.getDay()) % 7 || 7
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)

  return {
    name: template.name,
    description: template.description,
    sectors_per_week: template.sectors_per_week,
    total_weeks: template.total_weeks,
    work_days: template.work_days,
    start_date: nextMonday.toISOString().split('T')[0],
    ...overrides
  }
}

/**
 * Interface para insights do dashboard
 */
export interface ScheduleInsight {
  type: 'warning' | 'info' | 'success'
  icon: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}
