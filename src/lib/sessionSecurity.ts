import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { SecurityUtils, SecurityLogger } from './security'

interface SessionSecurity {
  isValid: boolean
  user: any | null
  lastActivity: number
  securityFlags: string[]
}

// Configurações de segurança da sessão
const SESSION_CONFIG = {
  maxInactiveTime: 30 * 60 * 1000, // 30 minutos
  maxSessionTime: 8 * 60 * 60 * 1000, // 8 horas
  activityCheckInterval: 60 * 1000 // 1 minuto
}

class SessionManager {
  private lastActivity: number = Date.now()
  private sessionStart: number = Date.now()
  private activityTimer: NodeJS.Timeout | null = null
  private securityFlags: string[] = []

  constructor() {
    this.setupActivityTracking()
    this.setupVisibilityTracking()
  }

  // Rastreia atividade do usuário
  private setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    const updateActivity = () => {
      this.lastActivity = Date.now()
    }

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })
  }

  // Rastreia mudanças de visibilidade da página
  private setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        SecurityLogger.logSecurityEvent('PAGE_HIDDEN', { 
          duration: Date.now() - this.lastActivity 
        })
      } else {
        SecurityLogger.logSecurityEvent('PAGE_VISIBLE')
        this.lastActivity = Date.now()
      }
    })
  }

  // Verifica se a sessão é válida
  public validateSession(): SessionSecurity {
    const now = Date.now()
    const timeSinceActivity = now - this.lastActivity
    const timeSinceStart = now - this.sessionStart
    
    this.securityFlags = []

    // Verifica inatividade
    if (timeSinceActivity > SESSION_CONFIG.maxInactiveTime) {
      this.securityFlags.push('INACTIVE_TOO_LONG')
    }

    // Verifica duração total da sessão
    if (timeSinceStart > SESSION_CONFIG.maxSessionTime) {
      this.securityFlags.push('SESSION_TOO_LONG')
    }

    // Verifica mudanças suspeitas no user agent
    const storedUserAgent = localStorage.getItem('userAgent')
    if (storedUserAgent && storedUserAgent !== navigator.userAgent) {
      this.securityFlags.push('USER_AGENT_CHANGED')
    }

    const isValid = this.securityFlags.length === 0

    return {
      isValid,
      user: null, // será preenchido pelo hook
      lastActivity: this.lastActivity,
      securityFlags: this.securityFlags
    }
  }

  // Inicia monitoramento de segurança
  public startSecurityMonitoring(callback: (security: SessionSecurity) => void) {
    this.activityTimer = setInterval(() => {
      const security = this.validateSession()
      callback(security)
    }, SESSION_CONFIG.activityCheckInterval)
  }

  // Para monitoramento
  public stopSecurityMonitoring() {
    if (this.activityTimer) {
      clearInterval(this.activityTimer)
    }
  }

  // Força logout de segurança
  public async forceSecurityLogout(reason: string) {
    SecurityLogger.logSecurityEvent('FORCED_LOGOUT', { reason })
    await SecurityUtils.forceLogout()
  }

  // Renova sessão
  public renewSession() {
    this.sessionStart = Date.now()
    this.lastActivity = Date.now()
    this.securityFlags = []
  }
}

// Instância global do gerenciador de sessão
const sessionManager = new SessionManager()

// Hook para gerenciamento seguro de sessão
export function useSecureSession() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [securityStatus, setSecurityStatus] = useState<SessionSecurity | null>(null)

  useEffect(() => {
    // Configura user agent inicial
    localStorage.setItem('userAgent', navigator.userAgent)

    // Verifica sessão inicial
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // Verifica se o token não está expirado
          if (SecurityUtils.isSessionExpired(session.expires_at || 0)) {
            SecurityLogger.logSecurityEvent('EXPIRED_TOKEN')
            await supabase.auth.signOut()
            return
          }
          
          setSession(session)
          sessionManager.renewSession()
        }
      } catch (error) {
        SecurityLogger.logSecurityEvent('SESSION_CHECK_ERROR', { error })
      } finally {
        setLoading(false)
      }
    }

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        
        if (event === 'SIGNED_IN') {
          SecurityLogger.logSecurityEvent('USER_SIGNED_IN')
          sessionManager.renewSession()
        }
        
        if (event === 'SIGNED_OUT') {
          SecurityLogger.logSecurityEvent('USER_SIGNED_OUT')
          SecurityUtils.clearSensitiveData()
          sessionManager.stopSecurityMonitoring()
        }
        
        if (event === 'TOKEN_REFRESHED') {
          SecurityLogger.logSecurityEvent('TOKEN_REFRESHED')
          sessionManager.renewSession()
        }
      }
    )

    // Inicia monitoramento de segurança
    sessionManager.startSecurityMonitoring((security) => {
      setSecurityStatus(security)
      
      // Auto-logout em caso de problemas de segurança
      if (!security.isValid && session) {
        const criticalFlags = ['USER_AGENT_CHANGED', 'SESSION_TOO_LONG']
        const hasCriticalFlag = security.securityFlags.some(flag => 
          criticalFlags.includes(flag)
        )
        
        if (hasCriticalFlag) {
          sessionManager.forceSecurityLogout(security.securityFlags.join(', '))
        }
      }
    })

    checkInitialSession()

    return () => {
      subscription.unsubscribe()
      sessionManager.stopSecurityMonitoring()
    }
  }, [])

  return {
    session,
    loading,
    securityStatus,
    isAuthenticated: !!session,
    forceLogout: () => sessionManager.forceSecurityLogout('MANUAL'),
    renewSession: () => sessionManager.renewSession()
  }
}

// Hook para verificar permissões
export function usePermissions() {
  const { session } = useSecureSession()
  
  return {
    canAccessFeature: (feature: string): boolean => {
      if (!session) return false
      
      // Aqui você pode implementar lógica de permissões baseada em planos
      const userMetadata = session.user?.user_metadata || {}
      const plan = userMetadata.plan || 'trial'
      
      // Lógica de permissões por funcionalidade
      const permissions = {
        'trial': ['basic_counts', 'basic_reports'],
        'Básico': ['basic_counts', 'basic_reports', 'categories'],
        'Profissional': ['basic_counts', 'basic_reports', 'categories', 'schedule', 'advanced_reports'],
        'Premium': ['*'] // Todas as funcionalidades
      }
      
      const userPermissions = permissions[plan as keyof typeof permissions] || []
      return userPermissions.includes('*') || userPermissions.includes(feature)
    }
  }
}

export default sessionManager