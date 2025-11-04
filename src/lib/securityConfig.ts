// Configurações centralizadas de segurança
export const SECURITY_CONFIG = {
  // Configurações de sessão
  session: {
    maxInactiveTime: parseInt(import.meta.env.VITE_SESSION_TIMEOUT) || 30 * 60 * 1000, // 30 min
    maxSessionTime: 8 * 60 * 60 * 1000, // 8 horas
    refreshThreshold: 5 * 60 * 1000, // 5 minutos antes de expirar
  },

  // Configurações de rate limiting
  rateLimit: {
    maxLoginAttempts: parseInt(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS) || 5,
    loginWindowMs: 15 * 60 * 1000, // 15 minutos
    signupWindowMs: 60 * 60 * 1000, // 1 hora
    apiRequestsPerMinute: parseInt(import.meta.env.VITE_API_RATE_LIMIT) || 100,
  },

  // Configurações de validação
  validation: {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['.xlsx', '.xls', '.csv'],
  },

  // URLs permitidas para redirecionamento
  allowedRedirects: import.meta.env.VITE_ALLOWED_REDIRECT_DOMAINS?.split(',') || [
    'localhost:5173',
    'localhost:5174',
  ],

  // Features de segurança
  features: {
    enable2FA: import.meta.env.VITE_ENABLE_2FA === 'true',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true',
    enforceHttps: import.meta.env.VITE_APP_ENV === 'production',
  },

  // Headers de segurança (para desenvolvimento)
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },

  // Configurações de logging
  logging: {
    logLevel: import.meta.env.VITE_APP_ENV === 'production' ? 'error' : 'debug',
    logRetentionDays: 30,
    criticalEvents: [
      'SUSPICIOUS_ACTIVITY',
      'FORCED_LOGOUT',
      'AUTH_FAILURE',
      'DATA_BREACH_ATTEMPT',
      'INVALID_TOKEN',
    ],
  },
}

// Eventos de segurança para logging
export const SECURITY_EVENTS = {
  // Autenticação
  AUTH_ATTEMPT: 'AUTH_ATTEMPT',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  LOGOUT: 'LOGOUT',
  FORCED_LOGOUT: 'FORCED_LOGOUT',
  
  // Sessão
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_RENEWED: 'SESSION_RENEWED',
  INVALID_SESSION: 'INVALID_SESSION',
  
  // Atividade suspeita
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT: 'INVALID_INPUT',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  
  // Dados
  DATA_ACCESS: 'DATA_ACCESS',
  DATA_MODIFICATION: 'DATA_MODIFICATION',
  DATA_DELETION: 'DATA_DELETION',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  
  // Sistema
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
} as const

// Níveis de severidade
export const SEVERITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const

// Função para verificar se está em produção
export const isProduction = () => import.meta.env.VITE_APP_ENV === 'production'

// Função para verificar se feature está habilitada
export const isFeatureEnabled = (feature: keyof typeof SECURITY_CONFIG.features): boolean => {
  return SECURITY_CONFIG.features[feature]
}

// Função para obter configuração de rate limit
export const getRateLimitConfig = (type: 'login' | 'signup' | 'api') => {
  const config = SECURITY_CONFIG.rateLimit
  switch (type) {
    case 'login':
      return { max: config.maxLoginAttempts, window: config.loginWindowMs }
    case 'signup':
      return { max: 3, window: config.signupWindowMs }
    case 'api':
      return { max: config.apiRequestsPerMinute, window: 60 * 1000 }
    default:
      return { max: 10, window: 60 * 1000 }
  }
}