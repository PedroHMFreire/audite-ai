import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  archiveCount,
  deleteCount,
  getCounts,
  updateCountName,
  type Count
} from '@/lib/db'
import { SkeletonLoader } from '@/components/SkeletonLoader'
import { EmptyState } from '@/components/EmptyState'
import { EmptyCountsIllustration } from '@/components/illustrations/EmptyCountsIllustration'
import { useToast } from '@/components/Toast'

type StatusFilter = 'ativas' | 'em_andamento' | 'finalizada' | 'reaberta' | 'arquivada'

const PAGE_SIZE = 10

export default function Counts() {
  const [items, setItems] = useState<Count[]>([])
  const [from, setFrom] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [q, setQ] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ativas')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const nav = useNavigate()
  const { addToast } = useToast()

  async function load(reset = false, nextSearch = appliedSearch, nextStatus = statusFilter) {
    if (loading) return
    if (!reset && done) return

    setLoading(true)
    try {
      const start = reset ? 0 : from
      const data = await getCounts(PAGE_SIZE, start, nextSearch, nextStatus)

      if (reset) {
        setItems(data)
        setFrom(data.length)
      } else {
        setItems(prev => [...prev, ...data])
        setFrom(start + data.length)
      }

      setDone(data.length < PAGE_SIZE)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar contagens'
      addToast({ type: 'error', message: 'Erro ao carregar contagens', description: message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(true, appliedSearch, statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  function search() {
    const nextSearch = q.trim()
    setAppliedSearch(nextSearch)
    setDone(false)
    load(true, nextSearch, statusFilter)
  }

  function clearSearch() {
    setQ('')
    setAppliedSearch('')
    setDone(false)
    load(true, '', statusFilter)
  }

  function startRename(count: Count) {
    setEditingId(count.id)
    setEditingName(count.nome)
  }

  async function saveRename(count: Count) {
    const nextName = editingName.trim()
    if (!nextName || nextName === count.nome) {
      setEditingId(null)
      return
    }

    setActionId(count.id)
    try {
      const updated = await updateCountName(count.id, nextName)
      setItems(prev => prev.map(item => item.id === count.id ? updated : item))
      addToast({ type: 'success', message: 'Contagem renomeada', duration: 2000 })
      setEditingId(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao renomear contagem'
      addToast({ type: 'error', message: 'Erro ao renomear', description: message })
    } finally {
      setActionId(null)
    }
  }

  async function handleArchive(count: Count) {
    if (!confirm(`Arquivar a contagem "${count.nome}"? Ela sairÃ¡ da lista de ativas.`)) return

    setActionId(count.id)
    try {
      const updated = await archiveCount(count.id)
      if (statusFilter === 'arquivada') {
        setItems(prev => prev.map(item => item.id === count.id ? updated : item))
      } else {
        setItems(prev => prev.filter(item => item.id !== count.id))
      }
      addToast({ type: 'info', message: 'Contagem arquivada', duration: 2000 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao arquivar contagem'
      addToast({ type: 'error', message: 'Erro ao arquivar', description: message })
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(count: Count) {
    if (!confirm(`Excluir definitivamente a contagem "${count.nome}"? Esta aÃ§Ã£o remove planilha, entradas e resultados vinculados.`)) return

    setActionId(count.id)
    try {
      await deleteCount(count.id)
      setItems(prev => prev.filter(item => item.id !== count.id))
      addToast({ type: 'info', message: 'Contagem excluÃ­da', duration: 2000 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir contagem'
      addToast({ type: 'error', message: 'Erro ao excluir', description: message })
    } finally {
      setActionId(null)
    }
  }

  const emptyCopy = getEmptyCopy(Boolean(appliedSearch), statusFilter)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Contagens</h1>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Pesquisar por nome"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') search()
              if (e.key === 'Escape' && q) clearSearch()
            }}
          />
          <button className="btn" onClick={search} disabled={loading}>Pesquisar</button>
        </div>

        <div className="flex flex-wrap gap-2">
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => {
                setStatusFilter(option.value)
                setDone(false)
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                statusFilter === option.value
                  ? option.activeClass
                  : option.idleClass
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {loading && from === 0 ? (
          <SkeletonLoader />
        ) : items.length === 0 ? (
          <EmptyState
            title={emptyCopy.title}
            description={emptyCopy.description}
            illustration={<EmptyCountsIllustration />}
            action={{
              label: appliedSearch ? 'Limpar pesquisa' : 'Ir para dashboard',
              onClick: () => appliedSearch ? clearSearch() : nav('/dashboard')
            }}
          />
        ) : (
          items.map(it => {
            const statusBadge = getStatusBadge(it.status)
            const busy = actionId === it.id

            return (
              <li key={it.id} className="card space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editingId === it.id ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          className="input flex-1"
                          value={editingName}
                          maxLength={100}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveRename(it)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button className="btn" onClick={() => saveRename(it)} disabled={busy}>Salvar</button>
                          <button className="badge" onClick={() => setEditingId(null)} disabled={busy}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{it.nome}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(it.created_at).toLocaleString()}</div>
                      </>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusBadge.bg} ${statusBadge.text}`}>
                    {statusBadge.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link className="badge" to={`/contagens/${it.id}`}>Abrir</Link>
                  {editingId !== it.id && (
                    <button className="badge" onClick={() => startRename(it)} disabled={busy}>Renomear</button>
                  )}
                  {it.status !== 'arquivada' && (
                    <button className="badge" onClick={() => handleArchive(it)} disabled={busy}>Arquivar</button>
                  )}
                  <button className="badge bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete(it)} disabled={busy}>
                    Excluir
                  </button>
                </div>
              </li>
            )
          })
        )}
      </ul>

      {!done && items.length > 0 && (
        <div className="text-center">
          <button className="btn" onClick={() => load(false)} disabled={loading}>
            {loading ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}
      {done && items.length > 0 && <div className="text-center text-sm text-zinc-500">Fim da lista</div>}
    </div>
  )
}

const filterOptions: Array<{
  value: StatusFilter
  label: string
  activeClass: string
  idleClass: string
}> = [
  { value: 'ativas', label: 'Ativas', activeClass: 'bg-zinc-900 text-white', idleClass: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' },
  { value: 'em_andamento', label: 'Em andamento', activeClass: 'bg-blue-600 text-white', idleClass: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { value: 'finalizada', label: 'Finalizadas', activeClass: 'bg-green-600 text-white', idleClass: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { value: 'reaberta', label: 'Reabertas', activeClass: 'bg-purple-600 text-white', idleClass: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  { value: 'arquivada', label: 'Arquivadas', activeClass: 'bg-zinc-600 text-white', idleClass: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' }
]

function getStatusBadge(status: string | null) {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    em_andamento: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Em andamento' },
    finalizada: { bg: 'bg-green-100', text: 'text-green-800', label: 'Finalizada' },
    reaberta: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Reaberta' },
    reavertida: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Reaberta' },
    arquivada: { bg: 'bg-zinc-100', text: 'text-zinc-800', label: 'Arquivada' }
  }

  return badges[status || ''] || { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pendente' }
}

function getEmptyCopy(hasSearch: boolean, status: StatusFilter) {
  if (hasSearch) {
    return {
      title: 'Nenhuma contagem encontrada',
      description: 'Tente outro nome ou limpe a pesquisa para ver todas as contagens deste filtro.'
    }
  }

  if (status === 'arquivada') {
    return {
      title: 'Nenhuma contagem arquivada',
      description: 'As contagens arquivadas ficam guardadas aqui quando voce retira itens da lista principal.'
    }
  }

  if (status !== 'ativas') {
    return {
      title: 'Nenhuma contagem neste status',
      description: 'Troque o filtro para ver outras contagens ou crie uma nova pelo dashboard.'
    }
  }

  return {
    title: 'Nenhuma contagem ainda',
    description: 'Crie sua primeira contagem no dashboard para comecar.'
  }
}
