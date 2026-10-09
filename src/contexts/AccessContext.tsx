import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from './AuthContext'

export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  | 'incomplete' | 'incomplete_expired' | 'paused' | 'comp'

export type Access = {
  has_access: boolean
  is_admin: boolean
  status: SubscriptionStatus | null
  trial_ends_at: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  has_stripe_customer: boolean
}

type AccessContextType = {
  access: Access | null
  loading: boolean
  refresh: () => Promise<void>
}

const AccessContext = createContext<AccessContextType | undefined>(undefined)

export function AccessProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [access, setAccess] = useState<Access | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_access')
    if (!error && data) setAccess(data as Access)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setAccess(null)
      setLoading(false)
      return
    }
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [user?.id, authLoading, refresh])

  return (
    <AccessContext.Provider value={{ access, loading, refresh }}>
      {children}
    </AccessContext.Provider>
  )
}

export function useAccess(): AccessContextType {
  const ctx = useContext(AccessContext)
  if (!ctx) throw new Error('useAccess must be used within an AccessProvider')
  return ctx
}

/** Dias inteiros que faltam até a data (0 se já passou). */
export function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 0
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

/** Texto curto do estado da assinatura, para cabeçalho e tela de conta. */
export function describeAccess(access: Access | null): { tone: 'neutral' | 'warning' | 'danger' | 'ok'; label: string } {
  if (!access || !access.status) return { tone: 'neutral', label: '' }
  if (access.status === 'trialing') {
    const days = daysUntil(access.trial_ends_at ?? access.current_period_end)
    if (!access.has_access) return { tone: 'danger', label: 'Teste encerrado' }
    if (days <= 1) return { tone: 'warning', label: 'Teste termina hoje' }
    return { tone: days <= 3 ? 'warning' : 'neutral', label: `${days} dias de teste` }
  }
  if (access.status === 'active') {
    return access.cancel_at_period_end
      ? { tone: 'warning', label: 'Assinatura cancelada' }
      : { tone: 'ok', label: 'Assinatura ativa' }
  }
  if (access.status === 'comp') return { tone: 'ok', label: 'Acesso liberado' }
  if (access.status === 'past_due') return { tone: 'warning', label: 'Pagamento pendente' }
  if (access.status === 'canceled' && access.has_access) return { tone: 'warning', label: 'Assinatura cancelada' }
  return { tone: 'danger', label: 'Assinatura inativa' }
}
