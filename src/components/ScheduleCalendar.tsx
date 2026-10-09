import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  createCount, getAllScheduleItems, getCategories, updateScheduleItemStatus,
  type Category, type ScheduleItem,
} from '@/lib/db'
import { supabase } from '@/lib/supabaseClient'
import { parseLocalDate, toLocalISODate } from '@/lib/scheduleDates'
import { accessErrorMessage, useCanWrite } from '@/components/AccessGate'
import { useToast } from '@/components/Toast'

type Item = ScheduleItem & { category: Pick<Category, 'name' | 'color'>; countDone: boolean }

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const isDone = (i: Item) => i.status === 'completed' || i.countDone

export default function ScheduleCalendar({ refreshTrigger }: { refreshTrigger?: number }) {
  const nav = useNavigate()
  const { addToast } = useToast()
  const canWrite = useCanWrite()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12))
  const [selected, setSelected] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const [raw, categories] = await Promise.all([getAllScheduleItems(), getCategories()])
      const byId = new Map(categories.map((c) => [c.id, c]))
      const countIds = raw.map((i) => i.count_id).filter(Boolean) as string[]
      const finished = new Set<string>()
      if (countIds.length) {
        const { data } = await supabase.from('counts').select('id').in('id', countIds).eq('status', 'finalizada')
        for (const c of data || []) finished.add(c.id)
      }
      setItems(
        raw
          .filter((i) => i.status !== 'archived')
          .map((i) => ({
            ...i,
            category: byId.get(i.category_id) || { name: 'Categoria removida', color: '#A29E96' },
            countDone: !!i.count_id && finished.has(i.count_id),
          }))
      )
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível carregar o cronograma', description: err instanceof Error ? err.message : undefined })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  const today = toLocalISODate(new Date())

  const days = useMemo(() => {
    const first = new Date(month)
    const offset = (first.getDay() + 6) % 7 // semana começa na segunda
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset, 12)
    // Só as semanas que o mês realmente ocupa (5 ou 6).
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const cells = Math.ceil((offset + daysInMonth) / 7) * 7
    return Array.from({ length: cells }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12))
  }, [month])

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const item of items) {
      const list = map.get(item.scheduled_date) || []
      list.push(item)
      map.set(item.scheduled_date, list)
    }
    return map
  }, [items])

  const monthKey = toLocalISODate(month).slice(0, 7)
  const monthItems = items.filter((i) => i.scheduled_date.startsWith(monthKey))
  const overdue = items.filter((i) => i.status === 'pending' && !i.countDone && i.scheduled_date < today)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
      setSelected(null)
      await load()
    } catch (err) {
      const blocked = accessErrorMessage(err)
      addToast({ type: 'error', message: blocked || 'Não foi possível concluir', description: blocked ? undefined : err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  async function startCount(item: Item) {
    setBusy(true)
    try {
      const date = parseLocalDate(item.scheduled_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      const count = await createCount(`${item.category.name} · ${date}`, null)
      await updateScheduleItemStatus(item.id, 'pending', undefined, count.id)
      nav(`/contagens/${count.id}`)
    } catch (err) {
      const blocked = accessErrorMessage(err)
      addToast({ type: 'error', message: blocked || 'Não foi possível criar a contagem', description: blocked ? undefined : err instanceof Error ? err.message : undefined })
      setBusy(false)
    }
  }

  if (loading) return <div className="skeleton h-80" aria-busy="true" />

  if (items.length === 0) return null

  const title = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <section aria-label="Calendário de contagens" className="space-y-4">
      {overdue.length > 0 && (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {overdue.length === 1 ? '1 contagem programada está atrasada.' : `${overdue.length} contagens programadas estão atrasadas.`}
        </p>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold first-letter:uppercase">{title}</h2>
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12))}>Hoje</button>
          <button type="button" className="btn btn-quiet btn-sm px-2" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-quiet btn-sm px-2" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Computador: grade do mês */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white md:block">
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
          {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2 text-center text-xs font-medium text-zinc-500">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date, i) => {
            const key = toLocalISODate(date)
            const inMonth = date.getMonth() === month.getMonth()
            return (
              <div key={key} className={`min-h-24 border-b border-r border-zinc-200 p-1.5 ${i % 7 === 6 ? 'border-r-0' : ''} ${inMonth ? '' : 'bg-zinc-50'}`}>
                <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs tabular ${
                  key === today ? 'bg-ink font-medium text-white' : inMonth ? 'text-zinc-700' : 'text-zinc-500'
                }`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {(byDay.get(key) || []).map((item) => <Pill key={item.id} item={item} today={today} onClick={() => setSelected(item)} />)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Celular: lista do mês */}
      <div className="md:hidden">
        {monthItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">Nada programado neste mês.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {monthItems.map((item) => {
              const date = parseLocalDate(item.scheduled_date)
              const late = item.status === 'pending' && !item.countDone && item.scheduled_date < today
              return (
                <li key={item.id}>
                  <button type="button" onClick={() => setSelected(item)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className="w-10 shrink-0 text-center">
                      <span className="tabular block text-lg font-semibold leading-none">{date.getDate()}</span>
                      <span className="text-[11px] uppercase text-zinc-500">{WEEKDAYS[(date.getDay() + 6) % 7]}</span>
                    </span>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.category.color }} aria-hidden="true" />
                    <span className={`min-w-0 flex-1 truncate text-sm ${isDone(item) || item.status === 'skipped' ? 'text-zinc-500 line-through' : ''}`}>{item.category.name}</span>
                    <span className={`shrink-0 text-xs ${late ? 'font-medium text-red-600' : 'text-zinc-500'}`}>
                      {isDone(item) ? 'Feita' : item.status === 'skipped' ? 'Pulada' : late ? 'Atrasada' : item.scheduled_date === today ? 'Hoje' : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 animate-fade-in sm:items-center" onClick={() => !busy && setSelected(null)} role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="item-titulo" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl animate-scale-in">
            <p className="text-xs text-zinc-500">
              {parseLocalDate(selected.scheduled_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h3 id="item-titulo" className="mt-1 flex items-center gap-2 text-lg font-semibold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: selected.category.color }} aria-hidden="true" />
              {selected.category.name}
            </h3>
            <div className="mt-5 flex flex-col gap-2">
              {selected.count_id ? (
                <button type="button" className="btn" disabled={busy} onClick={() => nav(selected.countDone ? `/relatorio/${selected.count_id}` : `/contagens/${selected.count_id}`)}>
                  {selected.countDone ? 'Ver relatório' : 'Continuar contagem'}
                </button>
              ) : !isDone(selected) && canWrite ? (
                <button type="button" className="btn" disabled={busy} onClick={() => startCount(selected)}>
                  {busy ? 'Criando…' : 'Começar contagem'}
                </button>
              ) : null}
              {selected.status === 'pending' && !selected.countDone ? (
                <>
                  <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run(() => updateScheduleItemStatus(selected.id, 'completed'))}>
                    <Check className="h-4 w-4" aria-hidden="true" /> Marcar como feita
                  </button>
                  <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => run(() => updateScheduleItemStatus(selected.id, 'skipped'))}>
                    Pular esta
                  </button>
                </>
              ) : !selected.countDone ? (
                <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => run(() => updateScheduleItemStatus(selected.id, 'pending'))}>
                  Voltar para pendente
                </button>
              ) : null}
              <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => setSelected(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Pill({ item, today, onClick }: { item: Item; today: string; onClick: () => void }) {
  const done = isDone(item)
  const late = item.status === 'pending' && !item.countDone && item.scheduled_date < today
  return (
    <button
      type="button"
      onClick={onClick}
      title={item.category.name}
      className={`flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-left text-xs transition-colors hover:border-zinc-400 ${
        late ? 'border-red-100 bg-red-50' : 'border-zinc-200 bg-white'
      }`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.category.color }} aria-hidden="true" />
      <span className={`min-w-0 flex-1 truncate ${done || item.status === 'skipped' ? 'text-zinc-500 line-through' : ''}`}>{item.category.name}</span>
      {done && <Check className="h-3 w-3 shrink-0 text-green-600" aria-label="Feita" />}
    </button>
  )
}
