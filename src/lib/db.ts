import { supabase } from './supabaseClient'

export type Count = { id: string; user_id: string; store_id: string | null; nome: string; status: string | null; created_at: string }
export type PlanItem = { id?: string; count_id: string; codigo: string; nome: string; saldo: number }
export type ManualEntry = { id?: string; count_id: string; codigo: string; qty?: number; created_at?: string }
export type Result = { id?: string; count_id: string; codigo: string; status: 'regular'|'excesso'|'falta'; manual_qtd: number; saldo_qtd: number; nome_produto: string }

export async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  if (!navigator.onLine) throw new Error('Sem internet. Conecte-se e tente novamente.')
  if (!data.session?.user) throw new Error('Não autenticado. Faça login para continuar.')
  return data.session.user.id
}

export async function createCount(nome: string, storeName: string | null) {
  const user_id = await getCurrentUserId()
  let store_id: string | null = null
  if (storeName) {
    const { data: sInsert, error: sErr } = await supabase
      .from('stores')
      .insert({ name: storeName, user_id })
      .select('id')
      .single()
    if (sErr) throw sErr
    store_id = sInsert.id
  }
  const { data, error } = await supabase
    .from('counts')
    .insert({ user_id, store_id, nome })
    .select('*')
    .single()
  if (error) throw error
  return data as Count
}

export async function savePlanItems(count_id: string, items: { codigo: string; nome: string; saldo: number }[]) {
  if (!items || items.length === 0) {
    throw new Error('Lista de itens não pode estar vazia')
  }
  
  const rows = items.map(r => ({ 
    count_id, 
    codigo: r.codigo.trim(), 
    nome: r.nome.trim(), 
    saldo: Math.max(0, r.saldo) 
  }))
  
  const { error } = await supabase.from('plan_items').insert(rows)
  if (error) throw error
}

export async function addManualEntry(count_id: string, codigo: string, qty: number = 1) {
  if (!codigo.trim()) {
    throw new Error('Código não pode estar vazio')
  }
  
  const { error } = await supabase.from('manual_entries').insert({ 
    count_id, 
    codigo: codigo.trim(), 
    qty: Math.max(1, qty) 
  })
  if (error) throw error
}

export async function listManualEntries(count_id: string) {
  const { data, error } = await supabase
    .from('manual_entries')
    .select('id,count_id,codigo,qty,created_at')
    .eq('count_id', count_id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as { id: string; count_id: string; codigo: string; qty: number; created_at: string }[]
}

export async function updateManualEntry(id: string, changes: { codigo?: string; qty?: number }) {
  const { error } = await supabase.from('manual_entries').update(changes).eq('id', id)
  if (error) throw error
}

export async function deleteManualEntry(id: string) {
  const { error } = await supabase.from('manual_entries').delete().eq('id', id)
  if (error) throw error
}

export async function getCounts(limit = 10, from = 0, search = '') {
  let q = supabase.from('counts').select('*').order('created_at', { ascending: false }).range(from, from + limit - 1)
  if (search) q = q.like('nome', `%${search}%`)
  const { data, error } = await q
  if (error) throw error
  return data as Count[]
}

export async function getCountById(id: string) {
  const { data, error } = await supabase.from('counts').select('*').eq('id', id).single()
  if (error) throw error
  return data as Count
}

export async function getPlanItems(count_id: string) {
  const { data, error } = await supabase.from('plan_items').select('codigo,nome,saldo').eq('count_id', count_id)
  if (error) throw error
  return data as PlanItem[]
}

export async function computeAndSaveResults(count_id: string) {
  const { data: plan, error: pErr } = await supabase.from('plan_items').select('codigo,nome,saldo').eq('count_id', count_id)
  if (pErr) throw pErr

  const { data: entries, error: mErr } = await supabase.from('manual_entries').select('codigo,qty').eq('count_id', count_id)
  if (mErr) throw mErr

  const manualMap = new Map<string, number>()
  for (const e of entries || []) {
    const qty = e.qty ?? 1
    manualMap.set(e.codigo, (manualMap.get(e.codigo) || 0) + qty)
  }

  const planMap = new Map<string, { nome: string; saldo: number }>()
  for (const p of plan || []) {
    planMap.set(p.codigo, { nome: p.nome, saldo: p.saldo })
  }

  const results: any[] = []

  // 1) Regulares e Falta
  for (const [codigo, { nome, saldo }] of planMap.entries()) {
    const m = manualMap.get(codigo) || 0
    if (m === saldo) {
      results.push({ count_id, codigo, status: 'regular', manual_qtd: m, saldo_qtd: saldo, nome_produto: nome })
    } else if (m === 0) {
      results.push({ count_id, codigo, status: 'falta', manual_qtd: 0, saldo_qtd: saldo, nome_produto: nome })
    } else {
      // divergências parciais não entram por especificação
    }
  }

  // 2) Excesso (códigos inseridos que não existem no plano)
  for (const [codigo, qty] of manualMap.entries()) {
    if (!planMap.has(codigo)) {
      results.push({ count_id, codigo, status: 'excesso', manual_qtd: qty, saldo_qtd: 0, nome_produto: '' })
    }
  }

  // Clean previous and insert new
  await supabase.from('results').delete().eq('count_id', count_id)
  
  if (results.length > 0) {
    const { error: rErr } = await supabase.from('results').insert(results)
    if (rErr) throw rErr
  }
  
  return results
}

export async function getResultsByCount(count_id: string) {
  const { data, error } = await supabase.from('results').select('*').eq('count_id', count_id)
  if (error) throw error
  return data as Result[]
}

export async function getTotalsLastCounts(limit = 5) {
  const { data: counts, error } = await supabase.from('counts').select('id,nome,created_at').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  
  const out: { name: string; Regular: number; Excesso: number; Falta: number }[] = []
  
  for (const c of counts || []) {
    const { data: rows, error: rErr } = await supabase.from('results').select('status').eq('count_id', c.id)
    if (rErr) throw rErr
    
    const totals = { Regular: 0, Excesso: 0, Falta: 0 }
    for (const r of rows || []) {
      const status = r.status as string
      if (status === 'regular') totals.Regular++
      else if (status === 'excesso') totals.Excesso++
      else if (status === 'falta') totals.Falta++
    }
    out.push({ name: c.nome, ...totals })
  }
  return out
}
