import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCounts } from '@/lib/db'

export default function Counts() {
  const [items, setItems] = useState<any[]>([])
  const [from, setFrom] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [q, setQ] = useState('')

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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Contagens</h1>
      <div className="flex gap-2">
        <input className="input" placeholder="Pesquisar por nome" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="btn" onClick={search}>Pesquisar</button>
      </div>
      <ul className="space-y-2">
        {items.map(it => (
          <li key={it.id} className="card flex items-center justify-between">
            <div>
              <div className="font-medium">{it.nome}</div>
              <div className="text-xs text-zinc-500">{new Date(it.created_at).toLocaleString()}</div>
            </div>
            <Link className="badge" to={`/contagens/${it.id}`}>Abrir</Link>
          </li>
        ))}
      </ul>
      {!done && (
        <div className="text-center">
          <button className="btn" onClick={()=>load(false)} disabled={loading}>{loading ? 'Carregando…' : 'Carregar mais'}</button>
        </div>
      )}
      {done && items.length > 0 && <div className="text-center text-sm text-zinc-500">Fim da lista</div>}
    </div>
  )
}
