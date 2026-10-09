// Infraestrutura comum das funções de cobrança (Deno / Supabase Edge Functions).
//
// Segredos esperados (supabase secrets set ...):
//   STRIPE_SECRET_KEY      chave secreta do Stripe (sk_live_... ou sk_test_...)
//   STRIPE_PRICE_ID        id do preço mensal do plano (price_...)
//   STRIPE_WEBHOOK_SECRET  segredo do endpoint de webhook (whsec_...)
//   SITE_URL               endereço público do app, sem barra no fim
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já existem no ambiente.

import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { allowedOrigin, toFormBody } from './billing-logic.ts'

export const env = {
  stripeKey: Deno.env.get('STRIPE_SECRET_KEY') ?? '',
  priceId: Deno.env.get('STRIPE_PRICE_ID') ?? '',
  webhookSecret: Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
  siteUrl: (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, ''),
  supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
  anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
}

export const billingConfigured = () => Boolean(env.stripeKey && env.priceId && env.siteUrl)

/** Só o próprio site (e o ambiente local) pode chamar as funções pelo navegador. */
export function corsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(req.headers.get('origin'), env.siteUrl),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export function json(req: Request | null, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(req ? corsHeaders(req) : {}) },
  })
}

export const adminClient = (): SupabaseClient =>
  createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

/** Identifica o usuário pelo token enviado pelo app. */
export async function getUser(req: Request): Promise<User | null> {
  const authorization = req.headers.get('Authorization')
  if (!authorization) return null
  const client = createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser()
  return error ? null : data.user
}

export class StripeError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

/** Chamada à API REST do Stripe. */
// deno-lint-ignore no-explicit-any
export async function stripe(method: 'GET' | 'POST', path: string, data?: Record<string, unknown>, idempotencyKey?: string): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: method === 'POST' && data ? toFormBody(data) : undefined,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new StripeError(body?.error?.message ?? `Stripe respondeu ${res.status}`, res.status)
  return body
}

/** Devolve o cliente do Stripe deste usuário, criando-o na primeira vez. */
export async function ensureCustomer(db: SupabaseClient, user: User): Promise<string> {
  const { data: row } = await db.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
  if (row?.stripe_customer_id) return row.stripe_customer_id

  const { data: profile } = await db.from('user_profiles').select('store_name, owner_name').eq('id', user.id).maybeSingle()
  const customer = await stripe('POST', '/customers', {
    email: user.email,
    name: profile?.store_name || profile?.owner_name || undefined,
    metadata: { user_id: user.id },
  }, `customer-${user.id}`)

  const { error } = await db.from('subscriptions').upsert(
    { user_id: user.id, stripe_customer_id: customer.id },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)
  return customer.id as string
}
