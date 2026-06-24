import { supabase } from './supabaseClient'
import { InputValidator, SecurityLogger } from './security'
import { enqueueEntry } from './offlineQueue'

export type CountStatus = 'em_andamento' | 'finalizada' | 'reaberta' | 'reavertida' | 'arquivada'
export type Count = { id: string; user_id: string; store_id: string | null; nome: string; status: CountStatus | string | null; created_at: string }
export type PlanItem = { id?: string; count_id: string; codigo: string; nome: string; saldo: number }
export type ManualEntry = { id?: string; count_id: string; codigo: string; qty?: number; created_at?: string }
export type Result = { id?: string; count_id: string; codigo: string; status: 'regular'|'excesso'|'falta'; manual_qtd: number; saldo_qtd: number; nome_produto: string }

/**
 * Busca TODAS as linhas filtradas por count_id, paginando em blocos de 1000.
 * Contorna o limite padrão do PostgREST, que truncaria silenciosamente em
 * 1000 linhas e corromperia o cruzamento em contagens grandes.
 */
async function fetchAllByCount<T>(table: string, columns: string, count_id: string): Promise<T[]> {
  const PAGE = 1000
  let from = 0
  const all: T[] = []
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('count_id', count_id)
      .range(from, from + PAGE - 1)
    if (error) throw error
    const batch = (data || []) as T[]
    all.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return all
}

// ===== NOVOS TIPOS PARA CRONOGRAMA =====
export type Category = {
  id: string
  user_id: string
  name: string
  description?: string
  priority: number // 1-5
  color: string
  is_active: boolean
  last_counted_at?: string
  created_at: string
  updated_at: string
}

export type ScheduleConfig = {
  id: string
  user_id: string
  name: string
  description?: string
  sectors_per_week: number
  start_date: string // YYYY-MM-DD
  end_date?: string
  total_weeks: number
  work_days: number[] // [1,2,3,4,5] = seg-sex
  is_active: boolean
  generated_at?: string
  created_at: string
  updated_at: string
}

export type ScheduleItem = {
  id: string
  config_id: string
  category_id: string
  scheduled_date: string // YYYY-MM-DD
  week_number: number
  day_of_week: number // 1=seg, 7=dom
  status: 'pending' | 'completed' | 'skipped' | 'rescheduled' | 'archived'
  count_id?: string
  notes?: string
  completed_at?: string
  archived_at?: string // timestamp quando foi soft-deleted
  created_at: string
  updated_at: string
}

export type ScheduleHistory = {
  id: string
  schedule_item_id: string
  action: 'created' | 'rescheduled' | 'completed' | 'skipped'
  old_date?: string
  new_date?: string
  reason?: string
  user_id: string
  created_at: string
}

export type UpcomingSchedule = {
  id: string
  scheduled_date: string
  status: string
  week_number: number
  day_of_week: number
  category_name: string
  category_color: string
  priority: number
  config_name: string
  user_id: string
  urgency: 'today' | 'overdue' | 'upcoming' | 'future'
}

export type CategoryStats = {
  id: string
  name: string
  priority: number
  last_counted_at?: string
  total_scheduled: number
  completed_count: number
  pending_count: number
  skipped_count: number
  user_id: string
}

export async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  
  // Verifica conectividade de forma segura (navigator só existe em browser)
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Sem internet. Conecte-se e tente novamente.')
  }
  if (!data.session?.user) throw new Error('Não autenticado. Faça login para continuar.')
  
  const userId = data.session.user.id
  
  if (!InputValidator.uuid(userId)) {
    SecurityLogger.logSuspiciousActivity('INVALID_USER_ID', { userId })
    throw new Error('ID de usuário inválido')
  }
  
  return userId
}

export async function createCount(nome: string, storeName: string | null) {
  const user_id = await getCurrentUserId()
  
  // Sanitização e validação de inputs
  const sanitizedNome = InputValidator.sanitizeText(nome)
  if (!sanitizedNome || sanitizedNome.length < 1 || sanitizedNome.length > 100) {
    throw new Error('Nome da contagem inválido (1-100 caracteres)')
  }
  
  let store_id: string | null = null
  if (storeName) {
    const sanitizedStoreName = InputValidator.sanitizeText(storeName)
    if (!sanitizedStoreName || sanitizedStoreName.length < 1 || sanitizedStoreName.length > 100) {
      throw new Error('Nome da loja inválido (1-100 caracteres)')
    }
    
    const { data: sInsert, error: sErr } = await supabase
      .from('stores')
      .insert({ name: sanitizedStoreName, user_id })
      .select('id')
      .single()
    if (sErr) throw sErr
    store_id = sInsert.id
  }
  const { data, error } = await supabase
    .from('counts')
    .insert({ user_id, store_id, nome: sanitizedNome, status: 'em_andamento' })
    .select('*')
    .single()
  if (error) throw error
  return data as Count
}

export async function savePlanItems(count_id: string, items: { codigo: string; nome: string; saldo: number }[]) {
  // Validação de UUID
  if (!InputValidator.uuid(count_id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_COUNT_ID', { count_id })
    throw new Error('ID da contagem inválido')
  }
  
  if (!items || !InputValidator.nonEmptyArray(items)) {
    throw new Error('Lista de itens não pode estar vazia')
  }
  
  if (items.length > 10000) {
    throw new Error('Limite de 10000 itens por contagem excedido')
  }
  
  // Validação e sanitização de cada item
  const rows = items.map((r, idx) => {
    const sanitizedCodigo = InputValidator.sanitizeText(r.codigo.trim())
    const sanitizedNome = InputValidator.sanitizeText(r.nome.trim())
    
    if (!sanitizedCodigo || sanitizedCodigo.length === 0) {
      throw new Error(`Item ${idx + 1}: Código não pode estar vazio`)
    }
    
    if (!InputValidator.productCode(sanitizedCodigo)) {
      throw new Error(`Item ${idx + 1}: Código de produto inválido`)
    }
    
    if (!sanitizedNome || sanitizedNome.length === 0) {
      throw new Error(`Item ${idx + 1}: Nome do produto não pode estar vazio`)
    }
    
    if (!InputValidator.quantity(r.saldo)) {
      throw new Error(`Item ${idx + 1}: Quantidade inválida (deve ser 0-999999)`)
    }
    
    return { 
      count_id, 
      codigo: sanitizedCodigo, 
      nome: sanitizedNome, 
      saldo: Math.max(0, r.saldo) 
    }
  })
  
  const { error } = await supabase.from('plan_items').insert(rows)
  if (error) throw error
}

export async function replacePlanItems(count_id: string, items: { codigo: string; nome: string; saldo: number }[]) {
  if (!InputValidator.uuid(count_id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_COUNT_ID', { count_id })
    throw new Error('ID da contagem invÃ¡lido')
  }

  const user_id = await getCurrentUserId()
  const { data: countData, error: countError } = await supabase
    .from('counts')
    .select('id,status')
    .eq('id', count_id)
    .eq('user_id', user_id)
    .single()

  if (countError || !countData) {
    SecurityLogger.logSuspiciousActivity('UNAUTHORIZED_COUNT_ACCESS', { count_id, user_id })
    throw new Error('VocÃª nÃ£o tem permissÃ£o para modificar esta contagem')
  }

  if (countData.status === 'finalizada' || countData.status === 'arquivada') {
    throw new Error('Reabra a contagem antes de alterar a planilha')
  }

  validatePlanRows(items)

  const { error: delErr } = await supabase.from('plan_items').delete().eq('count_id', count_id)
  if (delErr) throw delErr

  await savePlanItems(count_id, items)
}

function validatePlanRows(items: { codigo: string; nome: string; saldo: number }[]) {
  if (!items || !InputValidator.nonEmptyArray(items)) {
    throw new Error('Lista de itens nÃ£o pode estar vazia')
  }

  if (items.length > 10000) {
    throw new Error('Limite de 10000 itens por contagem excedido')
  }

  items.forEach((r, idx) => {
    const sanitizedCodigo = InputValidator.sanitizeText(r.codigo.trim())
    const sanitizedNome = InputValidator.sanitizeText(r.nome.trim())

    if (!sanitizedCodigo) throw new Error(`Item ${idx + 1}: CÃ³digo nÃ£o pode estar vazio`)
    if (!InputValidator.productCode(sanitizedCodigo)) throw new Error(`Item ${idx + 1}: CÃ³digo de produto invÃ¡lido`)
    if (!sanitizedNome) throw new Error(`Item ${idx + 1}: Nome do produto nÃ£o pode estar vazio`)
    if (!InputValidator.quantity(r.saldo)) throw new Error(`Item ${idx + 1}: Quantidade invÃ¡lida (deve ser 0-999999)`)
  })
}

export async function addManualEntry(count_id: string, codigo: string, qty: number = 1) {
  // Validação de count_id
  if (!InputValidator.uuid(count_id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_COUNT_ID', { count_id })
    throw new Error('ID da contagem inválido')
  }
  
  // Validação de código
  if (!InputValidator.nonEmptyString(codigo)) {
    throw new Error('Código do produto não pode estar vazio')
  }
  
  const sanitizedCodigo = InputValidator.sanitizeText(codigo.trim())
  if (!InputValidator.productCode(sanitizedCodigo)) {
    throw new Error(`Código de produto inválido: deve conter apenas letras, números, hífens e underscores`)
  }
  
  // Validação de quantidade
  if (!InputValidator.positiveInteger(qty) || !InputValidator.quantity(qty)) {
    throw new Error(`Quantidade inválida: deve ser um número inteiro positivo (máx 999999)`)
  }
  
  // Upsert incremental no banco (1 linha por código, somando qty), porém
  // resiliente a falta de rede: a fila offline envia agora se houver conexão,
  // ou guarda em IndexedDB e sincroniza ao reconectar. Nunca perde a leitura.
  await enqueueEntry(count_id, sanitizedCodigo, Math.max(1, qty))
}

export async function listManualEntries(count_id: string) {
  const rows = await fetchAllByCount<{ id: string; count_id: string; codigo: string; qty: number; created_at: string }>(
    'manual_entries',
    'id,count_id,codigo,qty,created_at',
    count_id
  )
  // Mais recentes primeiro (ordenação no cliente, pois a leitura é paginada)
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
}

export async function updateManualEntry(id: string, changes: { codigo?: string; qty?: number }) {
  if (!InputValidator.uuid(id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_MANUAL_ENTRY_ID', { id })
    throw new Error('ID da entrada invÃ¡lido')
  }

  const cleanUpdates: { codigo?: string; qty?: number } = {}

  if (changes.codigo !== undefined) {
    const sanitizedCodigo = InputValidator.sanitizeText(changes.codigo.trim())
    if (!InputValidator.productCode(sanitizedCodigo)) {
      throw new Error('CÃ³digo de produto invÃ¡lido')
    }
    cleanUpdates.codigo = sanitizedCodigo
  }

  if (changes.qty !== undefined) {
    if (!InputValidator.positiveInteger(changes.qty) || !InputValidator.quantity(changes.qty)) {
      throw new Error('Quantidade invÃ¡lida')
    }
    cleanUpdates.qty = changes.qty
  }

  // Se o código está mudando, pode colidir com outra linha do mesmo código
  // (há UNIQUE(count_id, codigo)). Nesse caso, mesclamos as quantidades em vez
  // de quebrar com erro de constraint.
  if (cleanUpdates.codigo !== undefined) {
    const { data: current, error: curErr } = await supabase
      .from('manual_entries')
      .select('count_id,codigo,qty')
      .eq('id', id)
      .single()
    if (curErr) throw curErr

    if (current && cleanUpdates.codigo !== current.codigo) {
      const { data: existing } = await supabase
        .from('manual_entries')
        .select('id,qty')
        .eq('count_id', current.count_id)
        .eq('codigo', cleanUpdates.codigo)
        .neq('id', id)
        .maybeSingle()

      if (existing) {
        // Mesclar: soma a quantidade no registro de destino e remove este.
        const mergedQty = (existing.qty || 0) + (cleanUpdates.qty ?? current.qty ?? 0)
        const { error: upErr } = await supabase
          .from('manual_entries')
          .update({ qty: mergedQty })
          .eq('id', existing.id)
        if (upErr) throw upErr
        const { error: delErr } = await supabase.from('manual_entries').delete().eq('id', id)
        if (delErr) throw delErr
        return
      }
    }
  }

  const { error } = await supabase.from('manual_entries').update(cleanUpdates).eq('id', id)
  if (error) throw error
}

export async function deleteManualEntry(id: string) {
  if (!InputValidator.uuid(id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_MANUAL_ENTRY_ID', { id })
    throw new Error('ID da entrada invÃ¡lido')
  }

  const { error } = await supabase.from('manual_entries').delete().eq('id', id)
  if (error) throw error
}

/**
 * Define a quantidade de um código (set, não incrementa) por (count_id, codigo).
 * Independente do id — útil para "desfazer" e ajustes. qty <= 0 remove o código.
 */
export async function setManualEntryQty(count_id: string, codigo: string, qty: number) {
  const sanitized = InputValidator.sanitizeText(codigo.trim())
  if (qty <= 0) {
    const { error } = await supabase
      .from('manual_entries')
      .delete()
      .eq('count_id', count_id)
      .eq('codigo', sanitized)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('manual_entries')
    .upsert({ count_id, codigo: sanitized, qty }, { onConflict: 'count_id,codigo' })
  if (error) throw error
}

/**
 * Busca contagens paginadas com filtro opcional
 * ⚡ PERFORMANCE: Usa índice (user_id, created_at DESC) + range para paginação
 * ⚠ NOTA: Search com ilike sem índice full-text pode ser custoso em muitos registros
 *    Para otimizar em produção, considerar full-text search
 * @param limit Itens por página (default: 10)
 * @param from Offset inicial (default: 0)
 * @param search Filtro opcional por nome
 * @returns Contagens ordenadas por data mais recente
 */
export async function getCounts(
  limit = 10,
  from = 0,
  search = '',
  status: 'ativas' | 'em_andamento' | 'finalizada' | 'reaberta' | 'arquivada' = 'ativas'
) {
  const user_id = await getCurrentUserId()
  
  let q = supabase
    .from('counts')
    .select('*')
    .eq('user_id', user_id)
    // Índice: idx_counts_user_created (user_id, created_at DESC)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)
  
  if (status === 'ativas') {
    q = q.neq('status', 'arquivada')
  } else if (status === 'reaberta') {
    q = q.in('status', ['reaberta', 'reavertida'])
  } else {
    q = q.eq('status', status)
  }

  const trimmedSearch = search.trim()
  if (trimmedSearch) q = q.ilike('nome', `%${trimmedSearch}%`)
  
  const { data, error } = await q
  if (error) throw error
  return data as Count[]
}

export async function updateCountName(count_id: string, nome: string) {
  if (!InputValidator.uuid(count_id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_COUNT_ID_RENAME', { count_id })
    throw new Error('ID da contagem invÃ¡lido')
  }

  const user_id = await getCurrentUserId()
  const sanitizedNome = InputValidator.sanitizeText(nome)
  if (!sanitizedNome || sanitizedNome.length < 1 || sanitizedNome.length > 100) {
    throw new Error('Nome da contagem invÃ¡lido (1-100 caracteres)')
  }

  const { data, error } = await supabase
    .from('counts')
    .update({ nome: sanitizedNome })
    .eq('id', count_id)
    .eq('user_id', user_id)
    .select('*')
    .single()

  if (error) throw error
  return data as Count
}

export async function archiveCount(count_id: string) {
  if (!InputValidator.uuid(count_id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_COUNT_ID_ARCHIVE', { count_id })
    throw new Error('ID da contagem invÃ¡lido')
  }

  const user_id = await getCurrentUserId()
  const { data, error } = await supabase
    .from('counts')
    .update({ status: 'arquivada' })
    .eq('id', count_id)
    .eq('user_id', user_id)
    .select('*')
    .single()

  if (error) throw error
  return data as Count
}

export async function deleteCount(count_id: string) {
  if (!InputValidator.uuid(count_id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_COUNT_ID_DELETE', { count_id })
    throw new Error('ID da contagem invÃ¡lido')
  }

  const user_id = await getCurrentUserId()
  const { error } = await supabase
    .from('counts')
    .delete()
    .eq('id', count_id)
    .eq('user_id', user_id)

  if (error) throw error
}

export async function getCountById(id: string) {
  const { data, error } = await supabase.from('counts').select('*').eq('id', id).single()
  if (error) throw error
  return data as Count
}

export async function getStoreById(id: string) {
  const { data, error } = await supabase.from('stores').select('name').eq('id', id).single()
  if (error) throw error
  return data?.name || null
}

export async function getPlanItems(count_id: string) {
  return await fetchAllByCount<PlanItem>('plan_items', 'codigo,nome,saldo', count_id)
}

export type CountResultSummary = { regular: number; falta: number; excesso: number; total: number }

/**
 * Finaliza a contagem cruzando plano x entradas no PRÓPRIO banco (RPC).
 * O cruzamento, a gravação de `results` e a finalização acontecem numa única
 * transação no Postgres — sem limite de 1000 linhas, sem cálculo no celular e
 * sem o risco de delete+insert parcial por queda de rede.
 */
export async function computeAndSaveResults(count_id: string): Promise<CountResultSummary> {
  if (!InputValidator.uuid(count_id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_COUNT_ID_COMPUTE', { count_id })
    throw new Error('ID da contagem inválido')
  }

  const { data, error } = await supabase.rpc('compute_count_results', { p_count_id: count_id })
  if (error) {
    console.error('Erro ao computar resultados:', error)
    throw new Error('Erro ao finalizar contagem: ' + error.message)
  }

  const summary = (Array.isArray(data) ? data[0] : data) as CountResultSummary | undefined
  return summary ?? { regular: 0, falta: 0, excesso: 0, total: 0 }
}

export async function getResultsByCount(count_id: string) {
  return await fetchAllByCount<Result>('results', '*', count_id)
}

export async function reopenCount(count_id: string) {
  // Validação de UUID
  if (!InputValidator.uuid(count_id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_COUNT_ID', { count_id })
    throw new Error('ID da contagem inválido')
  }
  
  // Verificar que a contagem pertence ao usuário autenticado
  const user_id = await getCurrentUserId()
  const { data: count, error: checkErr } = await supabase
    .from('counts')
    .select('id, user_id, status')
    .eq('id', count_id)
    .single()
  
  if (checkErr || !count) {
    SecurityLogger.logSuspiciousActivity('COUNT_NOT_FOUND', { count_id })
    throw new Error('Contagem não encontrada')
  }
  
  if (count.user_id !== user_id) {
    SecurityLogger.logSuspiciousActivity('UNAUTHORIZED_REOPEN', { count_id, user_id })
    throw new Error('Sem permissão para reabrir esta contagem')
  }
  
  // Limpar resultados anteriores
  const { error: delErr } = await supabase
    .from('results')
    .delete()
    .eq('count_id', count_id)
  
  if (delErr) {
    console.error('Erro ao deletar resultados antigos:', delErr)
    throw new Error('Erro ao limpar resultados anteriores: ' + delErr.message)
  }
  
  // Marcar contagem como reaberta
  const { data: updated, error: updateErr } = await supabase
    .from('counts')
    .update({ status: 'reaberta' })
    .eq('id', count_id)
    .select('*')
    .single()
  
  if (updateErr) {
    console.error('Erro ao reabrir contagem:', updateErr)
    throw new Error('Erro ao reabrir contagem: ' + updateErr.message)
  }
  
  console.log(`Contagem reaberta com sucesso: ${count_id}`)
  return updated as Count
}

export async function getTotalsLastCounts(limit = 5) {
  const { data: counts, error } = await supabase.from('counts').select('id,nome,created_at').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  
  const out: { name: string; Regular: number; Excesso: number; Falta: number }[] = []
  
  for (const c of counts || []) {
    const { data: rows, error: rErr } = await supabase
      .from('results')
      .select('status, manual_qtd, saldo_qtd')
      .eq('count_id', c.id)
    
    if (rErr) throw rErr
    
    // Contagem por UNIDADES (não por itens)
    const totals = { 
      Regular: 0,   // Unidades em quantidade correta
      Excesso: 0,   // Unidades excedentes
      Falta: 0      // Unidades em falta
    }
    
    for (const r of rows || []) {
      const status = r.status as string
      const manualQty = Number(r.manual_qtd) || 0
      const expectedQty = Number(r.saldo_qtd) || 0
      const diferenca = Math.abs(expectedQty - manualQty) // Calcular diferença aqui
      
      if (status === 'regular') {
        // Regular = quantidade exata encontrada
        totals.Regular += expectedQty
      } else if (status === 'excesso') {
        // Excesso = quantidade acima do esperado
        totals.Excesso += diferenca
      } else if (status === 'falta') {
        // Falta = quantidade abaixo do esperado
        totals.Falta += diferenca
      }
    }
    out.push({ name: c.nome, ...totals })
  }
  return out
}

// ===============================================
// FUNÇÕES PARA CATEGORIAS
// ===============================================

/**
 * Busca categorias ativas do usuário
 * ⚡ RECOMENDAÇÃO: Use em componentes com useSessionCache() ou useCache()
 *    pois dados raramente mudam durante a navegação
 *    Exemplo: const { data: categories } = useSessionCache('getCategories', getCategories, 10 * 60 * 1000)
 * @returns Categories ordenadas por prioridade
 */
export async function getCategories(): Promise<Category[]> {
  const user_id = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user_id)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .order('name')
    // Índice: idx_categories_user_active (user_id, is_active, priority DESC)
  
  if (error) throw error
  return data as Category[]
}

export async function getCategoryById(id: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as Category
}

export async function createCategory(category: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Category> {
  const user_id = await getCurrentUserId()
  
  // Validação de nome
  if (!InputValidator.nonEmptyString(category.name)) {
    throw new Error('Nome da categoria não pode estar vazio')
  }
  
  // Validação de priority (1-5)
  const priority = category.priority || 1
  if (!InputValidator.positiveInteger(priority) || priority < 1 || priority > 5) {
    throw new Error('Prioridade deve ser um número entre 1 e 5')
  }
  
  // Validação de descrição
  if (category.description && !InputValidator.nonEmptyString(category.description)) {
    throw new Error('Descrição deve estar vazia ou conter texto válido')
  }
  
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id,
      name: category.name.trim(),
      description: category.description?.trim() || null,
      priority: Math.min(5, Math.max(1, priority)),
      color: category.color || '#6B7280',
      is_active: category.is_active ?? true
    })
    .select('*')
    .single()
  
  if (error) throw error
  return data as Category
}

export async function updateCategory(id: string, updates: Partial<Pick<Category, 'name' | 'description' | 'priority' | 'color' | 'is_active' | 'last_counted_at'>>): Promise<void> {
  const cleanUpdates: any = {}
  
  if (updates.name) cleanUpdates.name = updates.name.trim()
  if (updates.description !== undefined) cleanUpdates.description = updates.description?.trim() || null
  if (updates.priority !== undefined) cleanUpdates.priority = Math.min(5, Math.max(1, updates.priority))
  if (updates.color) cleanUpdates.color = updates.color
  if (updates.is_active !== undefined) cleanUpdates.is_active = updates.is_active
  if (updates.last_counted_at !== undefined) cleanUpdates.last_counted_at = updates.last_counted_at
  
  const { error } = await supabase
    .from('categories')
    .update(cleanUpdates)
    .eq('id', id)
  
  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  // Soft delete - marca como inativa
  await updateCategory(id, { is_active: false })
}

export async function getCategoryStats(): Promise<CategoryStats[]> {
  const { data, error } = await supabase
    .from('category_stats')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data as CategoryStats[]
}

// ===============================================
// FUNÇÕES PARA CONFIGURAÇÕES DE CRONOGRAMA
// ===============================================

/**
 * Busca configurações de cronograma ativas
 * ⚡ RECOMENDAÇÃO: Use em componentes com useSessionCache() para evitar re-fetches
 *    os dados mudam apenas quando usuário cria nova configuração
 * @returns Schedule configs mais recentes primeiro
 */
export async function getScheduleConfigs(): Promise<ScheduleConfig[]> {
  const user_id = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('schedule_configs')
    .select('*')
    .eq('user_id', user_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    // Índice: idx_schedule_configs_user_active (user_id, is_active)
  
  if (error) throw error
  return data as ScheduleConfig[]
}

export async function getActiveScheduleConfig(): Promise<ScheduleConfig | null> {
  const user_id = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('schedule_configs')
    .select('*')
    .eq('user_id', user_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (error) throw error
  return data as ScheduleConfig | null
}

export async function createScheduleConfig(config: Omit<ScheduleConfig, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'generated_at'>): Promise<ScheduleConfig> {
  const user_id = await getCurrentUserId()
  
  // Validação de nome
  if (!InputValidator.nonEmptyString(config.name)) {
    throw new Error('Nome da configuração não pode estar vazio')
  }
  
  // Validação de sectors_per_week (1-10)
  if (!InputValidator.positiveInteger(config.sectors_per_week) || config.sectors_per_week < 1 || config.sectors_per_week > 10) {
    throw new Error('Setores por semana deve ser um número entre 1 e 10')
  }
  
  // Validação de start_date
  if (!InputValidator.validDate(config.start_date)) {
    throw new Error('Data de início inválida')
  }
  
  // Validação de end_date se fornecida
  if (config.end_date && !InputValidator.validDate(config.end_date)) {
    throw new Error('Data de fim inválida')
  }
  
  // Validação de total_weeks (1-52)
  if (!InputValidator.positiveInteger(config.total_weeks) || config.total_weeks < 1 || config.total_weeks > 52) {
    throw new Error('Total de semanas deve ser um número entre 1 e 52')
  }
  
  // Validação de work_days
  if (!InputValidator.nonEmptyArray(config.work_days || [])) {
    throw new Error('Deve haver pelo menos um dia útil selecionado')
  }
  
  const workDays = config.work_days || [1, 2, 3, 4, 5]
  if (!workDays.every(d => d >= 1 && d <= 7)) {
    throw new Error('Dias úteis devem ser números entre 1 (seg) e 7 (dom)')
  }
  
  // Desativa configurações anteriores
  await supabase
    .from('schedule_configs')
    .update({ is_active: false })
    .eq('user_id', user_id)
    .eq('is_active', true)
  
  const { data, error } = await supabase
    .from('schedule_configs')
    .insert({
      user_id,
      name: config.name.trim(),
      description: config.description?.trim() || null,
      sectors_per_week: Math.min(10, Math.max(1, config.sectors_per_week)),
      start_date: config.start_date,
      end_date: config.end_date || null,
      total_weeks: Math.min(52, Math.max(1, config.total_weeks)),
      work_days: workDays,
      is_active: true
    })
    .select('*')
    .single()
  
  if (error) throw error
  return data as ScheduleConfig
}

export async function updateScheduleConfig(id: string, updates: Partial<Pick<ScheduleConfig, 'name' | 'description' | 'is_active'>>): Promise<void> {
  const cleanUpdates: any = {}
  
  if (updates.name) cleanUpdates.name = updates.name.trim()
  if (updates.description !== undefined) cleanUpdates.description = updates.description?.trim() || null
  if (updates.is_active !== undefined) cleanUpdates.is_active = updates.is_active
  
  const { error } = await supabase
    .from('schedule_configs')
    .update(cleanUpdates)
    .eq('id', id)
  
  if (error) throw error
}

export async function deleteScheduleConfig(id: string): Promise<void> {
  // Marca como inativa
  await updateScheduleConfig(id, { is_active: false })
}

// ===============================================
// FUNÇÕES PARA ITENS DE CRONOGRAMA
// ===============================================

export async function getScheduleItems(configId: string, weekNumber?: number): Promise<ScheduleItem[]> {
  // Validação de UUID para configId
  if (!InputValidator.uuid(configId)) {
    SecurityLogger.logSuspiciousActivity('INVALID_CONFIG_ID', { configId })
    throw new Error('ID de configuração inválido')
  }
  
  let query = supabase
    .from('schedule_items')
    .select('*')
    .eq('config_id', configId)
    .is('archived_at', null) // Filtra itens não arquivados
  
  if (weekNumber !== undefined) {
    query = query.eq('week_number', weekNumber)
  }
  
  const { data, error } = await query.order('scheduled_date')
  
  if (error) throw error
  return data as ScheduleItem[]
}

export async function getAllScheduleItems(): Promise<ScheduleItem[]> {
  const { data, error } = await supabase
    .from('schedule_items')
    .select('*')
    .order('scheduled_date')
  
  if (error) throw error
  return data as ScheduleItem[]
}

/**
 * Busca itens de cronograma com detalhes de categoria e contagem
 * ⚡ PERFORMANCE: Usa índice composto (config_id, archived_at) + select específico
 * ⚡ RECOMENDAÇÃO: Para componentes que exibem muitos items, paginar com limit()/offset()
 *    ou considerar criar VIEW com pré-join das categorias/counts
 * @param configId UUID da configuração
 * @param weekNumber Filtro opcional por semana
 * @returns Items com categoria e count denormalizados
 */
export async function getScheduleItemsWithDetails(configId: string, weekNumber?: number) {
  // Validação de UUID para configId
  if (!InputValidator.uuid(configId)) {
    SecurityLogger.logSuspiciousActivity('INVALID_CONFIG_ID', { configId })
    throw new Error('ID de configuração inválido')
  }
  
  let query = supabase
    .from('schedule_items')
    .select(`
      id,
      config_id,
      category_id,
      scheduled_date,
      week_number,
      day_of_week,
      status,
      count_id,
      notes,
      completed_at,
      archived_at,
      created_at,
      updated_at,
      categories!inner(id, name, color, priority),
      counts(id, nome, status)
    `)
    .is('archived_at', null) // Filtra itens não arquivados
    .eq('config_id', configId)
    // Índice: idx_schedule_items_config_archived (config_id, archived_at)
  
  if (weekNumber !== undefined) {
    query = query.eq('week_number', weekNumber)
  }
  
  const { data, error } = await query.order('scheduled_date')
  
  if (error) throw error
  return data
}

export async function getUpcomingSchedule(): Promise<UpcomingSchedule[]> {
  const { data, error } = await supabase
    .from('upcoming_schedule')
    .select('*')
  
  if (error) throw error
  return data as UpcomingSchedule[]
}

export async function updateScheduleItemStatus(
  id: string, 
  status: ScheduleItem['status'], 
  notes?: string,
  countId?: string
): Promise<void> {
  // Validação de UUID para id
  if (!InputValidator.uuid(id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_SCHEDULE_ITEM_ID', { id })
    throw new Error('ID do item de cronograma inválido')
  }
  
  // Validação de status válido
  const validStatuses: ScheduleItem['status'][] = ['pending', 'completed', 'skipped', 'rescheduled', 'archived']
  if (!validStatuses.includes(status)) {
    SecurityLogger.logSuspiciousActivity('INVALID_STATUS', { status })
    throw new Error(`Status inválido: ${status}. Deve ser um de: ${validStatuses.join(', ')}`)
  }
  
  // Validação de countId se fornecido
  if (countId && !InputValidator.uuid(countId)) {
    SecurityLogger.logSuspiciousActivity('INVALID_COUNT_ID', { countId })
    throw new Error('ID da contagem inválido')
  }
  
  // Validação de notes
  if (notes && !InputValidator.nonEmptyString(notes)) {
    throw new Error('Notas devem estar vazias ou conter texto válido')
  }
  
  const updates: any = { status }
  
  if (notes !== undefined) updates.notes = notes.trim() || null
  if (countId) updates.count_id = countId
  if (status === 'completed') updates.completed_at = new Date().toISOString()
  
  const { error } = await supabase
    .from('schedule_items')
    .update(updates)
    .eq('id', id)
  
  if (error) throw error
  
  // Adiciona ao histórico
  const user_id = await getCurrentUserId()
  await supabase
    .from('schedule_history')
    .insert({
      schedule_item_id: id,
      action: status === 'completed' ? 'completed' : status === 'skipped' ? 'skipped' : 'rescheduled',
      user_id,
      reason: notes || null
    })
}

export async function rescheduleItem(id: string, newDate: string, reason?: string): Promise<void> {
  // Validação de UUID para id
  if (!InputValidator.uuid(id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_SCHEDULE_ITEM_ID', { id })
    throw new Error('ID do item de cronograma inválido')
  }
  
  // Validação de data
  if (!InputValidator.validDate(newDate)) {
    throw new Error('Data de reagendamento inválida')
  }
  
  // Validação de reason
  if (reason && !InputValidator.nonEmptyString(reason)) {
    throw new Error('Razão deve estar vazia ou conter texto válido')
  }
  
  // Busca item atual
  const { data: item, error: fetchError } = await supabase
    .from('schedule_items')
    .select('scheduled_date, week_number, day_of_week')
    .eq('id', id)
    .single()
  
  if (fetchError) throw fetchError
  
  // Calcula novo dia da semana (1=seg, 2=ter, ..., 7=dom)
  // getDay(): 0=domingo, 1=segunda, ..., 6=sábado
  // Conversão: Se domingo (0) → 7, caso contrário mantém o valor (1-6)
  const newDateObj = new Date(newDate)
  const newDayOfWeek = newDateObj.getDay() === 0 ? 7 : newDateObj.getDay()
  
  // Atualiza item
  const { error } = await supabase
    .from('schedule_items')
    .update({
      scheduled_date: newDate,
      day_of_week: newDayOfWeek,
      status: 'rescheduled'
    })
    .eq('id', id)
  
  if (error) throw error
  
  // Adiciona ao histórico
  const user_id = await getCurrentUserId()
  await supabase
    .from('schedule_history')
    .insert({
      schedule_item_id: id,
      action: 'rescheduled',
      old_date: item.scheduled_date,
      new_date: newDate,
      reason: reason?.trim() || null,
      user_id
    })
}

// ===============================================
// ALGORITMO DE GERAÇÃO DE CRONOGRAMA
// ===============================================

interface GenerateScheduleOptions {
  configId: string
  categories: Category[]
  sectorsPerWeek: number
  startDate: string
  totalWeeks: number
  workDays: number[]
}

export async function generateSchedule(options: GenerateScheduleOptions): Promise<ScheduleItem[]> {
  const { configId, categories, sectorsPerWeek, startDate, totalWeeks, workDays } = options
  
  // Soft delete itens existentes do cronograma - marca como 'archived' em vez de deletar
  await supabase
    .from('schedule_items')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString()
    })
    .eq('config_id', configId)
    .is('archived_at', null) // Só arquiva os que não foram já arquivados
  
  const schedule: Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'>[] = []
  const activeCategories = categories.filter(c => c.is_active)
  
  if (activeCategories.length === 0) {
    throw new Error('Nenhuma categoria ativa encontrada')
  }
  
  // NOVA LÓGICA: Distribuição Round-Robin garantindo equidade
  const startDateObj = new Date(startDate)
  let categoryIndex = 0
  
  for (let week = 1; week <= totalWeeks; week++) {
    const weekCategories: Category[] = []
    
    // Seleciona categorias em round-robin (rotação circular)
    for (let i = 0; i < sectorsPerWeek; i++) {
      const selectedCategory = activeCategories[categoryIndex % activeCategories.length]
      weekCategories.push(selectedCategory)
      categoryIndex++
    }
    
    // Distribui pelas dias úteis
    const scheduledDays = distributeAcrossWorkDays(weekCategories, workDays)
    
    // Cria itens do cronograma
    for (const { category, dayOfWeek } of scheduledDays) {
      const scheduledDate = getDateForWeekDay(startDateObj, week - 1, dayOfWeek)
      
      schedule.push({
        config_id: configId,
        category_id: category.id,
        scheduled_date: formatDate(scheduledDate),
        week_number: week,
        day_of_week: dayOfWeek,
        status: 'pending',
        count_id: undefined,
        notes: undefined,
        completed_at: undefined
      })
    }
  }
  
  // Insere no banco
  if (schedule.length > 0) {
    const { data, error } = await supabase
      .from('schedule_items')
      .insert(schedule)
      .select('*')
    
    if (error) throw error
    
    // Marca configuração como gerada
    await supabase
      .from('schedule_configs')
      .update({ generated_at: new Date().toISOString() })
      .eq('id', configId)
    
    return data as ScheduleItem[]
  }
  
  return []
}

// Funções auxiliares para o algoritmo
function distributeAcrossWorkDays(
  categories: Category[], 
  workDays: number[]
): Array<{ category: Category; dayOfWeek: number }> {
  const result: Array<{ category: Category; dayOfWeek: number }> = []
  const availableDays = [...workDays]
  
  shuffleArray(availableDays)
  
  categories.forEach((category, index) => {
    const dayIndex = index % availableDays.length
    result.push({
      category,
      dayOfWeek: availableDays[dayIndex]
    })
  })
  
  return result
}

function getDateForWeekDay(startDate: Date, weekOffset: number, dayOfWeek: number): Date {
  const targetDate = new Date(startDate)
  
  // Move para o início da semana alvo
  targetDate.setDate(startDate.getDate() + (weekOffset * 7))
  
  // Ajusta para segunda-feira da semana
  const currentDay = targetDate.getDay()
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay
  targetDate.setDate(targetDate.getDate() + daysToMonday)
  
  // Move para o dia da semana desejado (1=seg, 2=ter, etc.)
  targetDate.setDate(targetDate.getDate() + (dayOfWeek - 1))
  
  return targetDate
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
}

// Função wrapper para gerar cronograma a partir de uma configuração
export async function generateScheduleFromConfig(configId: string): Promise<ScheduleItem[]> {
  // Validação de UUID para configId
  if (!InputValidator.uuid(configId)) {
    SecurityLogger.logSuspiciousActivity('INVALID_CONFIG_ID', { configId })
    throw new Error('ID de configuração inválido')
  }
  
  // Busca configuração
  const { data: config, error: configError } = await supabase
    .from('schedule_configs')
    .select('*')
    .eq('id', configId)
    .single()
  
  if (configError) throw configError
  
  // Busca categorias ativas
  const categories = await getCategories()
  
  if (categories.length === 0) {
    throw new Error('Nenhuma categoria ativa encontrada. Adicione categorias antes de gerar o cronograma.')
  }
  
  if (categories.length < config.sectors_per_week) {
    throw new Error(`Necessário pelo menos ${config.sectors_per_week} categorias para gerar o cronograma.`)
  }
  
  return generateSchedule({
    configId: config.id,
    categories,
    sectorsPerWeek: config.sectors_per_week,
    startDate: config.start_date,
    totalWeeks: config.total_weeks,
    workDays: config.work_days
  })
}

// ===============================================
// FUNÇÕES PARA DELETAR ITENS DE CRONOGRAMA
// ===============================================

export async function deleteScheduleItem(id: string): Promise<void> {
  // Validação de UUID para id
  if (!InputValidator.uuid(id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_SCHEDULE_ITEM_ID', { id })
    throw new Error('ID do item de cronograma inválido')
  }
  
  // Soft delete - marca como archived em vez de deletar
  const { error } = await supabase
    .from('schedule_items')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString()
    })
    .eq('id', id)
  
  if (error) throw error
}

export async function deleteAllScheduleItems(configId: string): Promise<void> {
  // Validação de UUID para configId
  if (!InputValidator.uuid(configId)) {
    SecurityLogger.logSuspiciousActivity('INVALID_CONFIG_ID', { configId })
    throw new Error('ID de configuração inválido')
  }
  
  // Soft delete - marca como archived em vez de deletar
  const { error } = await supabase
    .from('schedule_items')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString()
    })
    .eq('config_id', configId)
    .is('archived_at', null) // Só arquiva os que não foram já arquivados
  
  if (error) throw error
}

export async function deleteScheduleConfigCompletely(id: string): Promise<void> {
  // Validação de UUID para id
  if (!InputValidator.uuid(id)) {
    SecurityLogger.logSuspiciousActivity('INVALID_CONFIG_ID', { id })
    throw new Error('ID de configuração inválido')
  }
  
  // Primeiro faz soft delete de todos os itens do cronograma
  await deleteAllScheduleItems(id)
  
  // Depois deleta a configuração
  const { error } = await supabase
    .from('schedule_configs')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}
