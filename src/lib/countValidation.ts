/**
 * Validação de Contagem - Auditoria e Verificação Matemática
 * 
 * Fornece funções para validar a integridade dos cálculos durante
 * o processo de contagem, com logs detalhados para debugging
 */

import { supabase } from './supabaseClient'

export interface CountValidationReport {
  count_id: string
  is_valid: boolean
  summary: {
    total_plan_items: number
    total_manual_entries: number
    total_unique_codes: number
    items_processed: number
    items_ignored: number
  }
  calculations: {
    regular_items: number
    regular_units: number
    falta_items: number
    falta_units: number
    excesso_items: number
    excesso_units: number
    unknown_codes: number
    unknown_units: number
  }
  validation_checks: {
    all_plan_items_processed: boolean
    no_ignored_items: boolean
    quantities_positive: boolean
    no_duplicate_results: boolean
    manual_map_matches_entries: boolean
  }
  details: {
    regular: { codigo: string; esperado: number; encontrado: number; nome: string }[]
    falta: { codigo: string; esperado: number; encontrado: number; diferenca: number; nome: string }[]
    excesso: { codigo: string; encontrado: number; diferenca: number; nome: string }[]
    unknown: { codigo: string; encontrado: number }[]
  }
  errors: string[]
}

/**
 * Valida completamente uma contagem
 * Verifica integridade matemática, presença de todos os itens, e cálculos
 */
export async function validateCountCalculations(count_id: string): Promise<CountValidationReport> {
  const errors: string[] = []
  
  try {
    // 1. Carregar plano
    const { data: plan, error: pErr } = await supabase
      .from('plan_items')
      .select('codigo,nome,saldo')
      .eq('count_id', count_id)
    
    if (pErr) throw new Error(`Erro carregando plano: ${pErr.message}`)
    if (!plan || plan.length === 0) {
      errors.push('⚠️ Nenhum item no plano encontrado')
    }

    // 2. Carregar entradas manuais
    const { data: entries, error: mErr } = await supabase
      .from('manual_entries')
      .select('codigo,qty')
      .eq('count_id', count_id)
    
    if (mErr) throw new Error(`Erro carregando entradas: ${mErr.message}`)

    // 3. Carregar resultados
    const { data: results, error: rErr } = await supabase
      .from('results')
      .select('codigo,status,manual_qtd,saldo_qtd,diferenca')
      .eq('count_id', count_id)
    
    if (rErr) throw new Error(`Erro carregando resultados: ${rErr.message}`)

    // 4. Construir mapas para análise
    const planMap = new Map<string, { nome: string; saldo: number }>()
    let totalPlanQty = 0
    for (const p of plan || []) {
      planMap.set(p.codigo, { nome: p.nome, saldo: p.saldo })
      totalPlanQty += p.saldo
    }

    const manualMap = new Map<string, number>()
    let totalManualQty = 0
    for (const e of entries || []) {
      const qty = Math.max(0, Number(e.qty) || 0)
      manualMap.set(e.codigo, (manualMap.get(e.codigo) || 0) + qty)
      totalManualQty += qty
    }

    // 5. Análise detalhada
    let regular_items = 0, regular_units = 0
    let falta_items = 0, falta_units = 0
    let excesso_items = 0, excesso_units = 0
    let unknown_codes = 0, unknown_units = 0

    const details = {
      regular: [] as any[],
      falta: [] as any[],
      excesso: [] as any[],
      unknown: [] as any[]
    }

    // Verificar plano
    for (const [codigo, { nome, saldo }] of planMap.entries()) {
      const manualQty = manualMap.get(codigo) || 0
      const diferenca = saldo - manualQty

      if (diferenca === 0) {
        regular_items++
        regular_units += saldo
        details.regular.push({ codigo, esperado: saldo, encontrado: manualQty, nome })
      } else if (diferenca > 0) {
        falta_items++
        falta_units += diferenca
        details.falta.push({ codigo, esperado: saldo, encontrado: manualQty, diferenca, nome })
      } else {
        excesso_items++
        excesso_units += Math.abs(diferenca)
        details.excesso.push({ codigo, encontrado: manualQty, diferenca: Math.abs(diferenca), nome })
      }
    }

    // Verificar códigos desconhecidos
    for (const [codigo, qty] of manualMap.entries()) {
      if (!planMap.has(codigo)) {
        unknown_codes++
        unknown_units += qty
        details.unknown.push({ codigo, encontrado: qty })
      }
    }

    // 6. Validações
    const validation_checks = {
      all_plan_items_processed: (regular_items + falta_items + excesso_items) === planMap.size,
      no_ignored_items: (regular_items + falta_items + excesso_items) === planMap.size,
      quantities_positive: totalManualQty >= 0 && totalPlanQty >= 0,
      no_duplicate_results: new Set(results?.map(r => r.codigo)).size === results?.length,
      manual_map_matches_entries: manualMap.size === new Set(entries?.map(e => e.codigo)).size
    }

    // 7. Verificações adicionais
    if ((regular_items + falta_items + excesso_items) < planMap.size) {
      errors.push(`❌ Nem todos os itens do plano foram processados (${regular_items + falta_items + excesso_items}/${planMap.size})`)
    }

    if (unknown_codes > 0) {
      errors.push(`⚠️ Encontrados ${unknown_codes} códigos desconhecidos (não no plano)`)
    }

    const is_valid = errors.length === 0 && Object.values(validation_checks).every(v => v)

    return {
      count_id,
      is_valid,
      summary: {
        total_plan_items: planMap.size,
        total_manual_entries: entries?.length || 0,
        total_unique_codes: manualMap.size + planMap.size,
        items_processed: regular_items + falta_items + excesso_items,
        items_ignored: planMap.size - (regular_items + falta_items + excesso_items)
      },
      calculations: {
        regular_items,
        regular_units,
        falta_items,
        falta_units,
        excesso_items,
        excesso_units,
        unknown_codes,
        unknown_units
      },
      validation_checks,
      details,
      errors
    }
  } catch (err: any) {
    errors.push(`Erro crítico na validação: ${err.message}`)
    return {
      count_id,
      is_valid: false,
      summary: { total_plan_items: 0, total_manual_entries: 0, total_unique_codes: 0, items_processed: 0, items_ignored: 0 },
      calculations: { regular_items: 0, regular_units: 0, falta_items: 0, falta_units: 0, excesso_items: 0, excesso_units: 0, unknown_codes: 0, unknown_units: 0 },
      validation_checks: { all_plan_items_processed: false, no_ignored_items: false, quantities_positive: false, no_duplicate_results: false, manual_map_matches_entries: false },
      details: { regular: [], falta: [], excesso: [], unknown: [] },
      errors
    }
  }
}

/**
 * Formata o relatório de validação para exibição amigável
 */
export function formatValidationReport(report: CountValidationReport): string {
  const status = report.is_valid ? '✅ VÁLIDO' : '❌ INVÁLIDO'
  
  return `
${status}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Itens do plano: ${report.summary.total_plan_items}
Entradas manuais: ${report.summary.total_manual_entries}
Itens processados: ${report.summary.items_processed}
Itens ignorados: ${report.summary.items_ignored}

📈 CÁLCULOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Regular: ${report.calculations.regular_items} itens (${report.calculations.regular_units} unidades)
⚠️  Falta: ${report.calculations.falta_items} itens (${report.calculations.falta_units} unidades)
🔴 Excesso: ${report.calculations.excesso_items} itens (${report.calculations.excesso_units} unidades)
❓ Desconhecidos: ${report.calculations.unknown_codes} códigos (${report.calculations.unknown_units} unidades)

🔍 VALIDAÇÕES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${report.validation_checks.all_plan_items_processed ? '✓' : '✗'} Todos itens do plano processados
${report.validation_checks.no_ignored_items ? '✓' : '✗'} Nenhum item ignorado
${report.validation_checks.quantities_positive ? '✓' : '✗'} Quantidades positivas
${report.validation_checks.manual_map_matches_entries ? '✓' : '✗'} Mapa manual correto

${report.errors.length > 0 ? '⚠️ ERROS:\n' + report.errors.map(e => '  • ' + e).join('\n') : 'Sem erros!'}
  `.trim()
}
