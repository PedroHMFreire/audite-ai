// Validação e sanitização de inputs
export const InputValidator = {
  // Validação de email
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  },

  // Senha: comprimento é o que importa (NIST 800-63B); sem regras de composição
  // que só atrapalham o cadastro. O limite de 72 é o do bcrypt usado pelo Supabase.
  password: (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    if (password.length < 8) errors.push('A senha precisa ter pelo menos 8 caracteres')
    if (password.length > 72) errors.push('A senha pode ter no máximo 72 caracteres')
    return { valid: errors.length === 0, errors }
  },

  // Validação de UUID
  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  },

  // Limpa texto digitado: tira caracteres de controle e espaços das pontas.
  // Não escapa HTML — o React já escapa ao renderizar, e escapar aqui gravava
  // entidades no banco (um nome com "/" ou apóstrofo aparecia como "&#x2F;").
  sanitizeText: (text: string): string => {
    // eslint-disable-next-line no-control-regex
    return text.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  },

  // Código de produto: os sistemas de loja usam de tudo (EAN, "VEST.001/P",
  // "REF 123-A"), então só exigimos que não seja vazio nem longo demais.
  productCode: (code: string): boolean => {
    return typeof code === 'string' && code.trim().length >= 1 && code.length <= 60
  },

  // Nome de categoria: qualquer texto de 1 a 100 caracteres ("Calças & Shorts").
  categoryName: (name: string): boolean => {
    return typeof name === 'string' && name.trim().length >= 1 && name.length <= 100
  },

  // Validação de quantidade
  quantity: (qty: number): boolean => {
    return Number.isInteger(qty) && qty >= 0 && qty <= 999999
  },

  // Validação de status de subscrição
  subscriptionStatus: (status: string): boolean => {
    const validStatuses = ['trial', 'active', 'cancelled', 'expired', 'suspended']
    return validStatuses.includes(status.toLowerCase())
  },

  // Validação de número inteiro positivo
  positiveInteger: (num: number): boolean => {
    return Number.isInteger(num) && num > 0
  },

  // Validação de número positivo (pode ser decimal)
  positiveNumber: (num: number): boolean => {
    return typeof num === 'number' && num > 0 && !isNaN(num)
  },

  // Validação de data válida
  validDate: (date: string): boolean => {
    const d = new Date(date)
    return d instanceof Date && !isNaN(d.getTime())
  },

  // Validação de booleano
  boolean: (value: any): boolean => {
    return typeof value === 'boolean'
  },

  // Validação de array não vazio
  nonEmptyArray: (arr: any[]): boolean => {
    return Array.isArray(arr) && arr.length > 0
  },

  // Validação de string não vazia
  nonEmptyString: (str: string): boolean => {
    return typeof str === 'string' && str.trim().length > 0
  },

  // Validação de URL
  url: (urlString: string): boolean => {
    try {
      new URL(urlString)
      return true
    } catch {
      return false
    }
  }
}

// Rate Limiting Client-Side com Persistência em localStorage
export class RateLimiter {
  private readonly STORAGE_KEY = 'audite_rate_limits'
  private readonly CLEANUP_INTERVAL = 60 * 1000 // Limpar a cada minuto
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanupTimer()
  }

  // Inicia limpeza periódica de dados expirados
  private startCleanupTimer(): void {
    if (typeof window === 'undefined') return
    
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredAttempts()
    }, this.CLEANUP_INTERVAL)
  }

  // Para a limpeza periódica
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  // Recupera dados do localStorage
  private getAttempts(): Record<string, Array<{time: number, expiresAt: number}>> {
    if (typeof window === 'undefined') return {}
    
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  // Salva dados no localStorage
  private saveAttempts(attempts: Record<string, Array<{time: number, expiresAt: number}>>): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(attempts))
    } catch (e) {
      console.error('Failed to save rate limit data:', e)
    }
  }

  // Remove tentativas expiradas
  private cleanupExpiredAttempts(): void {
    const attempts = this.getAttempts()
    const now = Date.now()
    let modified = false

    for (const key in attempts) {
      const validAttempts = attempts[key].filter(a => a.expiresAt > now)
      
      if (validAttempts.length === 0) {
        delete attempts[key]
        modified = true
      } else if (validAttempts.length < attempts[key].length) {
        attempts[key] = validAttempts
        modified = true
      }
    }

    if (modified) {
      this.saveAttempts(attempts)
    }
  }

  // Verifica se operação está dentro do limite
  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now()
    const attempts = this.getAttempts()
    
    // Remove tentativas expiradas
    const validAttempts = (attempts[key] || []).filter(a => a.expiresAt > now)
    
    if (validAttempts.length >= maxAttempts) {
      return false
    }
    
    // Adiciona nova tentativa com expiração
    validAttempts.push({
      time: now,
      expiresAt: now + windowMs
    })
    
    attempts[key] = validAttempts
    this.saveAttempts(attempts)
    
    return true
  }

  // Reseta rate limit para uma chave específica
  reset(key: string): void {
    const attempts = this.getAttempts()
    delete attempts[key]
    this.saveAttempts(attempts)
  }

  // Reseta todos os rate limits
  resetAll(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  // Rate limiting para login (5 tentativas por 15 min)
  checkLogin(email: string): boolean {
    return this.isAllowed(`login:${email}`, 5, 15 * 60 * 1000)
  }

  // Rate limiting para signup (3 tentativas por hora)
  checkSignup(email: string): boolean {
    return this.isAllowed(`signup:${email}`, 3, 60 * 60 * 1000)
  }

  // Rate limiting para operações sensíveis (10 por minuto)
  checkSensitive(userId: string): boolean {
    return this.isAllowed(`sensitive:${userId}`, 10, 60 * 1000)
  }

  // Rate limiting para password reset (3 tentativas por hora)
  checkPasswordReset(email: string): boolean {
    return this.isAllowed(`password_reset:${email}`, 3, 60 * 60 * 1000)
  }

  // Rate limiting para 2FA (5 tentativas por 30 min)
  check2FA(userId: string): boolean {
    return this.isAllowed(`2fa:${userId}`, 5, 30 * 60 * 1000)
  }
}

// Instância global do rate limiter
export const rateLimiter = new RateLimiter()

// Utilitários de segurança
export const SecurityUtils = {
  // Gera token CSRF
  generateCSRFToken: (): string => {
    return crypto.randomUUID()
  },

  // Verifica se URL é segura (evita open redirect)
  isSafeURL: (url: string): boolean => {
    try {
      const parsed = new URL(url, window.location.origin)
      return parsed.origin === window.location.origin
    } catch {
      return false
    }
  },

  // Limpa dados sensíveis do localStorage
  clearSensitiveData: (): void => {
    const keysToKeep = ['theme', 'language'] // Mantém apenas configs não sensíveis
    const allKeys = Object.keys(localStorage)
    
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key)
      }
    })
  },

  // Verifica se a sessão está expirada
  isSessionExpired: (expiresAt: number): boolean => {
    return Date.now() >= expiresAt * 1000
  },

  // Força logout em caso de suspeita
  forceLogout: async (): Promise<void> => {
    SecurityUtils.clearSensitiveData()
    window.location.href = '/login'
  }
}

// Hook para logging de segurança (client-side)
export const SecurityLogger = {
  logSecurityEvent: (event: string, details: Record<string, any> = {}): void => {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...details
    }
    
    // Em produção, enviar para serviço de logging
    console.warn('SECURITY EVENT:', logData)
  },

  logSuspiciousActivity: (activity: string, details: Record<string, any> = {}): void => {
    SecurityLogger.logSecurityEvent('SUSPICIOUS_ACTIVITY', { activity, ...details })
  },

  logAuthAttempt: (email: string, success: boolean, error?: string): void => {
    SecurityLogger.logSecurityEvent('AUTH_ATTEMPT', { 
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
      success, 
      error 
    })
  }
}