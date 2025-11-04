import { supabase } from './supabaseClient'

export interface ConversionEvent {
  id?: string
  user_id: string
  event_type: string
  event_data: Record<string, any>
  timestamp: string
  session_id?: string
  page_url?: string
  user_agent?: string
}

export interface ConversionMetrics {
  totalTrials: number
  totalConversions: number
  conversionRate: number
  averageTimeToConvert: number
  churnRate: number
  ltv: number
  topFeatures: { feature: string; usage: number }[]
}

// Eventos de conversão
export const CONVERSION_EVENTS = {
  // Funil de entrada
  LANDING_PAGE_VIEW: 'landing_page_view',
  PRICING_VIEW: 'pricing_view',
  TRIAL_SIGNUP_START: 'trial_signup_start',
  TRIAL_SIGNUP_COMPLETE: 'trial_signup_complete',
  
  // Onboarding
  FIRST_LOGIN: 'first_login',
  PROFILE_COMPLETED: 'profile_completed',
  FIRST_COUNT_CREATED: 'first_count_created',
  FIRST_FILE_UPLOADED: 'first_file_uploaded',
  FIRST_REPORT_GENERATED: 'first_report_generated',
  
  // Engajamento
  FEATURE_USED: 'feature_used',
  DAILY_ACTIVE: 'daily_active',
  WEEKLY_ACTIVE: 'weekly_active',
  SUPPORT_CONTACTED: 'support_contacted',
  
  // Conversão
  PAYMENT_PAGE_VIEW: 'payment_page_view',
  PAYMENT_STARTED: 'payment_started',
  PAYMENT_COMPLETED: 'payment_completed',
  SUBSCRIPTION_ACTIVE: 'subscription_active',
  
  // Retenção
  RENEWAL_REMINDER: 'renewal_reminder',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  CHURN: 'churn'
} as const

class AnalyticsService {
  // Registra evento de conversão
  async trackEvent(
    eventType: string, 
    eventData: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const actualUserId = userId || user?.id

      if (!actualUserId) return // Eventos anônimos não são rastreados

      const event: ConversionEvent = {
        user_id: actualUserId,
        event_type: eventType,
        event_data: eventData,
        timestamp: new Date().toISOString(),
        session_id: this.getSessionId(),
        page_url: window.location.href,
        user_agent: navigator.userAgent
      }

      await supabase.from('conversion_events').insert(event)
      
      // Log local para debug
      if (import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true') {
        console.log('Analytics Event:', event)
      }
    } catch (error) {
      console.error('Erro ao rastrear evento:', error)
    }
  }

  // Gera ou recupera session ID
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('analytics_session_id', sessionId)
    }
    return sessionId
  }

  // Calcula métricas de conversão
  async getConversionMetrics(dateRange?: { start: string; end: string }): Promise<ConversionMetrics> {
    try {
      const { data: events } = await supabase
        .from('conversion_events')
        .select('*')
        .gte('timestamp', dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('timestamp', dateRange?.end || new Date().toISOString())

      if (!events) return this.getEmptyMetrics()

      const metrics = this.calculateMetrics(events)
      return metrics
    } catch (error) {
      console.error('Erro ao calcular métricas:', error)
      return this.getEmptyMetrics()
    }
  }

  private calculateMetrics(events: ConversionEvent[]): ConversionMetrics {
    const trialSignups = events.filter(e => e.event_type === CONVERSION_EVENTS.TRIAL_SIGNUP_COMPLETE)
    const conversions = events.filter(e => e.event_type === CONVERSION_EVENTS.SUBSCRIPTION_ACTIVE)
    const churns = events.filter(e => e.event_type === CONVERSION_EVENTS.CHURN)

    const totalTrials = trialSignups.length
    const totalConversions = conversions.length
    const conversionRate = totalTrials > 0 ? (totalConversions / totalTrials) * 100 : 0

    // Calcula tempo médio para conversão
    const conversionTimes = conversions.map(conv => {
      const signup = trialSignups.find(trial => trial.user_id === conv.user_id)
      if (signup) {
        return new Date(conv.timestamp).getTime() - new Date(signup.timestamp).getTime()
      }
      return 0
    }).filter(time => time > 0)

    const averageTimeToConvert = conversionTimes.length > 0 
      ? conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length / (1000 * 60 * 60 * 24) // em dias
      : 0

    // Calcula churn rate
    const churnRate = totalConversions > 0 ? (churns.length / totalConversions) * 100 : 0

    // Top features mais utilizadas
    const featureEvents = events.filter(e => e.event_type === CONVERSION_EVENTS.FEATURE_USED)
    const featureUsage = featureEvents.reduce((acc, event) => {
      const feature = event.event_data.feature || 'unknown'
      acc[feature] = (acc[feature] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topFeatures = Object.entries(featureUsage)
      .map(([feature, usage]) => ({ feature, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10)

    return {
      totalTrials,
      totalConversions,
      conversionRate,
      averageTimeToConvert,
      churnRate,
      ltv: this.calculateLTV(conversions, churns),
      topFeatures
    }
  }

  private calculateLTV(conversions: ConversionEvent[], churns: ConversionEvent[]): number {
    // Simplificado: assume R$ 59/mês e calcula baseado na retenção
    const monthlyValue = 59
    const retentionRate = churns.length > 0 ? 1 - (churns.length / conversions.length) : 0.9
    const averageLifetime = retentionRate > 0 ? 1 / (1 - retentionRate) : 12
    return monthlyValue * averageLifetime
  }

  private getEmptyMetrics(): ConversionMetrics {
    return {
      totalTrials: 0,
      totalConversions: 0,
      conversionRate: 0,
      averageTimeToConvert: 0,
      churnRate: 0,
      ltv: 0,
      topFeatures: []
    }
  }

  // Identifica usuários em risco de churn
  async getUsersAtRisk(): Promise<string[]> {
    const { data: events } = await supabase
      .from('conversion_events')
      .select('user_id, timestamp, event_type')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (!events) return []

    // Usuários que não tiveram atividade nos últimos 3 dias
    const inactiveUsers = new Set<string>()
    const activeUsers = new Set<string>()
    
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000

    events.forEach(event => {
      if (new Date(event.timestamp).getTime() > threeDaysAgo) {
        activeUsers.add(event.user_id)
      } else {
        inactiveUsers.add(event.user_id)
      }
    })

    // Remove usuários ativos dos inativos
    inactiveUsers.forEach(userId => {
      if (activeUsers.has(userId)) {
        inactiveUsers.delete(userId)
      }
    })

    return Array.from(inactiveUsers)
  }
}

// Hook para usar analytics
export function useAnalytics() {
  const analytics = new AnalyticsService()

  const track = (event: string, data?: Record<string, any>) => {
    analytics.trackEvent(event, data)
  }

  return {
    track,
    getMetrics: analytics.getConversionMetrics.bind(analytics),
    getUsersAtRisk: analytics.getUsersAtRisk.bind(analytics),
    
    // Atalhos para eventos comuns
    trackLandingView: () => track(CONVERSION_EVENTS.LANDING_PAGE_VIEW),
    trackTrialSignup: (plan: string) => track(CONVERSION_EVENTS.TRIAL_SIGNUP_COMPLETE, { plan }),
    trackFirstLogin: () => track(CONVERSION_EVENTS.FIRST_LOGIN),
    trackFeatureUse: (feature: string) => track(CONVERSION_EVENTS.FEATURE_USED, { feature }),
    trackConversion: (plan: string, amount: number) => track(CONVERSION_EVENTS.SUBSCRIPTION_ACTIVE, { plan, amount })
  }
}

export default AnalyticsService