// Recebe os eventos do Stripe e mantém a tabela `subscriptions` em dia.
// Esta função não exige login (quem chama é o Stripe); a autenticidade é
// garantida pela assinatura do evento.
import { adminClient, env, json, stripe } from '../_shared/billing.ts'
import { subscriptionToRow, verifyStripeSignature } from '../_shared/billing-logic.ts'

const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(null, 405, { error: 'method_not_allowed' })
  if (!env.webhookSecret) return json(null, 503, { error: 'billing_not_configured' })

  const payload = await req.text()
  if (!(await verifyStripeSignature(payload, req.headers.get('stripe-signature'), env.webhookSecret))) {
    return json(null, 400, { error: 'invalid_signature' })
  }

  // deno-lint-ignore no-explicit-any
  let event: any
  try {
    event = JSON.parse(payload)
  } catch {
    return json(null, 400, { error: 'invalid_payload' })
  }
  if (!HANDLED.has(event?.type)) return json(null, 200, { received: true, ignored: true })

  const db = adminClient()

  // Idempotência: o Stripe pode reenviar o mesmo evento.
  const { error: seen } = await db.from('stripe_events').insert({ id: event.id, type: event.type })
  if (seen) {
    if (seen.code === '23505') return json(null, 200, { received: true, duplicate: true })
    console.error('stripe-webhook: stripe_events', seen)
    return json(null, 500, { error: 'storage_error' })
  }

  try {
    const object = event.data?.object ?? {}
    // deno-lint-ignore no-explicit-any
    let subscription: any = null
    let userId: string | null = null

    if (event.type === 'checkout.session.completed') {
      if (object.mode !== 'subscription' || !object.subscription) return json(null, 200, { received: true })
      userId = object.client_reference_id ?? null
      // O evento traz só o id; busca a assinatura completa quando há chave configurada.
      subscription = env.stripeKey
        ? await stripe('GET', `/subscriptions/${object.subscription}`)
        : { id: object.subscription, customer: object.customer, status: 'active' }
    } else {
      subscription = object
    }

    const row = subscriptionToRow(subscription)
    userId = userId ?? subscription?.metadata?.user_id ?? null

    if (!userId && row.stripe_customer_id) {
      const { data } = await db.from('subscriptions').select('user_id').eq('stripe_customer_id', row.stripe_customer_id).maybeSingle()
      userId = data?.user_id ?? null
    }
    if (!userId) {
      console.error('stripe-webhook: evento sem usuário', event.id, event.type)
      return json(null, 200, { received: true, unmatched: true })
    }

    // Um evento antigo de outra assinatura não pode sobrescrever a atual.
    const { data: current } = await db.from('subscriptions').select('stripe_subscription_id, status').eq('user_id', userId).maybeSingle()
    const isOtherSubscription = current?.stripe_subscription_id && current.stripe_subscription_id !== row.stripe_subscription_id
    if (isOtherSubscription && event.type === 'customer.subscription.deleted') {
      return json(null, 200, { received: true, stale: true })
    }

    const { error } = await db.from('subscriptions').upsert({ user_id: userId, ...row }, { onConflict: 'user_id' })
    if (error) throw new Error(error.message)
    return json(null, 200, { received: true })
  } catch (err) {
    console.error('stripe-webhook', event?.id, err)
    // Libera o evento para o Stripe tentar de novo.
    await db.from('stripe_events').delete().eq('id', event.id)
    return json(null, 500, { error: 'processing_error' })
  }
})
