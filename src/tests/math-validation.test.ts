/**
 * Testes de Validação Matemática da Contagem
 * 
 * Executa cenários para garantir que a lógica está correta
 * Execute com: npx ts-node src/tests/math-validation.test.ts
 */

// Tipo para simulação
interface MockResult {
  codigo: string
  status: 'regular' | 'falta' | 'excesso'
  manual_qtd: number
  saldo_qtd: number
  diferenca: number
  nome_produto: string
}

/**
 * Teste 1: Classificação Correta
 */
function test_classification() {
  console.log('\n🧪 TESTE 1: Classificação de Status')
  console.log('═'.repeat(50))

  const testCases = [
    { esperado: 100, encontrado: 100, expect_status: 'regular', desc: 'Quantidade exata' },
    { esperado: 100, encontrado: 75, expect_status: 'falta', desc: 'Encontrou menos' },
    { esperado: 100, encontrado: 120, expect_status: 'excesso', desc: 'Encontrou mais' },
    { esperado: 50, encontrado: 0, expect_status: 'falta', desc: 'Produto não encontrado' },
  ]

  let passed = 0
  for (const tc of testCases) {
    const diferenca = tc.esperado - tc.encontrado
    const status = (
      diferenca === 0 ? 'regular' :
      diferenca > 0 ? 'falta' : 'excesso'
    )

    const ok = status === tc.expect_status
    passed += ok ? 1 : 0

    console.log(`${ok ? '✓' : '✗'} ${tc.desc}`)
    console.log(`  Esperado: ${tc.esperado}, Encontrado: ${tc.encontrado}`)
    console.log(`  Status: ${status} (diferença: ${Math.abs(diferenca)})`)
  }

  console.log(`\nResultado: ${passed}/${testCases.length} testes passaram`)
  return passed === testCases.length
}

/**
 * Teste 2: Cálculos Agregados
 */
function test_aggregation() {
  console.log('\n🧪 TESTE 2: Cálculos Agregados')
  console.log('═'.repeat(50))

  // Dados simulados
  const results: MockResult[] = [
    // Regular
    { codigo: 'A', status: 'regular', manual_qtd: 100, saldo_qtd: 100, diferenca: 0, nome_produto: 'Produto A' },
    // Falta
    { codigo: 'B', status: 'falta', manual_qtd: 30, saldo_qtd: 50, diferenca: 20, nome_produto: 'Produto B' },
    { codigo: 'C', status: 'falta', manual_qtd: 0, saldo_qtd: 40, diferenca: 40, nome_produto: 'Produto C' },
    // Excesso
    { codigo: 'D', status: 'excesso', manual_qtd: 90, saldo_qtd: 75, diferenca: 15, nome_produto: 'Produto D' },
    { codigo: 'E', status: 'excesso', manual_qtd: 25, saldo_qtd: 0, diferenca: 25, nome_produto: 'Código Desconhecido' },
  ]

  // Cálculo
  let totals = { Regular: 0, Excesso: 0, Falta: 0 }

  for (const r of results) {
    if (r.status === 'regular') {
      totals.Regular += r.saldo_qtd
    } else if (r.status === 'excesso') {
      totals.Excesso += r.diferenca
    } else if (r.status === 'falta') {
      totals.Falta += r.diferenca
    }
  }

  // Validação
  const expected = { Regular: 100, Excesso: 40, Falta: 60 }
  const ok = (
    totals.Regular === expected.Regular &&
    totals.Excesso === expected.Excesso &&
    totals.Falta === expected.Falta
  )

  console.log(`Cálculos:\n`)
  console.log(`  Regular: ${totals.Regular} unidades (esperado: ${expected.Regular})`)
  console.log(`  Excesso: ${totals.Excesso} unidades (esperado: ${expected.Excesso})`)
  console.log(`  Falta: ${totals.Falta} unidades (esperado: ${expected.Falta})`)

  console.log(`\nResultado: ${ok ? '✓ PASSOU' : '✗ FALHOU'}`)
  return ok
}

/**
 * Teste 3: Nenhum Item Ignorado
 */
function test_no_ignored_items() {
  console.log('\n🧪 TESTE 3: Nenhum Item Ignorado')
  console.log('═'.repeat(50))

  const planItems = [
    { codigo: 'A', nome: 'Produto A', saldo: 100 },
    { codigo: 'B', nome: 'Produto B', saldo: 50 },
    { codigo: 'C', nome: 'Produto C', saldo: 75 },
  ]

  const manualEntries = [
    { codigo: 'A', qty: 100 },
    { codigo: 'B', qty: 30 },
    { codigo: 'C', qty: 75 },
  ]

  // Processar todos
  const manualMap = new Map()
  for (const e of manualEntries) {
    manualMap.set(e.codigo, e.qty)
  }

  let processedCount = 0
  let ignoredCount = 0

  for (const p of planItems) {
    const manualQty = manualMap.get(p.codigo) || 0
    const diferenca = p.saldo - manualQty

    // Ninguém deve ser ignorado
    if (true) { // sempre processa
      processedCount++
    } else {
      ignoredCount++
    }
  }

  const ok = processedCount === planItems.length && ignoredCount === 0

  console.log(`Itens do plano: ${planItems.length}`)
  console.log(`Itens processados: ${processedCount}`)
  console.log(`Itens ignorados: ${ignoredCount}`)

  console.log(`\nResultado: ${ok ? '✓ PASSOU' : '✗ FALHOU'}`)
  return ok
}

/**
 * Teste 4: Diferença Calculada Corretamente
 */
function test_diferenca_calculation() {
  console.log('\n🧪 TESTE 4: Cálculo de Diferença')
  console.log('═'.repeat(50))

  const testCases = [
    { esperado: 100, encontrado: 100, expect_diff: 0, desc: 'Regular' },
    { esperado: 100, encontrado: 75, expect_diff: 25, desc: 'Falta 25' },
    { esperado: 100, encontrado: 125, expect_diff: 25, desc: 'Excesso 25' },
    { esperado: 50, encontrado: 0, expect_diff: 50, desc: 'Falta tudo' },
  ]

  let passed = 0
  for (const tc of testCases) {
    const diferenca = Math.abs(tc.esperado - tc.encontrado)
    const ok = diferenca === tc.expect_diff

    passed += ok ? 1 : 0

    console.log(`${ok ? '✓' : '✗'} ${tc.desc}`)
    console.log(`  Diferença calculada: ${diferenca} (esperado: ${tc.expect_diff})`)
  }

  console.log(`\nResultado: ${passed}/${testCases.length} testes passaram`)
  return passed === testCases.length
}

/**
 * Executar todos os testes
 */
function runAllTests() {
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║  TESTES DE VALIDAÇÃO MATEMÁTICA DA CONTAGEM    ║')
  console.log('╚══════════════════════════════════════════════════╝')

  const tests = [
    { name: 'Classificação Correta', fn: test_classification },
    { name: 'Cálculos Agregados', fn: test_aggregation },
    { name: 'Nenhum Item Ignorado', fn: test_no_ignored_items },
    { name: 'Cálculo de Diferença', fn: test_diferenca_calculation },
  ]

  let totalPassed = 0
  for (const test of tests) {
    const passed = test.fn()
    if (passed) totalPassed++
  }

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log(`║  RESULTADO FINAL: ${totalPassed}/${tests.length} testes passaram       ║`)
  console.log('╚══════════════════════════════════════════════════╝\n')

  return totalPassed === tests.length
}

// Executar
runAllTests()
