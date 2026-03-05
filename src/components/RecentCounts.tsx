import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

export function RecentCounts() {
  const [rows, setRows] = useState<any[]>([])
  
  useEffect(() => {
    supabase
      .from('counts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRows(data || []))
  }, [])

  return (
    <div className="card">
      <div className="text-sm mb-3">Últimas contagens</div>
      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{r.nome}</div>
              <div className="text-xs text-zinc-500">
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
            <Link to={`/contagens/${r.id}`} className="badge">Abrir</Link>
          </li>
        ))}
        {rows.length === 0 && (
          <div className="text-sm text-zinc-500">Sem contagens ainda.</div>
        )}
      </ul>
    </div>
  )
}
