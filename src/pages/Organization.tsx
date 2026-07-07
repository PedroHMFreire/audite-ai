import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getMyOrg, createOrganization, getOrgMembers, getActiveInvitations,
  createInvitation, revokeInvitation, getInviteLink,
  getCatalog, getCatalogCount, uploadCatalog, clearCatalog, deleteCatalogItem,
  type OrgContext, type OrgMember, type OrgInvitation, type CatalogItem
} from '@/lib/catalog'

type Tab = 'membros' | 'catalogo'

export default function Organization() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | 'loading'>('loading')
  const [tab, setTab] = useState<Tab>('membros')

  useEffect(() => {
    getMyOrg().then(setOrgCtx).catch(() => setOrgCtx(null))
  }, [])

  if (orgCtx === 'loading') {
    return <div className="py-16 text-center text-sm text-zinc-500">Carregando...</div>
  }

  if (!orgCtx) {
    return <CreateOrgForm onCreated={setOrgCtx} />
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">{orgCtx.org.name}</h1>
        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${orgCtx.role === 'admin' ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
          {orgCtx.role === 'admin' ? 'Administrador' : 'Membro'}
        </span>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {(['membros', 'catalogo'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
          >
            {t === 'membros' ? 'Membros' : 'Catálogo de produtos'}
          </button>
        ))}
      </div>

      {tab === 'membros' && <MembersTab orgCtx={orgCtx} />}
      {tab === 'catalogo' && <CatalogTab orgCtx={orgCtx} />}
    </div>
  )
}

// ============================================================
// CRIAR ORGANIZAÇÃO
// ============================================================

function CreateOrgForm({ onCreated }: { onCreated: (ctx: OrgContext) => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createOrganization(name)
      const ctx = await getMyOrg()
      if (ctx) onCreated(ctx)
    } catch (err: any) {
      setError(err.message || 'Erro ao criar organização')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-16 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Criar organização</h1>
        <p className="mt-1 text-sm text-zinc-500">Você ainda não pertence a nenhuma organização. Crie a sua ou peça um convite ao administrador.</p>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome da empresa / loja</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Loja XYZ"
            maxLength={100}
            required
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn w-full" type="submit" disabled={loading || !name.trim()}>
          {loading ? 'Criando...' : 'Criar organização'}
        </button>
      </form>
    </div>
  )
}

// ============================================================
// ABA MEMBROS
// ============================================================

function MembersTab({ orgCtx }: { orgCtx: OrgContext & object }) {
  const [members, setMembers] = useState<OrgMember[]>([])
  const [invites, setInvites] = useState<OrgInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [noteInput, setNoteInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const isAdmin = orgCtx.role === 'admin'

  useEffect(() => {
    Promise.all([getOrgMembers(), isAdmin ? getActiveInvitations() : Promise.resolve([])])
      .then(([m, i]) => { setMembers(m); setInvites(i) })
      .finally(() => setLoading(false))
  }, [isAdmin])

  async function handleCreateInvite() {
    setCreating(true)
    try {
      const inv = await createInvitation(orgCtx.org.id, noteInput)
      setInvites(prev => [inv, ...prev])
      setNoteInput('')
    } catch (err: any) {
      alert('Erro ao criar convite: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeInvitation(id)
      setInvites(prev => prev.filter(i => i.id !== id))
    } catch (err: any) {
      alert('Erro ao revogar convite: ' + err.message)
    }
  }

  async function copyLink(inv: OrgInvitation) {
    await navigator.clipboard.writeText(getInviteLink(inv.token))
    setCopiedId(inv.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return <div className="text-sm text-zinc-500 py-8 text-center">Carregando membros...</div>

  return (
    <div className="space-y-6">
      {/* Lista de membros */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">Membros ({members.length})</h2>
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 -mx-1">
          {members.map(m => (
            <li key={m.id} className="flex items-center justify-between py-2.5 px-1">
              <div>
                <div className="text-sm font-medium">{m.display_name || 'Usuário'}</div>
                <div className="text-xs text-zinc-500">Entrou em {new Date(m.joined_at).toLocaleDateString('pt-BR')}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${m.role === 'admin' ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                {m.role === 'admin' ? 'Admin' : 'Membro'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Convites — apenas admin */}
      {isAdmin && (
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold">Gerar convite</h2>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder="Identificação (opcional, ex: João)"
              maxLength={60}
            />
            <button className="btn flex-shrink-0" onClick={handleCreateInvite} disabled={creating}>
              {creating ? '...' : 'Gerar link'}
            </button>
          </div>

          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Links ativos (expiram em 7 dias)</p>
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    {inv.note && <div className="text-xs font-medium truncate">{inv.note}</div>}
                    <div className="text-xs text-zinc-400 font-mono truncate">{getInviteLink(inv.token)}</div>
                  </div>
                  <button
                    className="badge flex-shrink-0"
                    onClick={() => copyLink(inv)}
                  >
                    {copiedId === inv.id ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                    onClick={() => handleRevoke(inv.id)}
                  >
                    Revogar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// ABA CATÁLOGO
// ============================================================

function CatalogTab({ orgCtx }: { orgCtx: OrgContext & object }) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isAdmin = orgCtx.role === 'admin'
  const PAGE = 50

  const loadItems = useCallback(async (q: string, off: number, replace: boolean) => {
    setLoading(true)
    try {
      const [result, cnt] = await Promise.all([
        getCatalog(q, PAGE, off),
        off === 0 ? getCatalogCount() : Promise.resolve(total)
      ])
      setItems(prev => replace ? result.items : [...prev, ...result.items])
      if (off === 0) setTotal(cnt)
      setHasMore(result.hasMore)
      setOffset(off + PAGE)
    } finally {
      setLoading(false)
    }
  }, [total])

  useEffect(() => {
    loadItems('', 0, true)
  }, [])

  function onSearch(q: string) {
    setSearch(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadItems(q, 0, true), 350)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setUploadMsg(null)
    try {
      const rows = await parseFile(file)
      if (rows.length === 0) { setUploadMsg('Nenhum produto encontrado no arquivo.'); return }
      const count = await uploadCatalog(rows)
      setUploadMsg(`${count} produtos adicionados/atualizados.`)
      loadItems(search, 0, true)
    } catch (err: any) {
      setUploadMsg('Erro: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleClear() {
    if (!confirm(`Apagar TODOS os ${total} produtos do catálogo? Esta ação não pode ser desfeita.`)) return
    setClearing(true)
    try {
      await clearCatalog(orgCtx.org.id)
      setItems([])
      setTotal(0)
      setHasMore(false)
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setClearing(false)
    }
  }

  async function handleDelete(codigo: string) {
    try {
      await deleteCatalogItem(codigo)
      setItems(prev => prev.filter(i => i.codigo !== codigo))
      setTotal(prev => prev - 1)
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message)
    }
  }

  const stats = useMemo(() => {
    if (items.length === 0 && total === 0) return null
    const lastUpdated = items.reduce((acc, i) => i.updated_at > acc ? i.updated_at : acc, '')
    return { lastUpdated }
  }, [items, total])

  return (
    <div className="space-y-5">
      {/* Cabeçalho + estatísticas */}
      <div className="card space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-500">Total de produtos no catálogo</div>
            <div className="text-3xl font-bold tabular-nums">{total.toLocaleString('pt-BR')}</div>
          </div>
          {stats?.lastUpdated && (
            <div className="text-right">
              <div className="text-xs text-zinc-500">Última atualização</div>
              <div className="text-sm font-medium">{new Date(stats.lastUpdated).toLocaleDateString('pt-BR')}</div>
            </div>
          )}
        </div>
      </div>

      {/* Upload — apenas admin */}
      {isAdmin && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold">Importar produtos</h2>
          <p className="text-xs text-zinc-500">Arquivo .xlsx ou .csv com colunas: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">código | nome</code></p>
          <label className="block">
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFile}
              disabled={uploading}
              className="block w-full text-sm file:btn file:py-2 file:px-3 file:mr-3 file:border-0 file:rounded-xl"
            />
          </label>
          {uploading && <p className="text-sm text-primary-500">Processando arquivo...</p>}
          {uploadMsg && <p className={`text-sm ${uploadMsg.startsWith('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>{uploadMsg}</p>}
          {total > 0 && (
            <button
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              onClick={handleClear}
              disabled={clearing}
            >
              {clearing ? 'Apagando...' : `Limpar catálogo (${total} produtos)`}
            </button>
          )}
        </div>
      )}

      {/* Busca e lista */}
      <div className="space-y-3">
        <input
          className="input"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Buscar por código ou nome..."
          autoCapitalize="off" autoCorrect="off" spellCheck={false}
        />
        {loading && items.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">Carregando catálogo...</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            {search ? 'Nenhum produto encontrado.' : 'Catálogo vazio. Importe produtos para começar.'}
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900 text-left border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold text-zinc-700 dark:text-zinc-300">Código</th>
                    <th className="py-2.5 px-4 font-semibold text-zinc-700 dark:text-zinc-300">Nome</th>
                    {isAdmin && <th className="py-2.5 px-4 w-16" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                      <td className="py-2.5 px-4 font-mono text-zinc-900 dark:text-white">{item.codigo}</td>
                      <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">{item.nome || <span className="italic text-zinc-400">Sem nome</span>}</td>
                      {isAdmin && (
                        <td className="py-2.5 px-4 text-right">
                          <button
                            className="text-xs text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(item.codigo)}
                          >
                            Remover
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <button
                className="btn-ghost w-full text-sm"
                onClick={() => loadItems(search, offset, false)}
                disabled={loading}
              >
                {loading ? 'Carregando...' : `Carregar mais (mostrando ${items.length} de ${total})`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================
// PARSING DE ARQUIVO
// ============================================================

async function parseFile(file: File): Promise<{ codigo: string; nome: string }[]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) {
    const text = await file.text()
    return parseCsvCatalog(text)
  }
  if (name.endsWith('.xlsx')) {
    const arrayBuffer = await file.arrayBuffer()
    const { Workbook } = await import('exceljs')
    const wb = new Workbook()
    await wb.xlsx.load(arrayBuffer)
    const ws = wb.worksheets[0]
    if (!ws) return []
    const rows: { codigo: string; nome: string }[] = []
    let firstRow = true
    ws.eachRow(row => {
      if (firstRow) { firstRow = false; return }
      const vals = Array.isArray(row.values) ? row.values.slice(1) : []
      const codigo = String(vals[0] ?? '').trim()
      const nome = String(vals[1] ?? '').trim()
      if (codigo) rows.push({ codigo, nome })
    })
    return rows
  }
  throw new Error('Formato inválido. Use .xlsx ou .csv')
}

function parseCsvCatalog(text: string): { codigo: string; nome: string }[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  const delimiter = lines[0]?.includes(';') ? ';' : ','
  const rows: { codigo: string; nome: string }[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter)
    const codigo = (cols[0] ?? '').replace(/"/g, '').trim()
    const nome = (cols[1] ?? '').replace(/"/g, '').trim()
    if (codigo) rows.push({ codigo, nome })
  }
  return rows
}
