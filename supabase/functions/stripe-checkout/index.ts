// Cria a sessão de checkout do Stripe para o usuário logado assinar o plano.
import { adminClient, billingConfigured, corsHeaders, ensureCustomer, env, getUser, json, stripe } from '../_shared/billing.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'method_not_allowed' })

  const user = await getUser(req)
  if (!user) return json(req, 401, { error: 'unauthorized' })
  if (!billingConfigured()) return json(req, 503, { error: 'billing_not_configured' })

  try {
    const db = adminClient()
    const { data: sub } = await db.from('subscriptions')
      .select('status, stripe_subscription_id, cancel_at_period_end').eq('user_id', user.id).maybeSingle()
    // Quem já tem assinatura no Stripe gerencia pelo portal; evita cobrar duas vezes.
    if (sub?.stripe_subscription_id && ['active', 'past_due', 'trialing'].includes(sub.status)) {
      return json(req, 409, { error: 'already_subscribed', message: 'Você já tem uma assinatura. Use “Gerenciar pagamento”.' })
    }

    const customer = await ensureCustomer(db, user)
    const session = await stripe('POST', '/checkout/sessions', {
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      line_items: [{ price: env.priceId, quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
      locale: 'pt-BR',
      success_url: `${env.siteUrl}/assinatura?checkout=sucesso`,
      cancel_url: `${env.siteUrl}/assinatura?checkout=cancelado`,
    })
    return json(req, 200, { url: session.url })
  } catch (err) {
    console.error('stripe-checkout', err)
    return json(req, 502, { error: 'stripe_error', message: 'Não foi possível abrir o pagamento. Tente novamente em instantes.' })
  }
})
