// Lógica pura da cobrança: sem rede e sem banco, para poder ser testada.

export type SubscriptionRow = {
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_ends_at?: string | null
}

const KNOWN_STATUSES = new Set([
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused',
])

const toIso = (unix: unknown): string | null =>
  typeof unix === 'number' && Number.isFinite(unix) ? new Date(unix * 1000).toISOString() : null

/** Converte um objeto Subscription do Stripe na linha da tabela `subscriptions`. */
// deno-lint-ignore no-explicit-any
export function subscriptionToRow(sub: any): SubscriptionRow {
  const item = sub?.items?.data?.[0]
  // Em versões recentes da API o período fica no item, não na assinatura.
  const periodEnd = sub?.current_period_end ?? item?.current_period_end ?? null
  const status = KNOWN_STATUSES.has(sub?.status) ? sub.status : 'incomplete'
  const row: SubscriptionRow = {
    status,
    stripe_customer_id: typeof sub?.customer === 'string' ? sub.customer : sub?.customer?.id ?? null,
    stripe_subscription_id: sub?.id ?? null,
    stripe_price_id: item?.price?.id ?? null,
    current_period_end: toIso(periodEnd),
    cancel_at_period_end: Boolean(sub?.cancel_at_period_end) || typeof sub?.cancel_at === 'number',
  }
  if (status === 'trialing') row.trial_ends_at = toIso(sub?.trial_end)
  return row
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(payload)))
}

/**
 * Confere a assinatura do webhook do Stripe (cabeçalho `Stripe-Signature`),
 * conforme https://docs.stripe.com/webhooks#verify-manually.
 * Recusa eventos com mais de `toleranceSeconds` para evitar replay.
 */
export async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!header || !secret) return false
  let timestamp = ''
  const signatures: string[] = []
  for (const part of header.split(',')) {
    const [k, v] = part.split('=', 2)
    if (k?.trim() === 't') timestamp = v?.trim() ?? ''
    if (k?.trim() === 'v1' && v) signatures.push(v.trim())
  }
  const ts = Number(timestamp)
  if (!timestamp || !Number.isFinite(ts) || signatures.length === 0) return false
  if (Math.abs(nowSeconds - ts) > toleranceSeconds) return false
  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`)
  return signatures.some((s) => timingSafeEqual(s, expected))
}

/** Achata um objeto no formato application/x-www-form-urlencoded que a API do Stripe espera. */
export function toFormBody(data: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue
    const name = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v !== null && typeof v === 'object') parts.push(toFormBody(v as Record<string, unknown>, `${name}[${i}]`))
        else parts.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(v))}`)
      })
    } else if (typeof value === 'object') {
      parts.push(toFormBody(value as Record<string, unknown>, name))
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.filter(Boolean).join('&')
}

/** Origem que pode chamar as funções pelo navegador: o próprio site e o ambiente local. */
export function allowedOrigin(origin: string | null, siteUrl: string): string {
  const o = origin ?? ''
  const allowed = (siteUrl !== '' && o === siteUrl) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)
  return allowed ? o : siteUrl || 'null'
}
