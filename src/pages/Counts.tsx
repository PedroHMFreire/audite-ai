import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { archiveCount, deleteCount, getCounts, restoreCount, updateCountName, type Count } from '@/lib/db'
import { AccessNotice, useCanWrite } from '@/components/AccessGate'
import ConfirmDialog from '@/components/ConfirmDialog'
import NewCountForm from '@/components/NewCountForm'
import { useToast } from '@/components/Toast'

type Filter = 'ativas' | 'em_andamento' | 'finalizada' | 'arquivada'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ativas', label: 'Todas' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'finalizada', label: 'Finalizadas' },
  { value: 'arquivada', label: 'Arquivadas' },
]

const PAGE_SIZE = 20

function statusOf(status: string | null): { label: string; className: string } {
  if (status === 'finalizada') return { label: 'Finalizada', className: 'badge badge-success' }
  if (status === 'arquivada') return { label: 'Arquivada', className: 'badge' }
  if (status === 'reaberta' || status === 'reavertida') return { label: 'Reaberta', className: 'badge badge-warning' }
  return { label: 'Em andamento', className: 'badge' }
}

export default function Counts() {
  const { addToast } = useToast()
  const canWrite = useCanWrite()
  const [items, setItems] = useState<Count[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ativas')
  const [creating, setCreating] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; nome: string } | null>(null)
  const [toDelete, setToDelete] = useState<Count | null>(null)
  const requestRef = useRef(0)

  async function load(reset: boolean) {
    const request = ++requestRef.current
    setLoading(true)
    try {
      const from = reset ? 0 : items.length
      // "Em andamento" inclui as reabertas: para o lojista é a mesma coisa.
      const data = filter === 'em_andamento'
        ? (await getCounts(PAGE_SIZE * 5, 0, query, 'ativas')).filter((c) => c.status !== 'finalizada')
        : await getCounts(PAGE_SIZE, from, query, filter)
      if (request !== requestRef.current) return // chegou uma busca mais nova
      setItems(reset || filter === 'em_andamento' ? data : [...items, ...data])
      setHasMore(filter !== 'em_andamento' && data.length === PAGE_SIZE)
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível carregar as contagens', description: err instanceof Error ? err.message : undefined })
    } finally {
      if (request === requestRef.current) setLoading(false)
    }
  }

  // Busca enquanto digita, com uma pequena espera.
  useEffect(() => {
    const timer = setTimeout(() => load(true), query ? 300 : 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filter])

  useEffect(() => {
    if (!menuId) return
    const close = () => setMenuId(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuId])

  async function act(fn: () => Promise<void>, failMessage: string) {
    try {
      await fn()
    } catch (err) {
      addToast({ type: 'error', message: failMessage, description: err instanceof Error ? err.message : undefined })
    }
  }

  const saveRename = () => act(async () => {
    if (!renaming) return
    const nome = renaming.nome.trim()
    const current = items.find((c) => c.id === renaming.id)
    setRenaming(null)
    if (!nome || !current || nome === current.nome) return
    const updated = await updateCountName(current.id, nome)
    setItems((prev) => prev.map((c) => (c.id === current.id ? { ...c, ...updated } : c)))
  }, 'Não foi possível renomear')

  const archive = (c: Count) => act(async () => {
    await archiveCount(c.id)
    setItems((prev) => prev.filter((i) => i.id !== c.id))
    addToast({ type: 'info', message: 'Contagem arquivada', description: 'Ela fica guardada em “Arquivadas”.', duration: 3000 })
  }, 'Não foi possível arquivar')

  const restore = (c: Count) => act(async () => {
    await restoreCount(c.id)
    setItems((prev) => prev.filter((i) => i.id !== c.id))
    addToast({ type: 'info', message: 'Contagem restaurada', duration: 2500 })
  }, 'Não foi possível restaurar')

  const remove = () => act(async () => {
    const c = toDelete
    setToDelete(null)
    if (!c) return
    await deleteCount(c.id)
    setItems((prev) => prev.filter((i) => i.id !== c.id))
    addToast({ type: 'info', message: 'Contagem excluída', duration: 2500 })
  }, 'Não foi possível excluir')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="page-title">Contagens</h1>
        {canWrite && !creating && (
          <button type="button" className="btn" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Nova contagem
          </button>
        )}
      </header>

      <AccessNotice />
      {creating && canWrite && <NewCountForm autoFocus hint={false} />}

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <input
            type="search"
            className="input pl-9"
            placeholder="Buscar pelo nome"
            aria-label="Buscar contagem pelo nome"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Filtrar contagens">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                filter === f.value ? 'border-ink bg-ink text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-2" aria-busy="true">
          <div className="skeleton h-16" /><div className="skeleton h-16" /><div className="skeleton h-16" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center">
          <p className="font-medium">{emptyTitle(query, filter)}</p>
          <p className="mt-1 text-sm text-zinc-500">{emptyText(query, filter)}</p>
          {!query && filter === 'ativas' && canWrite && !creating && (
            <button type="button" className="btn mt-5" onClick={() => setCreating(true)}>Criar a primeira contagem</button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {items.map((c) => {
            const status = statusOf(c.status)
            const done = c.status === 'finalizada'
            const href = done ? `/relatorio/${c.id}` : `/contagens/${c.id}`
            return (
              <li key={c.id} className="relative flex items-center gap-2 pr-2">
                {renaming?.id === c.id ? (
                  <form className="flex flex-1 gap-2 px-4 py-3" onSubmit={(e) => { e.preventDefault(); void saveRename() }}>
                    <input
                      className="input flex-1"
                      aria-label="Novo nome da contagem"
                      maxLength={100}
                      autoFocus
                      value={renaming.nome}
                      onChange={(e) => setRenaming({ id: c.id, nome: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(null) }}
                    />
                    <button type="submit" className="btn">Salvar</button>
                  </form>
                ) : (
                  <>
                    <Link to={c.status === 'arquivada' ? '#' : href} onClick={(e) => { if (c.status === 'arquivada') e.preventDefault() }}
                      className={`flex min-w-0 flex-1 items-center justify-between gap-3 py-4 pl-4 sm:pl-5 ${c.status === 'arquivada' ? 'cursor-default' : ''}`}>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.nome}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`${status.className} shrink-0`}>{status.label}</span>
                    </Link>
                    <button
                      type="button"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-ink"
                      aria-label={`Mais opções para ${c.nome}`}
                      aria-haspopup="menu"
                      aria-expanded={menuId === c.id}
                      onClick={(e) => { e.stopPropagation(); setMenuId(menuId === c.id ? null : c.id) }}
                    >
                      <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {menuId === c.id && (
                      <div role="menu" className="absolute right-2 top-12 z-20 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg animate-scale-in">
                        {done && <MenuLink to={`/contagens/${c.id}`}>Ver itens contados</MenuLink>}
                        <MenuItem onClick={() => setRenaming({ id: c.id, nome: c.nome })}>Renomear</MenuItem>
                        {c.status === 'arquivada'
                          ? <MenuItem onClick={() => restore(c)}>Restaurar</MenuItem>
                          : <MenuItem onClick={() => archive(c)}>Arquivar</MenuItem>}
                        <MenuItem danger onClick={() => setToDelete(c)}>Excluir</MenuItem>
                      </div>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {hasMore && (
        <button type="button" className="btn btn-secondary w-full" onClick={() => load(false)} disabled={loading}>
          {loading ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir esta contagem?"
        description={toDelete ? `“${toDelete.nome}” será apagada com a planilha, os itens contados e o relatório. Isso não pode ser desfeito.` : ''}
        confirmLabel="Excluir"
        destructive
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick}
      className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-50 ${danger ? 'text-red-600' : 'text-ink'}`}>
      {children}
    </button>
  )
}

function MenuLink({ children, to }: { children: React.ReactNode; to: string }) {
  return <Link role="menuitem" to={to} className="block px-3 py-2.5 text-sm hover:bg-zinc-50">{children}</Link>
}

function emptyTitle(query: string, filter: Filter) {
  if (query) return 'Nenhuma contagem com esse nome'
  if (filter === 'arquivada') return 'Nada arquivado'
  if (filter === 'finalizada') return 'Nenhuma contagem finalizada'
  if (filter === 'em_andamento') return 'Nenhuma contagem em andamento'
  return 'Você ainda não fez nenhuma contagem'
}

function emptyText(query: string, filter: Filter) {
  if (query) return 'Confira a grafia ou limpe a busca.'
  if (filter === 'arquivada') return 'Contagens arquivadas saem da lista principal e ficam guardadas aqui.'
  if (filter === 'ativas') return 'Crie uma, importe a planilha do estoque e comece a bipar.'
  return 'Troque o filtro para ver as outras.'
}
