import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCounts } from '@/lib/db'
import { SkeletonLoader } from '@/components/SkeletonLoader'
import { EmptyState } from '@/components/EmptyState'
import { EmptyCountsIllustration } from '@/components/illustrations/EmptyCountsIllustration'

type StatusFilter = 'todas' | 'em_andamento' | 'finalizada' | 'reavertida'

export default function Counts() {
  const [items, setItems] = useState<any[]>([])
  const [from, setFrom] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas')
  const nav = useNavigate()

  async function load(reset = false) {
    if (loading || done) return
    setLoading(true)
    try {
      const start = reset ? 0 : from
      const data = await getCounts(10, start, q)
      if (reset) {
        setItems(data); setFrom(10); setDone(data.length < 10)
      } else {
        setItems(prev => [...prev, ...data])
        setFrom(start + 10)
        if (data.length < 10) setDone(true)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(true) }, [])
  function search() { setDone(false); load(true) }
  
  // Filtrar itens por status
  const filteredItems = statusFilter === 'todas' 
    ? items 
    : items.filter(it => it.status === statusFilter)
  
  // Helpers para status
  const getStatusBadge = (status: string | null) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'em_andamento': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Em andamento' },
      'finalizada': { bg: 'bg-green-100', text: 'text-green-800', label: 'Finalizada' },
      'reavertida': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Reavertida' }
    }
    const badge = badges[status || ''] || { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pendente' }
    return badge
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Contagens</h1>
      
      {/* Barra de pesquisa e filtros */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <input 
            className="input flex-1" 
            placeholder="Pesquisar por nome" 
            value={q} 
            onChange={e => setQ(e.target.value)} 
          />
          <button className="btn" onClick={search}>Pesquisar</button>
        </div>
        
        {/* Filtros por status */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('todas')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              statusFilter === 'todas' 
                ? 'bg-zinc-900 text-white' 
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setStatusFilter('em_andamento')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              statusFilter === 'em_andamento'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            <span className="sm:hidden">And.</span>
            <span className="hidden sm:inline">Em andamento</span>
          </button>
          <button
            onClick={() => setStatusFilter('finalizada')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              statusFilter === 'finalizada'
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <span className="sm:hidden">Final.</span>
            <span className="hidden sm:inline">Finalizadas</span>
          </button>
          <button
            onClick={() => setStatusFilter('reavertida')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              statusFilter === 'reavertida'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            <span className="sm:hidden">Reabert.</span>
            <span className="hidden sm:inline">Reavertidas</span>
          </button>
        </div>
      </div>
      
      {/* Lista de contagens */}
      <ul className="space-y-2">
        {loading && from === 0 ? (
          <SkeletonLoader />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={q ? "Nenhuma contagem encontrada" : "Nenhuma contagem neste status"}
            description={q ? "Tente ajustar sua pesquisa para encontrar contagens" : "Crie sua primeira contagem no dashboard para começar"}
            illustration={<EmptyCountsIllustration />}
            action={{
              label: q ? "Limpar pesquisa" : "Ir para dashboard",
              onClick: () => q ? setQ('') : nav('/dashboard')
            }}
          />
        ) : (
          filteredItems.map(it => {
            const statusBadge = getStatusBadge(it.status)
            return (
              <li key={it.id} className="card flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-zinc-900">{it.nome}</div>
                      <div className="text-xs text-zinc-500">{new Date(it.created_at).toLocaleString()}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>
                <Link className="badge ml-4" to={`/contagens/${it.id}`}>Abrir</Link>
              </li>
            )
          })
        )}
      </ul>
      
      {!done && (
        <div className="text-center">
          <button className="btn" onClick={() => load(false)} disabled={loading}>
            {loading ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
      {done && filteredItems.length > 0 && <div className="text-center text-sm text-zinc-500">Fim da lista</div>}
    </div>
  )
}
