import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadBoard, type Board } from '@/lib/team'
import { TEAM, itemState, namesLabel, progressBySeller, progressOf, shortDate, type Progress as Totals } from '@/lib/roteiro'
import { toLocalISODate } from '@/lib/scheduleDates'
import ScheduleTabs from '@/components/ScheduleTabs'
import { useToast } from '@/components/Toast'

type Period = 'semana' | 'mes' | 'tudo'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mês' },
  { key: 'tudo', label: 'Tudo' },
]

/** Primeiro e último dia do período, em 'AAAA-MM-DD'; null = sem limite. */
function rangeOf(period: Period): [string, string] | null {
  const now = new Date()
  if (period === 'tudo') return null
  if (period === 'mes') {
    return [
      toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1, 12)),
      toLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 12)),
    ]
  }
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7), 12)
  return [toLocalISODate(monday), toLocalISODate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12))]
}

/** Acompanhamento: quem está cumprindo o roteiro e o que ficou para trás. */
export default function Progress() {
  const { addToast } = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [period, setPeriod] = useState<Period>('mes')
  const today = toLocalISODate(new Date())

  useEffect(() => {
    let alive = true
    loadBoard()
      .then((b) => { if (alive) setBoard(b) })
      .catch((err) => addToast({ type: 'error', message: 'Não foi possível carregar o acompanhamento', description: err instanceof Error ? err.message : undefined }))
    return () => { alive = false }
  }, [addToast])

  const items = useMemo(() => {
    const range = rangeOf(period)
    return (board?.items || []).filter((i) => !range || (i.scheduled_date >= range[0] && i.scheduled_date <= range[1]))
  }, [board, period])

  const totals = useMemo(() => progressOf(items, today), [items, today])
  const bySeller = useMemo(() => progressBySeller(items, today), [items, today])
  const late = items.filter((i) => itemState(i, today) === 'atrasada')

  // Equipe atual primeiro; depois quem saiu mas ainda tem contagens no período.
  const rows = useMemo(() => {
    if (!board) return []
    const names = new Map<string, string>(board.sellers.map((s) => [s.id, s.name]))
    for (const item of items) item.sellerIds.forEach((id, n) => { if (!names.has(id)) names.set(id, item.sellerNames[n]) })
    const list = [...names].map(([id, name]) => ({ id, name, p: bySeller.get(id) }))
    if (bySeller.has(TEAM)) list.push({ id: TEAM, name: 'Toda a equipe', p: bySeller.get(TEAM) })
    return list
  }, [board, items, bySeller])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ScheduleTabs />
      <header>
        <h1 className="page-title">Acompanhamento</h1>
        <p className="page-subtitle">O andamento das contagens do roteiro e quem está em dia.</p>
      </header>

      <div className="flex gap-1.5" role="radiogroup" aria-label="Período">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" role="radio" aria-checked={period === p.key} onClick={() => setPeriod(p.key)}
            className={`min-h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
              period === p.key ? 'bg-ink text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}>{p.label}</button>
        ))}
      </div>

      {!board ? (
        <div className="space-y-3" aria-busy="true"><div className="skeleton h-24" /><div className="skeleton h-40" /></div>
      ) : board.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center">
          <p className="font-medium">Nenhum roteiro gerado ainda</p>
          <p className="mt-1 text-sm text-zinc-500">Gere o roteiro de contagens para acompanhar o andamento por aqui.</p>
          <Link to="/cronograma" className="btn mt-5">Ir para o calendário</Link>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">Nada programado neste período.</p>
      ) : (
        <>
          <dl className="card grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Cumprimento" value={totals.rate === null ? '—' : `${totals.rate}%`} />
            <Stat label="Feitas" value={`${totals.done} de ${totals.total}`} note={totals.doneLate > 0 ? `${totals.doneLate} com atraso` : undefined} />
            <Stat label="Atrasadas" value={String(totals.late)} danger={totals.late > 0} />
            <Stat label="A fazer" value={String(totals.pending)} note={totals.skipped > 0 ? `${totals.skipped} ${totals.skipped === 1 ? 'pulada' : 'puladas'}` : undefined} />
          </dl>

          <section aria-labelledby="por-responsavel">
            <h2 id="por-responsavel" className="eyebrow mb-3">Por responsável</h2>
            <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
              {rows.map((row) => <SellerRow key={row.id} name={row.name} p={row.p} />)}
            </ul>
            <p className="mt-2 text-xs text-zinc-500">
              Cumprimento = feitas ÷ (feitas + atrasadas). Contagem em dupla vale para os dois.
            </p>
          </section>

          {late.length > 0 && (
            <section aria-labelledby="atrasadas">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 id="atrasadas" className="eyebrow">Atrasadas</h2>
                <Link to="/cronograma" className="text-xs text-zinc-500 hover:text-ink">Abrir calendário</Link>
              </div>
              <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
                {late.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.category.color }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.category.name}</span>
                      <span className="block truncate text-xs text-zinc-500">{namesLabel(item.sellerNames)}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-red-600">{shortDate(item.scheduled_date)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, note, danger }: { label: string; value: string; note?: string; danger?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={`tabular mt-1 text-2xl font-semibold ${danger ? 'text-red-600' : ''}`}>{value}</dd>
      {note && <dd className="text-xs text-zinc-500">{note}</dd>}
    </div>
  )
}

function SellerRow({ name, p }: { name: string; p?: Totals }) {
  if (!p) {
    return (
      <li className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <span className="truncate font-medium">{name}</span>
        <span className="shrink-0 text-xs text-zinc-500">Sem contagens no período</span>
      </li>
    )
  }
  const share = p.total ? Math.round((p.done / p.total) * 100) : 0
  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-medium">{name}</span>
        <span className="tabular shrink-0 text-sm">
          {p.rate === null ? <span className="text-zinc-500">nada venceu ainda</span> : <span className="font-semibold">{p.rate}%</span>}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
        <div className="h-full rounded-full bg-green-600" style={{ width: `${share}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">
        {p.done} de {p.total} feitas
        {p.late > 0 && <span className="font-medium text-red-600"> · {p.late} {p.late === 1 ? 'atrasada' : 'atrasadas'}</span>}
        {p.doneLate > 0 && ` · ${p.doneLate} com atraso`}
        {p.skipped > 0 && ` · ${p.skipped} ${p.skipped === 1 ? 'pulada' : 'puladas'}`}
      </p>
    </li>
  )
}
