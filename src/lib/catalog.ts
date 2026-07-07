import { supabase } from './supabaseClient'

// ============================================================
// TIPOS
// ============================================================

export type Organization = {
  id: string
  name: string
  created_by: string
  created_at: string
}

export type OrgMember = {
  id: string
  org_id: string
  user_id: string
  role: 'admin' | 'member'
  display_name: string | null
  joined_at: string
}

export type OrgInvitation = {
  id: string
  org_id: string
  invited_by: string
  token: string
  note: string | null
  accepted_at: string | null
  accepted_by: string | null
  expires_at: string
  created_at: string
}

export type CatalogItem = {
  id: string
  org_id: string
  codigo: string
  nome: string
  updated_at: string
}

export type OrgContext = {
  org: Organization
  role: 'admin' | 'member'
} | null

// ============================================================
// ORGANIZAÇÃO
// ============================================================

export async function getMyOrg(): Promise<OrgContext> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role, display_name, organizations(id, name, created_by, created_at)')
    .maybeSingle()

  if (error || !data) return null
  const org = (data as any).organizations as Organization
  if (!org) return null
  return { org, role: data.role as 'admin' | 'member' }
}

export async function createOrganization(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_organization', { p_name: name.trim() })
  if (error) throw new Error(error.message)
  return data as string
}

// ============================================================
// MEMBROS
// ============================================================

export async function getOrgMembers(): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .order('joined_at')
  if (error) throw error
  return (data || []) as OrgMember[]
}

// ============================================================
// CONVITES
// ============================================================

export async function createInvitation(orgId: string, note?: string): Promise<OrgInvitation> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('organization_invitations')
    .insert({ org_id: orgId, invited_by: session.user.id, note: note?.trim() || null })
    .select('*')
    .single()
  if (error) throw error
  return data as OrgInvitation
}

export async function getActiveInvitations(): Promise<OrgInvitation[]> {
  const { data, error } = await supabase
    .from('organization_invitations')
    .select('*')
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as OrgInvitation[]
}

export async function revokeInvitation(id: string): Promise<void> {
  // Força expiração imediata
  const { error } = await supabase
    .from('organization_invitations')
    .update({ expires_at: new Date(0).toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function acceptInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })
  if (error) throw new Error(error.message)
  return data as string
}

export async function getInvitationByToken(token: string): Promise<(OrgInvitation & { org_name?: string }) | null> {
  const { data, error } = await supabase
    .from('organization_invitations')
    .select('*, organizations(name)')
    .eq('token', token)
    .maybeSingle()
  if (error || !data) return null
  return { ...data, org_name: (data as any).organizations?.name } as any
}

export function getInviteLink(token: string): string {
  return `${window.location.origin}/convite/${token}`
}

// ============================================================
// CATÁLOGO DE PRODUTOS
// ============================================================

export async function uploadCatalog(
  items: { codigo: string; nome: string }[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const CHUNK = 500
  let inserted = 0
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK)
    const { data, error } = await supabase.rpc('bulk_upsert_catalog', { p_items: chunk })
    if (error) throw new Error(error.message)
    inserted += (data as number) || 0
    onProgress?.(Math.min(i + CHUNK, items.length), items.length)
  }
  return inserted
}

export async function getCatalog(
  search = '',
  limit = 50,
  offset = 0
): Promise<{ items: CatalogItem[]; hasMore: boolean }> {
  let query = supabase
    .from('product_catalog')
    .select('id, org_id, codigo, nome, updated_at')
    .order('codigo')
    .range(offset, offset + limit - 1)

  const q = search.trim()
  if (q) query = query.or(`codigo.ilike.%${q}%,nome.ilike.%${q}%`)

  const { data, error } = await query
  if (error) throw error
  const items = (data || []) as CatalogItem[]
  return { items, hasMore: items.length === limit }
}

export async function getCatalogCount(): Promise<number> {
  const { count, error } = await supabase
    .from('product_catalog')
    .select('*', { count: 'exact', head: true })
  if (error) return 0
  return count || 0
}

export async function lookupProduct(codigo: string): Promise<CatalogItem | null> {
  const { data, error } = await supabase
    .from('product_catalog')
    .select('id, org_id, codigo, nome, updated_at')
    .eq('codigo', codigo)
    .maybeSingle()
  if (error || !data) return null
  return data as CatalogItem
}

export async function batchLookupProducts(codes: string[]): Promise<Map<string, string>> {
  if (codes.length === 0) return new Map()
  const { data, error } = await supabase
    .from('product_catalog')
    .select('codigo, nome')
    .in('codigo', codes)
  if (error) return new Map()
  const map = new Map<string, string>()
  for (const item of data || []) map.set(item.codigo, item.nome)
  return map
}

export async function deleteCatalogItem(codigo: string): Promise<void> {
  const { error } = await supabase.from('product_catalog').delete().eq('codigo', codigo)
  if (error) throw error
}

export async function clearCatalog(orgId: string): Promise<void> {
  const { error } = await supabase.from('product_catalog').delete().eq('org_id', orgId)
  if (error) throw error
}
