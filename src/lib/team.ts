/**
 * Equipe da loja no cronograma: vendedores, quem responde por cada categoria
 * e por cada contagem programada, e a geração do roteiro cíclico.
 */
import { supabase } from './supabaseClient'
import {
  createScheduleConfig, getCategories, getCurrentUserId,
  type Category, type ScheduleConfig, type ScheduleItem,
} from './db'
import { toLocalISODate } from './scheduleDates'
import { legacyShape, planCycles, type Frequency, type TrackedItem } from './roteiro'

export type Seller = {
  id: string
  user_id: string
  name: string
  phone: string | null
  is_active: boolean
  created_at: string
}

// ===== Vendedores =====

/** Vendedores da conta, em ordem alfabética. Os removidos só vêm com `includeInactive`. */
export async function getSellers(includeInactive = false): Promise<Seller[]> {
  let query = supabase.from('sellers').select('*').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return data as Seller[]
}

export async function createSeller(name: string, phone: string | null): Promise<Seller> {
  const user_id = await getCurrentUserId()
  const { data, error } = await supabase
    .from('sellers')
    .insert({ user_id, name: name.trim(), phone: phone?.trim() || null })
    .select('*')
    .single()
  if (error) throw error
  return data as Seller
}

export async function updateSeller(id: string, changes: { name: string; phone: string | null }): Promise<void> {
  const { error } = await supabase
    .from('sellers')
    .update({ name: changes.name.trim(), phone: changes.phone?.trim() || null })
    .eq('id', id)
  if (error) throw error
}

/**
 * Tira o vendedor da equipe. Ele deixa de responder pelas categorias e pelas
 * contagens ainda não feitas; as já feitas continuam com o nome dele.
 */
export async function removeSeller(id: string): Promise<void> {
  const { error } = await supabase.from('sellers').update({ is_active: false }).eq('id', id)
  if (error) throw error
  const unlink = await supabase.from('category_sellers').delete().eq('seller_id', id)
  if (unlink.error) throw unlink.error

  const { data: links, error: linksError } = await supabase
    .from('schedule_item_sellers')
    .select('schedule_item_id, schedule_items!inner(status, count_id)')
    .eq('seller_id', id)
    .eq('schedule_items.status', 'pending')
    .is('schedule_items.count_id', null)
  if (linksError) throw linksError
  const open = (links || []).map((l) => l.schedule_item_id as string)
  if (open.length) {
    const { error: e } = await supabase.from('schedule_item_sellers').delete().eq('seller_id', id).in('schedule_item_id', open)
    if (e) throw e
  }
}

// ===== Responsáveis =====

/** Responsáveis padrão por categoria: id da categoria → ids dos vendedores. */
export async function getCategorySellers(): Promise<Map<string, string[]>> {
  const { data, error } = await supabase.from('category_sellers').select('category_id, seller_id')
  if (error) throw error
  const map = new Map<string, string[]>()
  for (const row of data || []) {
    const list = map.get(row.category_id) || []
    list.push(row.seller_id)
    map.set(row.category_id, list)
  }
  return map
}

async function replaceLinks(
  table: 'category_sellers' | 'schedule_item_sellers',
  ownerColumn: string, ownerId: string, otherColumn: string, otherIds: string[],
): Promise<void> {
  const { error } = await supabase.from(table).delete().eq(ownerColumn, ownerId)
  if (error) throw error
  if (otherIds.length === 0) return
  const rows = [...new Set(otherIds)].map((other) => ({ [ownerColumn]: ownerId, [otherColumn]: other }))
  const { error: insertError } = await supabase.from(table).insert(rows)
  if (insertError) throw insertError
}

/** Define quem responde por uma categoria. Lista vazia = toda a equipe. */
export function setCategorySellers(categoryId: string, sellerIds: string[]): Promise<void> {
  return replaceLinks('category_sellers', 'category_id', categoryId, 'seller_id', sellerIds)
}

/** Define as categorias de um vendedor. */
export function setSellerCategories(sellerId: string, categoryIds: string[]): Promise<void> {
  return replaceLinks('category_sellers', 'seller_id', sellerId, 'category_id', categoryIds)
}

/** Define quem faz uma contagem programada. Lista vazia = toda a equipe. */
export function setItemSellers(itemId: string, sellerIds: string[]): Promise<void> {
  return replaceLinks('schedule_item_sellers', 'schedule_item_id', itemId, 'seller_id', sellerIds)
}

// ===== Quadro do cronograma =====

export type BoardItem = ScheduleItem & TrackedItem & {
  category: Pick<Category, 'name' | 'color'>
  /** Nomes dos responsáveis, na ordem alfabética; vazio = toda a equipe. */
  sellerNames: string[]
  /** A contagem ligada a este item já foi finalizada. */
  countDone: boolean
}

export type Board = {
  items: BoardItem[]
  /** Equipe atual (sem os removidos). */
  sellers: Seller[]
  categories: Category[]
}

/**
 * Tudo o que as telas do cronograma mostram: as contagens programadas com
 * categoria, responsáveis e situação, mais a equipe e as categorias.
 */
export async function loadBoard(): Promise<Board> {
  const [itemsRes, allSellers, categories] = await Promise.all([
    supabase
      .from('schedule_items')
      .select('*, schedule_item_sellers(seller_id)')
      .is('archived_at', null)
      .order('scheduled_date'),
    getSellers(true),
    getCategories(),
  ])
  if (itemsRes.error) throw itemsRes.error
  const raw = (itemsRes.data || []) as (ScheduleItem & { schedule_item_sellers: { seller_id: string }[] })[]

  const finishedOn = new Map<string, string | null>()
  const countIds = raw.map((i) => i.count_id).filter(Boolean) as string[]
  if (countIds.length) {
    const { data, error } = await supabase.from('counts').select('id, finished_at').in('id', countIds).eq('status', 'finalizada')
    if (error) throw error
    for (const c of data || []) finishedOn.set(c.id, c.finished_at)
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const sellerById = new Map(allSellers.map((s) => [s.id, s]))
  const localDay = (ts?: string | null) => (ts ? toLocalISODate(new Date(ts)) : null)

  const items = raw.map(({ schedule_item_sellers, ...item }): BoardItem => {
    const countDone = !!item.count_id && finishedOn.has(item.count_id)
    const assigned = schedule_item_sellers
      .map((l) => sellerById.get(l.seller_id))
      .filter((s): s is Seller => !!s)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    return {
      ...item,
      category: categoryById.get(item.category_id) || { name: 'Categoria removida', color: '#A29E96' },
      countDone,
      done: item.status === 'completed' || countDone,
      doneOn: localDay(item.completed_at) || (countDone ? localDay(finishedOn.get(item.count_id!)) : null),
      sellerIds: assigned.map((s) => s.id),
      sellerNames: assigned.map((s) => s.name),
    }
  })

  return { items, sellers: allSellers.filter((s) => s.is_active), categories }
}

// ===== Roteiro cíclico =====

export type RoteiroInput = {
  name: string
  frequency: Frequency
  start_date: string
  cycles: number
  work_days: number[]
  instructions: string
}

/**
 * Cria o roteiro e programa as contagens num passo só. As contagens ainda não
 * feitas de roteiros anteriores, da data de início em diante, saem do
 * calendário para não ficarem em dobro; o que já passou continua no histórico.
 */
export async function createRoteiro(input: RoteiroInput): Promise<{ config: ScheduleConfig; total: number }> {
  const categories = await getCategories()
  if (categories.length === 0) throw new Error('Cadastre as categorias antes de gerar o roteiro.')

  const user_id = await getCurrentUserId()
  const { data: previous, error: previousError } = await supabase.from('schedule_configs').select('id').eq('user_id', user_id)
  if (previousError) throw previousError

  const config = await createScheduleConfig({
    name: input.name,
    ...legacyShape(input.frequency, input.cycles, categories.length),
    start_date: input.start_date,
    work_days: input.work_days,
    is_active: true,
    frequency: input.frequency,
    cycles: input.cycles,
    instructions: input.instructions.trim() || undefined,
  })

  const previousIds = (previous || []).map((p) => p.id as string)
  if (previousIds.length) {
    const { error } = await supabase
      .from('schedule_items')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .in('config_id', previousIds)
      .eq('status', 'pending')
      .is('count_id', null)
      .is('archived_at', null)
      .gte('scheduled_date', input.start_date)
    if (error) throw error
  }

  return { config, total: await generateRoteiro(config) }
}

/**
 * (Re)programa as contagens de um roteiro cíclico com as categorias e os
 * responsáveis de agora. Devolve quantas contagens foram programadas.
 */
export async function generateRoteiro(config: ScheduleConfig): Promise<number> {
  if (!config.frequency || !config.cycles) throw new Error('Este cronograma não é um roteiro cíclico.')
  const [categories, bySeller, sellers] = await Promise.all([getCategories(), getCategorySellers(), getSellers()])
  if (categories.length === 0) throw new Error('Cadastre as categorias antes de gerar o roteiro.')

  const plan = planCycles({
    categoryIds: categories.map((c) => c.id),
    frequency: config.frequency,
    startDate: config.start_date,
    cycles: config.cycles,
    workDays: config.work_days,
  })
  if (plan.length === 0) throw new Error('Nenhum dia de trabalho no período escolhido.')

  const { error: archiveError } = await supabase
    .from('schedule_items')
    .update({ status: 'archived', archived_at: new Date().toISOString() })
    .eq('config_id', config.id)
    .is('archived_at', null)
  if (archiveError) throw archiveError

  const { data: inserted, error } = await supabase
    .from('schedule_items')
    .insert(plan.map((p) => ({
      config_id: config.id,
      category_id: p.categoryId,
      scheduled_date: p.date,
      week_number: p.weekNumber,
      day_of_week: p.dayOfWeek,
      status: 'pending',
    })))
    .select('id, category_id')
  if (error) throw error

  const active = new Set(sellers.map((s) => s.id))
  const links = (inserted || []).flatMap((item) =>
    (bySeller.get(item.category_id) || [])
      .filter((sellerId) => active.has(sellerId))
      .map((seller_id) => ({ schedule_item_id: item.id as string, seller_id })))
  if (links.length) {
    const { error: linkError } = await supabase.from('schedule_item_sellers').insert(links)
    if (linkError) throw linkError
  }

  const { error: configError } = await supabase
    .from('schedule_configs')
    .update({ generated_at: new Date().toISOString(), end_date: plan[plan.length - 1].date })
    .eq('id', config.id)
  if (configError) throw configError

  return plan.length
}
