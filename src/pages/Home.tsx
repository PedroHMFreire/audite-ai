import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardCards from '@/components/DashboardCards'
import Charts from '@/components/Charts'
import { createCount, getTotalsLastCounts } from '@/lib/db'

export default function Home() {
  const [totals, setTotals] = useState({ regular: 0, excesso: 0, falta: 0 })
  const [chart, setChart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [loja, setLoja] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const data = await getTotalsLastCounts(5)
        setChart(data)
        // Aggregate totals
        let reg = 0, exc = 0, fal = 0
        for (const d of data) {
          reg += d.Regular; exc += d.Excesso; fal += d.Falta
        }
        setTotals({ regular: reg, excesso: exc, falta: fal })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function startCount() {
    if (!nome.trim()) return alert('Defina um nome para a contagem')
    const c = await createCount(nome.trim(), loja.trim() || null)
    nav(`/contagens/${c.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Principal</h1>
        <div className="flex gap-3">
          <Link to="/contagens" className="link">Ver todas as contagens</Link>
        </div>
      </div>

      <div className="card">
        <div className="text-sm mb-3">Iniciar nova contagem</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className="input" placeholder="Nome da contagem" value={nome} onChange={e=>setNome(e.target.value)} />
          <input className="input" placeholder="Loja (opcional)" value={loja} onChange={e=>setLoja(e.target.value)} />
          <button className="btn" onClick={startCount}>Iniciar contagem</button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Carregando…</div>
      ) : (
        <>
          <DashboardCards totals={totals} />
          <Charts data={chart} />
          <RecentCounts />
        </>
      )}
    </div>
  )
}

import { useEffect as useEffect2, useState as useState2 } from 'react'
import { supabase } from '@/lib/supabaseClient'

function RecentCounts() {
  const [rows, setRows] = useState2<any[]>([])
  useEffect2(() => {
    supabase.from('counts').select('*').order('created_at', { ascending: false }).limit(5).then(({ data }) => setRows(data || []))
  }, [])
  return (
    <div className="card">
      <div className="text-sm mb-3">Últimas contagens</div>
      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{r.nome}</div>
              <div className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <Link to={`/contagens/${r.id}`} className="badge">Abrir</Link>
          </li>
        ))}
        {rows.length === 0 && <div className="text-sm text-zinc-500">Sem contagens ainda.</div>}
      </ul>
    </div>
  )
}
