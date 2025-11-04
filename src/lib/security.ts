// Validação e sanitização de inputs
export const InputValidator = {
  // Validação de email
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  },

  // Validação de senha forte
  password: (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Senha deve ter pelo menos 8 caracteres')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula')
    }
    
    if (!/\d/.test(password)) {
      errors.push('Senha deve conter pelo menos um número')
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial')
    }
    
    return { valid: errors.length === 0, errors }
  },

  // Validação de UUID
  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  },

  // Sanitização de texto para evitar XSS
  sanitizeText: (text: string): string => {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim()
  },

  // Validação de código de produto
  productCode: (code: string): boolean => {
    // Permite apenas alphanumericos, hífens e underscores
    const codeRegex = /^[a-zA-Z0-9_-]{1,50}$/
    return codeRegex.test(code)
  },

  // Validação de nome de categoria
  categoryName: (name: string): boolean => {
    // Permite letras, números, espaços e alguns caracteres especiais
    const nameRegex = /^[a-zA-Z0-9\s\-_.áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]{1,100}$/
    return nameRegex.test(name)
  },

  // Validação de quantidade
  quantity: (qty: number): boolean => {
    return Number.isInteger(qty) && qty >= 0 && qty <= 999999
  }
}

// Rate Limiting Client-Side
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  
  // Verifica se operação está dentro do limite
  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    
    // Remove tentativas antigas
    const validAttempts = attempts.filter(time => now - time < windowMs)
    
    if (validAttempts.length >= maxAttempts) {
      return false
    }
    
    // Adiciona nova tentativa
    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    
    return true
  }
  
  // Rate limiting para login
  checkLogin(email: string): boolean {
    return this.isAllowed(`login:${email}`, 5, 15 * 60 * 1000) // 5 tentativas por 15 min
  }
  
  // Rate limiting para signup
  checkSignup(email: string): boolean {
    return this.isAllowed(`signup:${email}`, 3, 60 * 60 * 1000) // 3 tentativas por hora
  }
  
  // Rate limiting para operações sensíveis
  checkSensitive(userId: string): boolean {
    return this.isAllowed(`sensitive:${userId}`, 10, 60 * 1000) // 10 por minuto
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