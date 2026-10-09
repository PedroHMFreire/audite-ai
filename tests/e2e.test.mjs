// Teste ponta a ponta no navegador (celular), contra o build de produção
// servido com os cabeçalhos de segurança do deploy e o Supabase local.
//
// Preparação:
//   supabase start
//   supabase functions serve --env-file <arquivo com STRIPE_WEBHOOK_SECRET e SITE_URL>
//   npx vite build --mode localdb --outDir dist-e2e
//   node tests/serve-dist.mjs dist-e2e 4180
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium, devices } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { localEnv } from './local-env.mjs'

const env = localEnv()
const base = process.env.E2E_BASE_URL || 'http://localhost:4180'
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const stamp = Date.now()
const email = `e2e_${stamp}@example.com`
const password = 'senha-segura-1'
const newPassword = 'outra-senha-2'
const tmp = mkdtempSync(path.join(tmpdir(), 'audite-e2e-'))

let browser, ctx, page, userId
const problems = []

async function userIdByEmail() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return data.users.find((u) => u.email === email)?.id
}

async function makePlanXlsx() {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Estoque')
  ws.addRow(['Código', 'Produto', 'Saldo'])
  ws.addRow([7891000100103, 'Vestido midi linho', 4])       // código numérico, como o Excel grava EAN
  ws.addRow(['VEST.002/P', 'Camisa seda off-white', 6])     // código com ponto e barra
  ws.addRow(['REF 300-A', "Calça d'alfaiataria", 5])        // espaço e apóstrofo
  ws.addRow(['400', 'Blazer lã cinza', 2])
  const file = path.join(tmp, 'estoque.xlsx')
  await wb.xlsx.writeFile(file)
  return file
}

async function addCode(code, qty) {
  await page.getByLabel('Código do produto').fill(code)
  if (qty) await page.getByLabel('Quantidade').fill(String(qty))
  await page.getByLabel('Código do produto').press('Enter')
  await page.waitForTimeout(250)
}

async function lastEmailLink(to) {
  for (let i = 0; i < 20; i++) {
    const list = await fetch(`${env.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent('to:' + to)}`).then((r) => r.json())
    const id = list.messages?.[0]?.ID
    if (id) {
      const msg = await fetch(`${env.MAILPIT_URL}/api/v1/message/${id}`).then((r) => r.json())
      const link = (msg.HTML || msg.Text || '').match(/https?:\/\/[^\s"'<>]+verify[^\s"'<>]+/)?.[0]
      if (link) return link.replace(/&amp;/g, '&')
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('e-mail não chegou')
}

before(async () => {
  browser = await chromium.launch()
  ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', acceptDownloads: true })
  page = await ctx.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', (e) => problems.push(`erro de página: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const text = m.text()
    // Respostas 4xx esperadas (login errado, cobrança não configurada) aparecem como erro de rede no console.
    if (/Failed to load resource/.test(text)) return
    problems.push(`console: ${text}`)
  })
})

after(async () => {
  await browser?.close()
  const id = userId || (await userIdByEmail())
  if (id) await admin.auth.admin.deleteUser(id).catch(() => {})
})

test('landing: carrega, não promete o que não existe e leva ao cadastro', async () => {
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await assert.doesNotReject(page.getByRole('heading', { level: 1, name: /Saiba exatamente/ }).waitFor())
  const text = await page.locator('body').innerText()
  for (const banned of ['500 lojas', '24/7', 'API de integração', 'depoimento']) {
    assert.ok(!text.includes(banned), `landing ainda cita "${banned}"`)
  }
  await page.getByRole('link', { name: /Testar grátis/ }).first().click()
  await page.waitForURL('**/cadastro')
})

test('rotas privadas pedem login; termos e privacidade existem', async () => {
  await page.goto(base + '/contagens')
  await page.waitForURL('**/login')
  for (const [route, title] of [['/termos', 'Termos de uso'], ['/privacidade', 'Política de privacidade']]) {
    await page.goto(base + route)
    await page.getByRole('heading', { level: 1, name: title }).waitFor()
  }
})

test('cadastro: valida os campos e cria a conta em teste de 7 dias', async () => {
  await page.goto(base + '/cadastro')
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()
  await page.getByRole('alert').filter({ hasText: 'nome da loja' }).waitFor()

  await page.getByLabel('Nome da loja').fill("Ateliê d'Ana / Centro")
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('curta')
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()
  await page.getByRole('alert').filter({ hasText: '8 caracteres' }).waitFor()

  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()
  await page.getByRole('alert').filter({ hasText: 'aceite os termos' }).waitFor()

  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()
  await page.waitForURL('**/dashboard')
  // O nome com apóstrofo e barra aparece como foi digitado (sem "&#x27;").
  await page.getByText("Ateliê d'Ana / Centro", { exact: false }).waitFor()
  await page.getByRole('link', { name: '7 dias de teste' }).waitFor()
  userId = await userIdByEmail()
  assert.ok(userId)
})

test('contagem: cria, importa a planilha .xlsx e bipa os códigos', async () => {
  await page.getByLabel('Nova contagem').fill('Balanço de teste')
  await page.getByRole('button', { name: 'Começar' }).click()
  await page.waitForURL(/\/contagens\/[0-9a-f-]{36}$/)
  await page.getByRole('heading', { level: 1, name: 'Balanço de teste' }).waitFor()

  await page.locator('input[type="file"]').setInputFiles(await makePlanXlsx())
  await page.getByText('Planilha carregada · 4 produtos').waitFor()

  await addCode('7891000100103', 4)   // certo
  await addCode('VEST.002/P', 5)      // falta 1
  await addCode('ref 300-a', 3)       // maiúsculas/minúsculas: reconhece o código da planilha
  await addCode('REF 300-A', 3)       // soma → 6, sobra 1
  // "400" fica sem contar → falta 2

  await page.getByText('Itens contados (3)').waitFor()
  const body = await page.locator('main').innerText()
  assert.match(body, /3\s*\/\s*4/)
  assert.ok(body.includes("Calça d'alfaiataria"), 'nome com apóstrofo deve aparecer intacto')
})

test('contagem: desfazer e remover item', async () => {
  await addCode('400', 1)
  await page.getByText('Itens contados (4)').waitFor()
  await page.getByRole('button', { name: 'Desfazer último' }).click()
  await page.getByText('Itens contados (3)').waitFor()

  await addCode('NAO-EXISTE-1', 1)
  await page.getByText('Itens contados (4)').waitFor()
  await page.getByRole('button', { name: 'Remover NAO-EXISTE-1' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remover' }).click()
  await page.getByText('Itens contados (3)').waitFor()
})

test('os dados sobrevivem a recarregar a página', async () => {
  await page.waitForTimeout(1800) // reconciliação com o servidor
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByText('Itens contados (3)').waitFor()
  await page.getByText('Tudo salvo').waitFor()
})

test('finalizar: confirma, mostra o relatório com as divergências certas', async () => {
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await dialog.getByText('entrará no relatório como falta').waitFor()
  await dialog.getByRole('button', { name: 'Finalizar' }).click()
  await page.waitForURL(/\/relatorio\//)

  await page.getByRole('tab', { name: /Faltas\s*2/ }).waitFor()
  await page.getByRole('tab', { name: /Sobras\s*1/ }).waitFor()
  await page.getByRole('tab', { name: /Certos\s*1/ }).waitFor()
  // Faltas: VEST.002/P (5 de 6) e 400 (0 de 2) = 3 peças
  const stats = await page.locator('dl').first().innerText()
  assert.match(stats, /Faltas\s*2\s*3 peças/)
  assert.match(stats, /Sobras\s*1\s*1 peça\b/)
  await page.getByText('Falta 2').waitFor()
  await page.getByText('Falta 1').waitFor()
})

test('relatório: anota motivo e exporta PDF e Excel', async () => {
  await page.getByLabel('Motivo da divergência de 400').selectOption('codigo_errado')
  await page.getByText('1 divergência sem motivo anotado').waitFor()

  for (const [name, ext, min] of [['PDF', '.pdf', 1500], ['Excel', '.xlsx', 3000]]) {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name })].map((p, i) => (i === 1 ? p.click() : p)))
    assert.ok(download.suggestedFilename().endsWith(ext), download.suggestedFilename())
    const file = path.join(tmp, download.suggestedFilename())
    await download.saveAs(file)
    assert.ok(statSync(file).size > min, `${name} vazio`)
    if (ext === '.xlsx') {
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.readFile(file)
      const rows = []
      wb.getWorksheet('Produtos').eachRow((r) => rows.push(r.values.slice(1)))
      assert.deepEqual(rows[0], ['Situação', 'Código', 'Produto', 'Sistema', 'Contado', 'Diferença', 'Motivo'])
      const falta400 = rows.find((r) => r[1] === '400')
      assert.deepEqual(falta400, ['Falta', '400', 'Blazer lã cinza', 2, 0, -2, 'Código errado'])
      assert.equal(rows.find((r) => r[1] === '7891000100103')[0], 'Certo')
    }
  }
})

test('reabrir a contagem, corrigir e finalizar de novo mantém o motivo anotado', async () => {
  await page.getByRole('button', { name: 'Reabrir contagem' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reabrir' }).click()
  await page.waitForURL(/\/contagens\/[0-9a-f-]{36}$/)
  await addCode('VEST.002/P', 1) // agora 6 de 6
  await page.waitForTimeout(1800)
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Finalizar' }).click()
  await page.waitForURL(/\/relatorio\//)
  await page.getByRole('tab', { name: /Faltas\s*1/ }).waitFor()
  await page.getByRole('tab', { name: /Certos\s*2/ }).waitFor()
  assert.equal(await page.getByLabel('Motivo da divergência de 400').inputValue(), 'codigo_errado')
})

test('lista de contagens: busca, renomear, arquivar e restaurar', async () => {
  await page.goto(base + '/contagens', { waitUntil: 'networkidle' })
  await page.getByText('Balanço de teste').waitFor()
  await page.getByLabel('Buscar contagem pelo nome').fill('nada com esse nome')
  await page.getByText('Nenhuma contagem com esse nome').waitFor()
  await page.getByLabel('Buscar contagem pelo nome').fill('')
  await page.getByText('Balanço de teste').waitFor()

  await page.getByRole('button', { name: 'Mais opções para Balanço de teste' }).click()
  await page.getByRole('menuitem', { name: 'Renomear' }).click()
  await page.getByLabel('Novo nome da contagem').fill('Balanço renomeado')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await page.getByText('Balanço renomeado').waitFor()

  await page.getByRole('button', { name: 'Mais opções para Balanço renomeado' }).click()
  await page.getByRole('menuitem', { name: 'Arquivar' }).click()
  await page.getByText('Você ainda não fez nenhuma contagem').waitFor()
  await page.getByRole('tab', { name: 'Arquivadas' }).click()
  await page.getByRole('button', { name: 'Mais opções para Balanço renomeado' }).click()
  await page.getByRole('menuitem', { name: 'Restaurar' }).click()
  await page.getByRole('tab', { name: 'Finalizadas' }).click()
  await page.getByText('Balanço renomeado').waitFor()
})

test('cronograma: categorias, gerar e iniciar uma contagem pelo calendário', async () => {
  await page.goto(base + '/cronograma', { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Cadastrar categorias' }).click()
  await page.waitForURL('**/categorias')
  for (const name of ['Vestidos', 'Blusas', 'Calças']) {
    await page.getByRole('button', { name: `+ ${name}` }).click()
    await page.getByRole('listitem').filter({ hasText: name }).first().waitFor()
  }
  await page.getByRole('button', { name: 'Nova' }).click()
  await page.getByLabel('Nome da categoria').fill('Bijuterias & Lenços')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await page.getByText('Bijuterias & Lenços').waitFor()

  await page.getByRole('link', { name: 'Calendário' }).click()
  await page.getByRole('button', { name: 'Novo cronograma' }).click()
  await page.getByPlaceholder('Ex.: Ciclo de outubro').fill('Ciclo de teste')
  // Começa hoje, para haver itens no mês exibido.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  await page.locator('input[type="date"]').fill(today)
  await page.getByRole('button', { name: 'Gerar cronograma' }).click()
  await page.getByText('Cronograma criado').waitFor()

  const { data: items } = await admin.from('schedule_items').select('scheduled_date, day_of_week, schedule_configs!inner(user_id)')
    .eq('schedule_configs.user_id', userId).is('archived_at', null)
  assert.equal(items.length, 16, '4 categorias por semana × 4 semanas')
  for (const it of items) {
    // A data gravada cai no dia da semana pedido (1 = segunda … 7 = domingo).
    const dow = new Date(it.scheduled_date + 'T12:00:00').getDay() || 7
    assert.equal(dow, it.day_of_week, `data ${it.scheduled_date} não bate com o dia ${it.day_of_week}`)
  }

  const first = page.locator('section[aria-label="Calendário de contagens"] ul button').first()
  await first.click()
  await page.getByRole('dialog').getByRole('button', { name: 'Começar contagem' }).click()
  await page.waitForURL(/\/contagens\/[0-9a-f-]{36}$/)
})

test('conta: altera dados da loja e baixa os próprios dados', async () => {
  await page.goto(base + '/conta', { waitUntil: 'networkidle' })
  await page.getByLabel('Nome da loja').fill('Ateliê Renomeado')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByText('Dados salvos').waitFor()
  const { data } = await admin.from('user_profiles').select('store_name').eq('id', userId).single()
  assert.equal(data.store_name, 'Ateliê Renomeado')

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar meus dados' }).click()])
  const file = path.join(tmp, 'dados.json')
  await download.saveAs(file)
  const dump = JSON.parse((await import('node:fs')).readFileSync(file, 'utf8'))
  assert.equal(dump.conta.email, email)
  assert.equal(dump.counts.length, 2)
  assert.ok(dump.results.length >= 4)
})

test('teste vencido: consulta liberada, criação bloqueada, assinatura avisa que ainda não está disponível', async () => {
  await admin.from('subscriptions').update({ trial_ends_at: new Date(Date.now() - 3600e3).toISOString() }).eq('user_id', userId)
  await page.goto(base + '/dashboard', { waitUntil: 'networkidle' })
  await page.getByText('Seu período de teste terminou').waitFor()
  assert.equal(await page.getByLabel('Nova contagem').count(), 0)
  await page.getByRole('link', { name: 'Teste encerrado' }).waitFor()

  // Relatório antigo continua acessível; reabrir não é oferecido.
  await page.goto(base + '/contagens', { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: 'Finalizadas' }).click()
  await page.getByText('Balanço renomeado').click()
  await page.waitForURL(/\/relatorio\//)
  await page.getByRole('button', { name: 'PDF' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Reabrir contagem' }).count(), 0)

  await page.goto(base + '/assinatura', { waitUntil: 'networkidle' })
  await page.getByText('Seu período de teste terminou').waitFor()
  await page.getByRole('button', { name: /Assinar por/ }).click()
  await page.getByText('A assinatura online estará disponível em breve').waitFor()
})

test('assinatura ativa (via webhook simulado) libera de novo', async () => {
  await admin.from('subscriptions').update({
    status: 'active', current_period_end: new Date(Date.now() + 30 * 86400e3).toISOString(), stripe_customer_id: `cus_e2e_${stamp}`, stripe_subscription_id: `sub_e2e_${stamp}`,
  }).eq('user_id', userId)
  await page.goto(base + '/assinatura', { waitUntil: 'networkidle' })
  await page.getByText('Assinatura ativa. Próxima cobrança em').waitFor()
  await page.getByRole('button', { name: 'Gerenciar pagamento' }).waitFor()
  await page.goto(base + '/dashboard', { waitUntil: 'networkidle' })
  await page.getByLabel('Nova contagem').waitFor()
})

test('sair, errar a senha, recuperar por e-mail e entrar com a nova', async () => {
  await page.goto(base + '/conta', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Sair' }).click()
  await page.waitForURL('**/login')

  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-errada-9')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('alert').filter({ hasText: 'E-mail ou senha incorretos' }).waitFor()

  await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
  await page.getByLabel('E-mail').fill(email)
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await page.getByRole('heading', { name: 'Verifique seu e-mail' }).waitFor()

  await page.goto(await lastEmailLink(email))
  await page.waitForURL('**/redefinir-senha**')
  await page.getByLabel('Nova senha').fill(newPassword)
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await page.waitForURL('**/dashboard')

  await page.goto(base + '/conta', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Sair' }).click()
  await page.waitForURL('**/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(newPassword)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/dashboard')
})

test('link de recuperação inválido mostra o caminho de volta', async () => {
  const other = await ctx.newPage()
  await other.goto(base + '/redefinir-senha')
  // Sem sessão de recuperação: mas este contexto está logado, então a tela permite trocar a senha.
  await other.getByRole('heading', { name: /Nova senha|Link inválido/ }).waitFor()
  await other.close()
  const clean = await browser.newContext({ ...devices['Pixel 7'], locale: 'pt-BR' })
  const p = await clean.newPage()
  await p.goto(base + '/redefinir-senha')
  await p.getByRole('heading', { name: 'Link inválido ou expirado' }).waitFor({ timeout: 10000 })
  await clean.close()
})

test('excluir conta: com assinatura ativa pede para cancelar antes; depois apaga tudo', async () => {
  await page.goto(base + '/conta', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Excluir conta' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir tudo' }).click()
  await page.getByText('Cancele sua assinatura antes de excluir a conta').waitFor()

  await admin.from('subscriptions').update({ status: 'canceled', current_period_end: new Date(Date.now() - 60e3).toISOString() }).eq('user_id', userId)
  await page.getByRole('button', { name: 'Excluir conta' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir tudo' }).click()
  await page.waitForURL(base + '/')
  const { data: counts } = await admin.from('counts').select('id').eq('user_id', userId)
  assert.equal(counts.length, 0)
  const { data: u } = await admin.auth.admin.getUserById(userId)
  assert.equal(u.user, null)
  userId = null
})

test('nenhum erro de JavaScript nem violação da política de segurança durante o uso', () => {
  assert.deepEqual(problems, [])
})
