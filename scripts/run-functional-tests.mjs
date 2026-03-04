import { chromium } from 'playwright'

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'
const timeout = 20000

const results = []

function record(name, ok, details = '') {
  results.push({ name, ok, details })
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const email = `e2e_${Date.now()}@example.com`
  const password = 'Aa1!aaaa'

  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout })
    await page.waitForTimeout(500)
    const landingOk = await page.locator('text=AUDITE.AI').first().isVisible().catch(() => false)
    record('Landing page carrega', landingOk)

    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout })
    await page.waitForTimeout(600)
    const redirectedToLogin = page.url().includes('/login')
    record('Rota privada redireciona para login', redirectedToLogin, page.url())

    await page.goto(`${baseUrl}/trial-signup`, { waitUntil: 'domcontentloaded', timeout })
    await page.getByLabel('Nome do proprietário *').fill('Usuario E2E')
    await page.getByLabel('Nome da loja *').fill('Loja E2E')
    await page.getByLabel('Email *').fill(email)
    await page.getByLabel('Telefone').fill('11999999999')
    await page.getByLabel('Senha *').fill(password)
    await page.getByLabel('Confirmar senha *').fill(password)
    await page.getByRole('button', { name: 'Iniciar Teste Gratuito' }).click()
    await page.waitForTimeout(2500)
    const signupForwarded = page.url().includes('/trial-welcome')
    record('Trial signup redireciona para /trial-welcome', signupForwarded, page.url())

    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout })
    await page.getByPlaceholder('E-mail').fill(email)
    await page.getByPlaceholder('Senha').fill(password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForTimeout(3000)

    const loggedInDashboard = page.url().includes('/dashboard')
    const loginErrorVisible = await page.locator('text=Falha na autenticação').first().isVisible().catch(() => false)
    record(
      'Login com conta criada',
      loggedInDashboard,
      loggedInDashboard ? 'ok' : (loginErrorVisible ? 'falha autenticacao no UI' : page.url())
    )

    await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded', timeout })
    await page.waitForTimeout(1500)
    const denied = await page.locator('text=Acesso negado').first().isVisible().catch(() => false)
    const backToLogin = page.url().includes('/login')
    record(
      'Acesso admin bloqueado para não-admin',
      denied || backToLogin,
      denied ? 'access denied ui' : page.url()
    )

    await page.goto(`${baseUrl}/categorias`, { waitUntil: 'domcontentloaded', timeout })
    await page.waitForTimeout(1000)
    const categoriesOpened = page.url().includes('/categorias')
    record('Rota autenticada /categorias abre', categoriesOpened, page.url())

    await page.goto(`${baseUrl}/cronograma`, { waitUntil: 'domcontentloaded', timeout })
    await page.waitForTimeout(1000)
    const scheduleOpened = page.url().includes('/cronograma')
    record('Rota autenticada /cronograma abre', scheduleOpened, page.url())

    await page.goto(`${baseUrl}/calendario`, { waitUntil: 'domcontentloaded', timeout })
    await page.waitForTimeout(1000)
    const calendarOpened = page.url().includes('/calendario')
    record('Rota autenticada /calendario abre', calendarOpened, page.url())
  } catch (err) {
    record('Execução geral', false, err instanceof Error ? err.message : String(err))
  } finally {
    await context.close()
    await browser.close()
  }

  const passed = results.filter((r) => r.ok).length
  const failed = results.length - passed

  console.log('FUNCTIONAL_TEST_RESULTS_START')
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.name}${r.details ? ` | ${r.details}` : ''}`)
  }
  console.log(`SUMMARY | total=${results.length} passed=${passed} failed=${failed}`)
  console.log('FUNCTIONAL_TEST_RESULTS_END')

  if (failed > 0) process.exit(1)
}

run()
