// Cadastro com confirmação de e-mail ligada (o padrão do Supabase em produção).
// Verificação avulsa: exige `enable_confirmations = true` em supabase/config.toml
// ([auth.email]) e `supabase stop && supabase start`. Os testes de `npm run test:e2e`
// usam o modo sem confirmação.
import { chromium, devices } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import { localEnv } from '../local-env.mjs'
const env = localEnv(); const base = 'http://localhost:4180'
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const email = `conf_${Date.now()}@example.com`
const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'pt-BR' }); const page = await ctx.newPage()
const errors = []; page.on('pageerror', e => errors.push(e.message))
await page.goto(base + '/cadastro')
await page.getByLabel('Nome da loja').fill('Loja Confirmação'); await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill('senha-segura-1')
await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Criar conta grátis' }).click()
await page.getByRole('heading', { name: 'Confirme seu e-mail' }).waitFor(); console.log('1 ok: tela de confirmação')
// antes de confirmar, o login explica o que falta
await page.goto(base + '/login'); await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill('senha-segura-1'); await page.getByRole('button', { name: 'Entrar' }).click()
await page.getByRole('alert').filter({ hasText: 'Confirme seu e-mail antes de entrar' }).waitFor(); console.log('2 ok: login avisa que falta confirmar')
// cadastrar de novo o mesmo e-mail não revela nem quebra
await page.goto(base + '/cadastro')
await page.getByLabel('Nome da loja').fill('Outra'); await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill('senha-segura-1')
await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Criar conta grátis' }).click()
await page.waitForTimeout(1500); console.log('3 repetido →', (await page.locator('main').innerText()).split('\n').slice(0, 2).join(' | '))
let link
for (let i = 0; i < 20 && !link; i++) {
  const list = await fetch(`${env.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent('to:' + email)}`).then(r => r.json())
  const id = list.messages?.at(-1)?.ID
  if (id) { const m = await fetch(`${env.MAILPIT_URL}/api/v1/message/${id}`).then(r => r.json()); link = (m.HTML || m.Text).match(/https?:\/\/[^\s"'<>]+verify[^\s"'<>]+/)?.[0]?.replace(/&amp;/g, '&') }
  if (!link) await new Promise(r => setTimeout(r, 500))
}
assert.ok(link, 'e-mail de confirmação não chegou')
await page.goto(link); await page.waitForURL(/\/dashboard/, { timeout: 15000 })
await page.getByText('Loja Confirmação').waitFor(); await page.getByRole('link', { name: '7 dias de teste' }).waitFor(); console.log('4 ok: link do e-mail entra direto no app, em teste de 7 dias')
await page.getByLabel('Nova contagem').fill('Primeira'); await page.getByRole('button', { name: 'Começar' }).click(); await page.waitForURL(/contagens\/[0-9a-f-]{36}$/); console.log('5 ok: cria contagem')
assert.deepEqual(errors, [])
const { data } = await admin.auth.admin.listUsers({ perPage: 1000 }); const u = data.users.find(x => x.email === email); if (u) await admin.auth.admin.deleteUser(u.id)
await b.close(); console.log('TUDO OK')
