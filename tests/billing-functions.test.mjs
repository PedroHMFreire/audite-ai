// Funções de cobrança rodando no Supabase local, com eventos do Stripe simulados
// e assinados com um segredo de teste. Nenhuma chamada real ao Stripe.
// Exige: supabase functions serve --env-file <arquivo com STRIPE_WEBHOOK_SECRET=whsec_local_test_only>
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { localEnv } from './local-env.mjs'
import { hmacSha256Hex } from '../supabase/functions/_shared/billing-logic.ts'

const env = localEnv()
const SECRET = process.env.WEBHOOK_TEST_SECRET || 'whsec_local_test_only'
const fn = (name) => `${env.API_URL}/functions/v1/${name}`
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, opts)
const stamp = Date.now()
let user, client, token

async function sendEvent(event, { secret = SECRET, ts = Math.floor(Date.now() / 1000) } = {}) {
  const body = JSON.stringify(event)
  const res = await fetch(fn('stripe-webhook'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${ts},v1=${await hmacSha256Hex(secret, `${ts}.${body}`)}` },
    body,
  })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}

const subscription = (over = {}) => ({
  id: `sub_${stamp}`, customer: `cus_${stamp}`, status: 'active', cancel_at_period_end: false,
  current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
  items: { data: [{ price: { id: 'price_test' } }] },
  metadata: { user_id: user.id },
  ...over,
})

const row = async () => (await admin.from('subscriptions').select('*').eq('user_id', user.id).single()).data
const access = async () => (await client.rpc('my_access')).data

before(async () => {
  client = createClient(env.API_URL, env.ANON_KEY, opts)
  const { data, error } = await client.auth.signUp({ email: `bill_${stamp}@example.com`, password: 'Aa1!cobranca-' + stamp })
  assert.ifError(error)
  user = data.user
  token = data.session.access_token
  // Simula um teste já vencido: só a assinatura pode liberar o acesso.
  await admin.from('subscriptions').update({ trial_ends_at: new Date(Date.now() - 86400e3).toISOString() }).eq('user_id', user.id)
})

after(async () => {
  await admin.from('stripe_events').delete().like('id', `evt_${stamp}%`)
  await admin.auth.admin.deleteUser(user.id).catch(() => {})
})

test('checkout exige login', async () => {
  const res = await fetch(fn('stripe-checkout'), { method: 'POST', headers: { apikey: env.ANON_KEY } })
  assert.equal(res.status, 401)
})

test('sem chaves do Stripe, checkout e portal avisam que a cobrança não está configurada', async () => {
  for (const name of ['stripe-checkout', 'stripe-portal']) {
    const res = await fetch(fn(name), { method: 'POST', headers: { apikey: env.ANON_KEY, Authorization: `Bearer ${token}` } })
    assert.equal(res.status, 503, name)
    assert.equal((await res.json()).error, 'billing_not_configured')
  }
})

test('webhook recusa assinatura inválida, evento antigo e método errado', async () => {
  const event = { id: `evt_${stamp}_bad`, type: 'customer.subscription.updated', data: { object: subscription() } }
  assert.equal((await sendEvent(event, { secret: 'whsec_errado' })).status, 400)
  assert.equal((await sendEvent(event, { ts: Math.floor(Date.now() / 1000) - 3600 })).status, 400)
  assert.equal((await fetch(fn('stripe-webhook'))).status, 405)
  assert.equal((await row()).status, 'trialing', 'evento recusado não pode alterar a assinatura')
  assert.equal((await access()).has_access, false)
})

test('assinatura criada libera o acesso', async () => {
  const res = await sendEvent({ id: `evt_${stamp}_1`, type: 'customer.subscription.created', data: { object: subscription() } })
  assert.equal(res.status, 200)
  const r = await row()
  assert.equal(r.status, 'active')
  assert.equal(r.stripe_subscription_id, `sub_${stamp}`)
  assert.equal(r.stripe_customer_id, `cus_${stamp}`)
  assert.equal(r.stripe_price_id, 'price_test')
  const a = await access()
  assert.equal(a.has_access, true)
  assert.equal(a.has_stripe_customer, true)
})

test('evento repetido é ignorado', async () => {
  const res = await sendEvent({ id: `evt_${stamp}_1`, type: 'customer.subscription.created', data: { object: subscription({ status: 'canceled' }) } })
  assert.equal(res.status, 200)
  assert.equal(res.body.duplicate, true)
  assert.equal((await row()).status, 'active')
})

test('eventos de outros tipos são aceitos e ignorados', async () => {
  const res = await sendEvent({ id: `evt_${stamp}_x`, type: 'invoice.created', data: { object: {} } })
  assert.equal(res.status, 200)
  assert.equal(res.body.ignored, true)
})

test('pagamento atrasado mantém o acesso; cancelamento agendado aparece para o usuário', async () => {
  await sendEvent({ id: `evt_${stamp}_2`, type: 'customer.subscription.updated', data: { object: subscription({ status: 'past_due' }) } })
  assert.equal((await access()).has_access, true)
  await sendEvent({ id: `evt_${stamp}_3`, type: 'customer.subscription.updated', data: { object: subscription({ cancel_at_period_end: true }) } })
  const a = await access()
  assert.equal(a.status, 'active')
  assert.equal(a.cancel_at_period_end, true)
})

test('evento sem metadata encontra o usuário pelo cliente do Stripe', async () => {
  const res = await sendEvent({ id: `evt_${stamp}_4`, type: 'customer.subscription.updated', data: { object: subscription({ metadata: {}, status: 'unpaid' }) } })
  assert.equal(res.status, 200)
  assert.equal((await row()).status, 'unpaid')
  assert.equal((await access()).has_access, false)
})

test('assinatura encerrada com período vencido tira o acesso', async () => {
  const res = await sendEvent({
    id: `evt_${stamp}_5`, type: 'customer.subscription.deleted',
    data: { object: subscription({ status: 'canceled', current_period_end: Math.floor(Date.now() / 1000) - 60 }) },
  })
  assert.equal(res.status, 200)
  assert.equal((await row()).status, 'canceled')
  assert.equal((await access()).has_access, false)
})

test('checkout concluído ativa a assinatura pelo client_reference_id', async () => {
  const res = await sendEvent({
    id: `evt_${stamp}_6`, type: 'checkout.session.completed',
    data: { object: { mode: 'subscription', subscription: `sub_${stamp}_novo`, customer: `cus_${stamp}`, client_reference_id: user.id } },
  })
  assert.equal(res.status, 200)
  const r = await row()
  assert.equal(r.status, 'active')
  assert.equal(r.stripe_subscription_id, `sub_${stamp}_novo`)
})

test('encerramento de uma assinatura antiga não derruba a atual', async () => {
  const res = await sendEvent({
    id: `evt_${stamp}_7`, type: 'customer.subscription.deleted',
    data: { object: subscription({ status: 'canceled' }) }, // sub_<stamp>, a antiga
  })
  assert.equal(res.body.stale, true)
  assert.equal((await row()).status, 'active')
})

test('evento de usuário desconhecido não quebra nem cria assinatura', async () => {
  const res = await sendEvent({
    id: `evt_${stamp}_8`, type: 'customer.subscription.updated',
    data: { object: subscription({ id: 'sub_orfa', customer: 'cus_desconhecido', metadata: {} }) },
  })
  assert.equal(res.status, 200)
  assert.equal(res.body.unmatched, true)
})
