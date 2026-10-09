import { supabase } from './supabaseClient'

export type Profile = {
  id: string
  store_name: string | null
  owner_name: string | null
  phone: string | null
}

export async function getProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, store_name, owner_name, phone')
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function updateProfile(changes: Pick<Profile, 'store_name' | 'owner_name' | 'phone'>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { error } = await supabase
    .from('user_profiles')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) throw error
  // Mantém os metadados da sessão em dia (o nome da loja aparece no início).
  await supabase.auth.updateUser({ data: { store_name: changes.store_name, owner_name: changes.owner_name } })
}

async function fetchAll(table: string): Promise<unknown[]> {
  const PAGE = 1000
  const rows: unknown[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return rows
}

/**
 * Exporta tudo o que o usuário tem no Audite em um arquivo JSON (LGPD:
 * direito de acesso e portabilidade). As regras do banco garantem que só
 * os dados do próprio usuário são devolvidos.
 */
export async function exportMyData(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const tables = [
    'user_profiles', 'subscriptions', 'counts', 'plan_items', 'manual_entries', 'results',
    'divergence_justifications', 'categories', 'schedule_configs', 'schedule_items', 'product_catalog',
  ]
  const dump: Record<string, unknown> = {
    exportado_em: new Date().toISOString(),
    conta: { id: user.id, email: user.email, criada_em: user.created_at },
  }
  for (const table of tables) dump[table] = await fetchAll(table)

  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audite-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) {
    if (/assinatura_ativa/.test(error.message)) {
      throw new Error('Cancele sua assinatura antes de excluir a conta. Isso evita novas cobranças.')
    }
    throw error
  }
  await supabase.auth.signOut().catch(() => {})
}
