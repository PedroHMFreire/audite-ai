/**
 * Schedule Analytics - Gera insights e análises para o dashboard
 * Processa histórico de contagens para fornecer recomendações
 */

import { Result, ScheduleItem, Count } from './db'
import { 
  calculateRiskScore, 
  findBestDayOfWeek, 
  recommendFrequency,
  ScheduleInsight 
} from './scheduleTemplates'

export interface ScheduleMetrics {
  totalLojas: number
  lorasComRisco: number
  mediaErrosGlobal: number
  logosMelhorDesempenho: string[]
  logosMaiorRisco: string[]
  diaOptimo: number
  recomendacoes: ScheduleInsight[]
}

/**
 * Agrupa resultados por código (produto/categoria)
 */
function groupResultsByStore(results: Result[]): Map<string, Result[]> {
  const map = new Map<string, Result[]>()
  
  results.forEach(result => {
    const codigo = result.codigo || 'unknown'
    if (!map.has(codigo)) {
      map.set(codigo, [])
    }
    map.get(codigo)!.push(result)
  })
  
  return map
}

/**
 * Calcula média de divergências para análise global
 */
function calculateGlobalMetrics(results: Result[]): {
  avgDivergence: number
  countsByStatus: { [key: string]: number }
  totalResults: number
} {
  const avgDivergence = results.length > 0
    ? results.reduce((sum, r) => {
        const diff = Math.abs((r.saldo_qtd || 0) - (r.manual_qtd || 0))
        return sum + diff
      }, 0) / results.length
    : 0

  const countsByStatus: { [key: string]: number } = {}
  results.forEach(r => {
    const status = r.status || 'unknown'
    countsByStatus[status] = (countsByStatus[status] || 0) + 1
  })

  return { avgDivergence, countsByStatus, totalResults: results.length }
}

/**
 * Gera análise completa para dashboard
 */
export function generateScheduleMetrics(results: Result[]): ScheduleMetrics {
  const byStore = groupResultsByStore(results)
  const { avgDivergence, countsByStatus } = calculateGlobalMetrics(results)

  // Calcula score de risco por loja
  const storeScores = Array.from(byStore.entries()).map(([codigo, storeResults]) => ({
    codigo,
    score: calculateRiskScore(storeResults),
    avgError: storeResults.reduce((s, r) => s + Math.abs((r.saldo_qtd || 0) - (r.manual_qtd || 0)), 0) / storeResults.length,
    bestDay: findBestDayOfWeek(),
    recentResult: storeResults[storeResults.length - 1]
  }))

  // Lojas com risco (score > 50)
  const lorasComRisco = storeScores.filter(s => s.score > 50).length

  // Top 3 melhor e pior desempenho
  const ranked = storeScores.sort((a, b) => b.score - a.score)
  const logosMaiorRisco = ranked.slice(0, 3).map(s => s.codigo)
  const logosMelhorDesempenho = ranked.slice(-3).map(s => s.codigo)

  const diaOtimo = findBestDayOfWeek()

  // Gera recomendações
  const recomendacoes = generateRecommendations(
    storeScores,
    avgDivergence,
    countsByStatus
  )

  return {
    totalLojas: byStore.size,
    lorasComRisco,
    mediaErrosGlobal: avgDivergence,
    logosMelhorDesempenho,
    logosMaiorRisco,
    diaOptimo: diaOtimo,
    recomendacoes
  }
}

/**
 * Gera lista de recomendações baseada em análise
 */
function generateRecommendations(
  storeScores: any[],
  avgDivergence: number,
  countsByStatus: { [key: string]: number }
): ScheduleInsight[] {
  const recomendacoes: ScheduleInsight[] = []

  // Recomendação 1: Lojas com muito risco
  const atRisk = storeScores.filter(s => s.score > 75)
  if (atRisk.length > 0) {
    recomendacoes.push({
      type: 'warning',
      icon: '⚠️',
      title: `${atRisk.length} categoria(s) com risco crítico`,
      description: `${atRisk.map(s => s.codigo).join(', ')} têm divergência alta. Considere aumentar frequência.`,
    })
  }

  // Recomendação 2: Carga desbalanceada
  const highErrorRate = storeScores.filter(s => s.score > 50)
  if (highErrorRate.length > storeScores.length * 0.5) {
    recomendacoes.push({
      type: 'warning',
      icon: '📊',
      title: `Mais de 50% das categorias têm risco moderado`,
      description: `Média global de ${avgDivergence.toFixed(1)} unidades/divergência. Revisar processos?`,
    })
  }

  // Recomendação 3: Lojas com bom desempenho
  const lowRisk = storeScores.filter(s => s.score < 25)
  if (lowRisk.length > 0) {
    recomendacoes.push({
      type: 'success',
      icon: '✅',
      title: `${lowRisk.length} categoria(s) com excelente desempenho`,
      description: `${lowRisk.map(s => s.codigo).slice(0, 2).join(', ')} têm erro mínimo.`,
    })
  }

  // Recomendação 4: Contagens pendentes
  const pendingCount = countsByStatus['pending'] || 0
  if (pendingCount > 5) {
    recomendacoes.push({
      type: 'warning',
      icon: '⏳',
      title: `${pendingCount} resultados aguardando`,
      description: `Várias contagens pendentes. Finalize para melhorar análise.`,
    })
  }

  // Recomendação 5: Use template inteligente
  if (recomendacoes.length === 0) {
    recomendacoes.push({
      type: 'info',
      icon: '💡',
      title: 'Usar template inteligente?',
      description: 'Clique em "Templates" para gerar cronograma otimizado automaticamente.',
    })
  }

  return recomendacoes.slice(0, 4) // Máximo 4 recomendações
}

/**
 * Detecta anomalias em um resultado individual
 */
export interface AnomalyDetection {
  isAnomaly: boolean
  severity: 'low' | 'medium' | 'high'
  reason: string
  suggestions: string[]
}

export function detectAnomaly(
  result: Result,
  recentResults: Result[]
): AnomalyDetection {
  if (recentResults.length < 3) {
    return {
      isAnomaly: false,
      severity: 'low',
      reason: 'Dados insuficientes para comparação',
      suggestions: []
    }
  }

  const currentDiv = Math.abs((result.saldo_qtd || 0) - (result.manual_qtd || 0))
  const avgDiv = recentResults.reduce((s, r) => {
    const diff = Math.abs((r.saldo_qtd || 0) - (r.manual_qtd || 0))
    return s + diff
  }, 0) / recentResults.length
  
  const stdDev = Math.sqrt(
    recentResults.reduce((s, r) => {
      const diff = Math.abs((r.saldo_qtd || 0) - (r.manual_qtd || 0)) - avgDiv
      return s + diff * diff
    }, 0) / recentResults.length
  )

  // Detecta quando divergência é > 2 desvios padrão acima da média
  const zScore = (currentDiv - avgDiv) / (stdDev || 1)
  const isAnomaly = zScore > 2

  if (!isAnomaly) {
    return {
      isAnomaly: false,
      severity: 'low',
      reason: 'Dentro do esperado',
      suggestions: []
    }
  }

  const severity: 'low' | 'medium' | 'high' = 
    currentDiv > 30 ? 'high' : 
    currentDiv > 15 ? 'medium' : 
    'low'

  const suggestions = []
  
  if (currentDiv > 20) {
    suggestions.push('Recount imediato dessa categoria')
    suggestions.push('Verificar registro de vendas')
    suggestions.push('Possível roubo ou erro de movimentação')
  }
  
  if (zScore > 3) {
    suggestions.push('Investigação urgente necessária')
    suggestions.push('Notifique supervisor da loja')
  }

  suggestions.push('Marcar para auditoria')

  return {
    isAnomaly: true,
    severity,
    reason: `Divergência ${currentDiv.toFixed(1)} está ${(zScore * 100).toFixed(0)}% acima da média histórica`,
    suggestions
  }
}

/**
 * Calcula carga de trabalho por semana (número de resultados)
 */
export function getWorkloadByWeek(scheduleItems: ScheduleItem[]): { [key: number]: number } {
  const byWeek: { [key: number]: number } = {}
  
  scheduleItems.forEach(item => {
    const week = item.week_number || 0
    byWeek[week] = (byWeek[week] || 0) + 1
  })

  return byWeek
}

/**
 * Detecta semanas desbalanceadas
 */
export function detectUnbalancedWeeks(scheduleItems: ScheduleItem[]): {
  unbalanced: boolean
  avgLoad: number
  maxLoad: number
  minLoad: number
  recommendation: string
} {
  const workload = getWorkloadByWeek(scheduleItems)
  const loads = Object.values(workload)
  
  if (loads.length === 0) {
    return {
      unbalanced: false,
      avgLoad: 0,
      maxLoad: 0,
      minLoad: 0,
      recommendation: ''
    }
  }

  const avgLoad = loads.reduce((a, b) => a + b) / loads.length
  const maxLoad = Math.max(...loads)
  const minLoad = Math.min(...loads)
  const variance = (maxLoad - minLoad) / avgLoad

  const unbalanced = variance > 0.5

  let recommendation = ''
  if (unbalanced) {
    recommendation = `Carga desbalanceada (mín: ${minLoad}, máx: ${maxLoad}). Rebalanceie para ${Math.round(avgLoad)} por semana.`
  }

  return { unbalanced, avgLoad, maxLoad, minLoad, recommendation }
}

/**
 * Wrapper para aceitar Count[] diretamente (para componentes React)
 */
export function generateScheduleMetricsFromCounts(counts: any[]): ScheduleMetrics {
  try {
    // Se array vazio, retorna dados vazios
    if (!counts || counts.length === 0) {
      return {
        totalLojas: 0,
        lorasComRisco: 0,
        mediaErrosGlobal: 0,
        logosMelhorDesempenho: [],
        logosMaiorRisco: [],
        diaOptimo: 1,
        recomendacoes: [{
          type: 'info',
          icon: '💡',
          title: 'Nenhuma contagem registrada',
          description: 'Comece criando contagens para ver recomendações.'
        }]
      }
    }
    
    // Converte Count[] para formato compatível
    const results = counts.map(c => ({
      ...c,
      status: c.status || 'pending',
      codigo: c.categoria_id || 'unknown',
      saldo_qtd: 0,
      manual_qtd: 0
    }))
    return generateScheduleMetrics(results as Result[])
  } catch (error) {
    console.error('Erro ao gerar métricas:', error)
    return {
      totalLojas: 0,
      lorasComRisco: 0,
      mediaErrosGlobal: 0,
      logosMelhorDesempenho: [],
      logosMaiorRisco: [],
      diaOptimo: 1,
      recomendacoes: [{
        type: 'warning',
        icon: '❌',
        title: 'Erro ao gerar métricas',
        description: 'Tente novamente mais tarde.'
      }]
    }
  }
}
