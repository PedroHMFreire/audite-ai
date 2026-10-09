// Abre o portal do cliente do Stripe: trocar cartão, ver faturas, cancelar.
import { adminClient, billingConfigured, corsHeaders, env, getUser, json, stripe } from '../_shared/billing.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'method_not_allowed' })

  const user = await getUser(req)
  if (!user) return json(req, 401, { error: 'unauthorized' })
  if (!billingConfigured()) return json(req, 503, { error: 'billing_not_configured' })

  try {
    const { data: sub } = await adminClient().from('subscriptions')
      .select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
    if (!sub?.stripe_customer_id) {
      return json(req, 404, { error: 'no_customer', message: 'Você ainda não tem uma assinatura para gerenciar.' })
    }
    const session = await stripe('POST', '/billing_portal/sessions', {
      customer: sub.stripe_customer_id,
      return_url: `${env.siteUrl}/assinatura`,
      locale: 'pt-BR',
    })
    return json(req, 200, { url: session.url })
  } catch (err) {
    console.error('stripe-portal', err)
    return json(req, 502, { error: 'stripe_error', message: 'Não foi possível abrir o portal de pagamento. Tente novamente em instantes.' })
  }
})
