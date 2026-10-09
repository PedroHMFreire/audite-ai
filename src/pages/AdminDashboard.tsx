import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/components/Toast'

type Customer = {
  user_id: string
  email: string
  store_name: string | null
  owner_name: string | null
  created_at: string
  last_sign_in_at: string | null
  status: string | null
  trial_ends_at: string | null
  current_period_end: string | null
  has_access: boolean
  counts_total: number
}

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

function situation(c: Customer): { label: string; className: string } {
  if (c.status === 'active') return { label: 'Assinante', className: 'badge badge-success' }
  if (c.status === 'comp') return { label: c.has_access ? 'Acesso liberado' : 'Liberação vencida', className: c.has_access ? 'badge badge-success' : 'badge badge-danger' }
  if (c.status === 'past_due') return { label: 'Pagamento pendente', className: 'badge badge-warning' }
  if (c.status === 'trialing') return c.has_access
    ? { label: `Teste até ${date(c.trial_ends_at)}`, className: 'badge' }
    : { label: 'Teste encerrado', className: 'badge badge-danger' }
  if (c.status === 'canceled') return { label: c.has_access ? `Cancelada, até ${date(c.current_period_end)}` : 'Cancelada', className: 'badge badge-warning' }
  return { label: c.has_access ? 'Com acesso' : 'Sem acesso', className: 'badge' }
}

/** Uso interno: clientes cadastrados e liberação manual de acesso. */
export default function AdminDashboard() {
  const { addToast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_customers')
    if (error) addToast({ type: 'error', message: 'Não foi possível carregar os clientes', description: error.message })
    else setCustomers((data || []) as Customer[])
    setLoading(false)
  }, [addToast])

  useEffect(() => { load() }, [load])

  async function grant(c: Customer, days: number | null) {
    setBusyId(c.user_id)
    const { error } = await supabase.rpc('admin_grant_access', { p_user_id: c.user_id, p_days: days })
    setBusyId(null)
    if (error) return addToast({ type: 'error', message: 'Não foi possível liberar', description: error.message })
    addToast({ type: 'success', message: 'Acesso liberado', description: `${c.email} · ${days ? `${days} dias` : 'sem prazo'}` })
    load()
  }

  const stats = useMemo(() => ({
    total: customers.length,
    subscribers: customers.filter((c) => c.status === 'active').length,
    trial: customers.filter((c) => c.status === 'trialing' && c.has_access).length,
    expired: customers.filter((c) => !c.has_access).length,
  }), [customers])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => [c.email, c.store_name, c.owner_name].some((v) => v?.toLowerCase().includes(q)))
  }, [customers, query])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="page-title">Administração</h1>
        <p className="page-subtitle">Clientes cadastrados e situação de acesso.</p>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 sm:grid-cols-4">
        {[['Cadastros', stats.total], ['Assinantes', stats.subscribers], ['Em teste', stats.trial], ['Sem acesso', stats.expired]].map(([label, value]) => (
          <div key={label} className="bg-white px-4 py-4">
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className="tabular mt-1 text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <input type="search" className="input" placeholder="Buscar por e-mail, loja ou nome" aria-label="Buscar cliente"
        value={query} onChange={(e) => setQuery(e.target.value)} />

      {loading ? (
        <div className="skeleton h-40" aria-busy="true" />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">Nenhum cliente encontrado.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {filtered.map((c) => {
            const s = situation(c)
            return (
              <li key={c.user_id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.store_name || c.email}</p>
                  <p className="truncate text-sm text-zinc-500">{c.store_name ? c.email : c.owner_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Cadastro em {date(c.created_at)} · {c.counts_total} {c.counts_total === 1 ? 'contagem' : 'contagens'} · último acesso {date(c.last_sign_in_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className={s.className}>{s.label}</span>
                  <select
                    className="input min-h-9 w-auto py-1.5 text-sm"
                    aria-label={`Liberar acesso para ${c.email}`}
                    disabled={busyId === c.user_id}
                    value=""
                    onChange={(e) => {
                      const v = e.target.value
                      if (v) void grant(c, v === 'sem-prazo' ? null : Number(v))
                    }}
                  >
                    <option value="">Liberar acesso…</option>
                    <option value="30">por 30 dias</option>
                    <option value="90">por 90 dias</option>
                    <option value="365">por 1 ano</option>
                    <option value="sem-prazo">sem prazo</option>
                  </select>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
