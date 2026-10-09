// Captura telas do app (desktop e celular) contra o ambiente local.
// Uso: [SHOT_THEME=dark] node tests/screenshots.mjs <pasta-de-saida> [rota1,rota2,...]
import { chromium, devices } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'
import { localEnv } from './local-env.mjs'

const env = localEnv()
const base = process.env.E2E_BASE_URL || 'http://localhost:5180'
const out = process.argv[2] || 'tests/.shots'
mkdirSync(out, { recursive: true })

const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const email = 'demo@example.com'
const password = 'Aa1!demo-senha'

async function seed() {
  const { data: list } = await admin.auth.admin.listUsers()
  let user = list.users.find((u) => u.email === email)
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { store_name: 'Ateliê Demo', owner_name: 'Marina' },
    })
    if (error) throw error
    user = data.user
  }
  const { data: existing } = await admin.from('counts').select('id').eq('user_id', user.id)
  if (existing.length === 0) {
    const { data: c1 } = await admin.from('counts').insert({ user_id: user.id, nome: 'Balanço de outubro' }).select('id').single()
    const plan = [
      ['7891000100103', 'Vestido midi linho', 4], ['7891000100104', 'Camisa seda off-white', 6],
      ['7891000100105', 'Calça alfaiataria preta', 5], ['7891000100106', 'Blazer lã cinza', 2],
      ['7891000100107', 'Saia plissada', 3],
    ]
    await admin.from('plan_items').insert(plan.map(([codigo, nome, saldo]) => ({ count_id: c1.id, codigo, nome, saldo })))
    await admin.from('manual_entries').insert([
      { count_id: c1.id, codigo: '7891000100103', qty: 4 }, { count_id: c1.id, codigo: '7891000100104', qty: 5 },
      { count_id: c1.id, codigo: '7891000100105', qty: 6 },
    ])
    const { data: c2 } = await admin.from('counts').insert({ user_id: user.id, nome: 'Vitrine — setembro', status: 'finalizada', finished_at: new Date().toISOString() }).select('id').single()
    await admin.from('results').insert([
      { count_id: c2.id, codigo: '7891000100103', status: 'regular', nome_produto: 'Vestido midi linho', manual_qtd: 4, saldo_qtd: 4 },
      { count_id: c2.id, codigo: '7891000100104', status: 'falta', nome_produto: 'Camisa seda off-white', manual_qtd: 5, saldo_qtd: 6 },
      { count_id: c2.id, codigo: '7891000100105', status: 'excesso', nome_produto: 'Calça alfaiataria preta', manual_qtd: 6, saldo_qtd: 5 },
    ])
  }
  const { data: cats } = await admin.from('categories').select('id').eq('user_id', user.id)
  if (cats.length === 0) {
    const names = [['Vestidos', '#8A6A4F'], ['Blusas', '#3F6C8F'], ['Calças', '#3D3B36'], ['Acessórios', '#B7791F']]
    const { data: created } = await admin.from('categories')
      .insert(names.map(([name, color]) => ({ user_id: user.id, name, color, priority: 3 }))).select('id')
    const today = new Date()
    const iso = (offset) => { const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, 12); return d.toISOString().slice(0, 10) }
    const { data: cfg } = await admin.from('schedule_configs').insert({
      user_id: user.id, name: 'Ciclo de demonstração', sectors_per_week: 2, start_date: iso(-7), total_weeks: 4, work_days: [1, 2, 3, 4, 5],
    }).select('id').single()
    await admin.from('schedule_items').insert([-6, -2, 0, 2, 5, 9, 12, 16].map((offset, i) => ({
      config_id: cfg.id, category_id: created[i % created.length].id, scheduled_date: iso(offset),
      week_number: Math.floor(i / 2) + 1, day_of_week: 1, status: i === 0 ? 'completed' : 'pending',
    })))
  }
  const { data: counts } = await admin.from('counts').select('id,status').eq('user_id', user.id)
  return {
    open: counts.find((c) => c.status !== 'finalizada')?.id,
    done: counts.find((c) => c.status === 'finalizada')?.id,
  }
}

const ids = await seed()
const publicRoutes = ['/', '/login', '/cadastro', '/recuperar-senha', '/termos', '/privacidade']
const privateRoutes = ['/dashboard', '/contagens', `/contagens/${ids.open}`, `/relatorio/${ids.done}`, '/categorias', '/cronograma', '/conta', '/assinatura', '/catalogo', '/ajuda']
const only = process.argv[3]?.split(',')
// Tema das capturas: SHOT_THEME=dark para a versão escura.
const theme = process.env.SHOT_THEME === 'dark' ? 'dark' : 'light'

const browser = await chromium.launch()
for (const [label, ctxOpts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['mobile', devices['iPhone 13']]]) {
  const ctx = await browser.newContext({ ...ctxOpts, locale: 'pt-BR', colorScheme: theme })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const shoot = async (route) => {
    if (only && !only.includes(route)) return
    await page.goto(base + route, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(700)
    const name = route === '/' ? 'landing' : route.replace(/^\//, '').replace(/\/[0-9a-f-]{36}/, '-id').replace(/\//g, '-')
    await page.screenshot({ path: `${out}/${label}-${name}.png`, fullPage: true })
  }
  for (const r of publicRoutes) await shoot(r)
  await page.goto(base + '/login', { waitUntil: 'networkidle' })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/dashboard|inicio|contagens/, { timeout: 15000 }).catch(() => errors.push('login não redirecionou'))
  for (const r of privateRoutes) await shoot(r)
  if (errors.length) console.log(`[${label}] erros:\n  ` + [...new Set(errors)].slice(0, 15).join('\n  '))
  await ctx.close()
}
await browser.close()
console.log('ok ->', out)
