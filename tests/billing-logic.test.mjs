// Lógica pura da cobrança (assinatura do webhook e mapeamento do Stripe).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allowedOrigin, hmacSha256Hex, subscriptionToRow, toFormBody, verifyStripeSignature } from '../supabase/functions/_shared/billing-logic.ts'

const secret = 'whsec_teste'
const payload = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' })
const now = 1_800_000_000
const sign = async (ts, body = payload, key = secret) => `t=${ts},v1=${await hmacSha256Hex(key, `${ts}.${body}`)}`

test('aceita assinatura válida e recente', async () => {
  assert.equal(await verifyStripeSignature(payload, await sign(now), secret, 300, now), true)
})

test('recusa corpo adulterado', async () => {
  assert.equal(await verifyStripeSignature(payload + ' ', await sign(now), secret, 300, now), false)
})

test('recusa segredo errado', async () => {
  assert.equal(await verifyStripeSignature(payload, await sign(now, payload, 'outro'), secret, 300, now), false)
})

test('recusa evento antigo (replay)', async () => {
  assert.equal(await verifyStripeSignature(payload, await sign(now - 301), secret, 300, now), false)
})

test('recusa cabeçalho ausente ou malformado', async () => {
  assert.equal(await verifyStripeSignature(payload, null, secret, 300, now), false)
  assert.equal(await verifyStripeSignature(payload, 'v1=abc', secret, 300, now), false)
  assert.equal(await verifyStripeSignature(payload, `t=${now}`, secret, 300, now), false)
  assert.equal(await verifyStripeSignature(payload, await sign(now), '', 300, now), false)
})

test('aceita quando há mais de uma assinatura v1 (rotação de segredo)', async () => {
  const good = (await sign(now)).split('v1=')[1]
  assert.equal(await verifyStripeSignature(payload, `t=${now},v1=${'0'.repeat(64)},v1=${good}`, secret, 300, now), true)
})

test('mapeia assinatura ativa (período no nível da assinatura)', () => {
  const row = subscriptionToRow({
    id: 'sub_1', customer: 'cus_1', status: 'active', cancel_at_period_end: false,
    current_period_end: 1_800_086_400, items: { data: [{ price: { id: 'price_1' } }] },
  })
  assert.deepEqual(row, {
    status: 'active', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', stripe_price_id: 'price_1',
    current_period_end: new Date(1_800_086_400 * 1000).toISOString(), cancel_at_period_end: false,
  })
})

test('mapeia assinatura com período no item (API recente) e cancelamento agendado', () => {
  const row = subscriptionToRow({
    id: 'sub_2', customer: { id: 'cus_2' }, status: 'active', cancel_at: 1_800_100_000,
    items: { data: [{ current_period_end: 1_800_100_000, price: { id: 'price_2' } }] },
  })
  assert.equal(row.stripe_customer_id, 'cus_2')
  assert.equal(row.current_period_end, new Date(1_800_100_000 * 1000).toISOString())
  assert.equal(row.cancel_at_period_end, true)
})

test('status desconhecido nunca libera acesso', () => {
  assert.equal(subscriptionToRow({ id: 'sub_3', status: 'algo_novo' }).status, 'incomplete')
  assert.equal(subscriptionToRow({}).status, 'incomplete')
})

test('teste do Stripe grava o fim do período de teste', () => {
  const row = subscriptionToRow({ id: 'sub_4', status: 'trialing', trial_end: 1_800_050_000 })
  assert.equal(row.trial_ends_at, new Date(1_800_050_000 * 1000).toISOString())
})

test('corpo de formulário no formato do Stripe', () => {
  const body = toFormBody({
    mode: 'subscription', line_items: [{ price: 'price_1', quantity: 1 }],
    subscription_data: { metadata: { user_id: 'u1' } }, skip: undefined,
  })
  assert.equal(decodeURIComponent(body),
    'mode=subscription&line_items[0][price]=price_1&line_items[0][quantity]=1&subscription_data[metadata][user_id]=u1')
})

test('CORS: só o próprio site e o ambiente local', () => {
  const site = 'https://app.exemplo.com'
  assert.equal(allowedOrigin(site, site), site)
  assert.equal(allowedOrigin('http://localhost:5173', site), 'http://localhost:5173')
  assert.equal(allowedOrigin('https://site-malicioso.example', site), site)
  assert.equal(allowedOrigin('https://app.exemplo.com.malicioso.example', site), site)
  assert.equal(allowedOrigin(null, site), site)
  assert.equal(allowedOrigin('https://qualquer.example', ''), 'null')
  assert.equal(allowedOrigin('', ''), 'null')
})
