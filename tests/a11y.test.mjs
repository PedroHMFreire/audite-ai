// Acessibilidade: nenhuma violação séria ou crítica (axe-core, WCAG 2.1 A/AA)
// nas telas principais, em tamanho de celular. A11Y_THEME=dark confere o tema escuro.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'
import { createClient } from '@supabase/supabase-js'
import { localEnv } from './local-env.mjs'

const env = localEnv()
const base = process.env.E2E_BASE_URL || 'http://localhost:4180'
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const email = `a11y_${Date.now()}@example.com`
const password = 'senha-segura-1'
let browser, page, userId, openId, doneId

before(async () => {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { store_name: 'Loja Teste' } })
  assert.ifError(error)
  userId = data.user.id
  const open = await admin.from('counts').insert({ user_id: userId, nome: 'Aberta' }).select('id').single()
  const done = await admin.from('counts').insert({ user_id: userId, nome: 'Fechada', status: 'finalizada', finished_at: new Date().toISOString() }).select('id').single()
  openId = open.data.id
  doneId = done.data.id
  await admin.from('plan_items').insert([{ count_id: openId, codigo: '1', nome: 'Vestido', saldo: 2 }, { count_id: openId, codigo: '2', nome: 'Saia', saldo: 1 }])
  await admin.from('manual_entries').insert({ count_id: openId, codigo: '1', qty: 1 })
  await admin.from('results').insert([
    { count_id: doneId, codigo: '1', status: 'falta', nome_produto: 'Vestido', manual_qtd: 1, saldo_qtd: 2 },
    { count_id: doneId, codigo: '2', status: 'regular', nome_produto: 'Saia', manual_qtd: 1, saldo_qtd: 1 },
  ])
  const cat = await admin.from('categories').insert({ user_id: userId, name: 'Vestidos', color: '#8A6A4F' }).select('id').single()
  const cfg = await admin.from('schedule_configs').insert({ user_id: userId, name: 'Ciclo', sectors_per_week: 1, start_date: new Date().toISOString().slice(0, 10) }).select('id').single()
  await admin.from('schedule_items').insert({ config_id: cfg.data.id, category_id: cat.data.id, scheduled_date: new Date().toISOString().slice(0, 10), week_number: 1, day_of_week: 1 })

  browser = await chromium.launch()
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'pt-BR', colorScheme: process.env.A11Y_THEME === 'dark' ? 'dark' : 'light' })
  page = await ctx.newPage()
})

after(async () => {
  await browser?.close()
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {})
})

async function check(route) {
  await page.goto(base + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  assert.deepEqual(
    serious.map((v) => `${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`),
    [],
    `violações em ${route}`,
  )
}

for (const route of ['/', '/cadastro', '/login', '/recuperar-senha', '/termos', '/privacidade']) {
  test(`pública ${route}`, () => check(route))
}

test('entra', async () => {
  await page.goto(base + '/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/dashboard')
})

test('app /dashboard', () => check('/dashboard'))
test('app /contagens', () => check('/contagens'))
test('app contagem aberta', () => check(`/contagens/${openId}`))
test('app relatório', () => check(`/relatorio/${doneId}`))
test('app /cronograma', () => check('/cronograma'))
test('app /categorias', () => check('/categorias'))
test('app /conta', () => check('/conta'))
test('app /assinatura', () => check('/assinatura'))
test('app /catalogo', () => check('/catalogo'))
test('app /ajuda', () => check('/ajuda'))
