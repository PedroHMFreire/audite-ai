import { supabase } from './supabaseClient'

/**
 * Cobrança via Stripe. As chaves ficam só no servidor (Edge Functions);
 * o navegador apenas pede uma URL de checkout ou do portal do cliente.
 *
 * Enquanto as chaves não estiverem configuradas, as funções respondem
 * "billing_not_configured" e a interface mostra que a assinatura ainda
 * não está disponível, em vez de falhar.
 */
export class BillingNotConfiguredError extends Error {
  constructor() {
    super('A assinatura online ainda não está disponível.')
    this.name = 'BillingNotConfiguredError'
  }
}

async function invoke(fn: 'stripe-checkout' | 'stripe-portal'): Promise<string> {
  const { data, error } = await supabase.functions.invoke(fn, { body: {} })

  let payload: any = data
  if (error) {
    // supabase-js entrega o corpo da resposta de erro em error.context
    const res = (error as any).context
    if (res && typeof res.json === 'function') {
      payload = await res.json().catch(() => null)
    }
  }

  if (payload?.error === 'billing_not_configured') throw new BillingNotConfiguredError()
  if (payload?.url) return payload.url as string
  throw new Error(payload?.message || 'Não foi possível abrir o pagamento. Tente novamente.')
}

/** Leva o usuário ao checkout do Stripe para assinar o plano. */
export async function startCheckout(): Promise<void> {
  window.location.assign(await invoke('stripe-checkout'))
}

/** Abre o portal do Stripe (trocar cartão, ver faturas, cancelar). */
export async function openBillingPortal(): Promise<void> {
  window.location.assign(await invoke('stripe-portal'))
}
