import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { getActiveScheduleConfig, getCounts, type Count } from '@/lib/db'
import { loadBoard, type BoardItem } from '@/lib/team'
import { itemState, namesLabel, shortDate } from '@/lib/roteiro'
import { toLocalISODate } from '@/lib/scheduleDates'
import { useAuth } from '@/contexts'
import { AccessNotice, useCanWrite } from '@/components/AccessGate'
import NewCountForm from '@/components/NewCountForm'
import { useToast } from '@/components/Toast'

type Summary = { count: Count; regular: number; falta: number; excesso: number }

const isOpen = (c: Count) => c.status !== 'finalizada' && c.status !== 'arquivada'

export default function Home() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const canWrite = useCanWrite()
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<Count[]>([])
  const [last, setLast] = useState<Summary | null>(null)
  const [roteiro, setRoteiro] = useState<{ items: BoardItem[]; late: number; instructions: string | null; hasTeam: boolean } | null>(null)
  const [hasAny, setHasAny] = useState(false)

  const storeName = (user?.user_metadata?.store_name as string | undefined)?.trim()

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [counts, board, config] = await Promise.all([
          getCounts(20, 0, '', 'ativas'),
          loadBoard().catch(() => null),
          getActiveScheduleConfig().catch(() => null),
        ])
        if (!alive) return
        setHasAny(counts.length > 0)
        setOpen(counts.filter(isOpen).slice(0, 3))
        if (board) {
          // O aviso mostra o que está atrasado, o de hoje e o dos próximos 7 dias.
          const now = new Date()
          const today = toLocalISODate(now)
          const horizon = toLocalISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 12))
          const due = board.items.filter((i) => {
            const state = itemState(i, today)
            return state === 'atrasada' || state === 'hoje' || (state === 'pendente' && i.scheduled_date <= horizon)
          })
          setRoteiro({
            items: due.slice(0, 6),
            late: due.filter((i) => itemState(i, today) === 'atrasada').length,
            instructions: config?.instructions?.trim() || null,
            hasTeam: board.sellers.length > 0,
          })
        }

        const finished = counts.find((c) => c.status === 'finalizada')
        if (finished) {
          const { data } = await supabase.from('results').select('status').eq('count_id', finished.id)
          if (!alive) return
          const rows = data || []
          setLast({
            count: finished,
            regular: rows.filter((r) => r.status === 'regular').length,
            falta: rows.filter((r) => r.status === 'falta').length,
            excesso: rows.filter((r) => r.status === 'excesso').length,
          })
        }
      } catch (err) {
        addToast({ type: 'error', message: 'Não foi possível carregar o início', description: err instanceof Error ? err.message : undefined })
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [addToast])

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="eyebrow">{storeName || 'Sua loja'}</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">O que vamos contar hoje?</h1>
      </header>

      <AccessNotice />

      {canWrite && <NewCountForm />}

      {roteiro && roteiro.items.length > 0 && (
        <section aria-labelledby="roteiro" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 id="roteiro" className="eyebrow">Roteiro de contagens</h2>
            <Link to="/cronograma" className="text-xs text-zinc-500 hover:text-ink">Ver calendário</Link>
          </div>
          {roteiro.late > 0 && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="status">
              {roteiro.late === 1 ? '1 contagem do roteiro está atrasada.' : `${roteiro.late} contagens do roteiro estão atrasadas.`}{' '}
              <Link to="/acompanhamento" className="font-medium underline underline-offset-4">Acompanhar</Link>
            </p>
          )}
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {roteiro.items.map((item) => {
              const state = itemState(item, toLocalISODate(new Date()))
              return (
                <li key={item.id}>
                  <Link to="/cronograma" className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-zinc-50">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.category.color || '#A29E96' }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.category.name}</span>
                      {roteiro.hasTeam && <span className="block truncate text-xs text-zinc-500">{namesLabel(item.sellerNames)}</span>}
                    </span>
                    <span className={`shrink-0 text-xs ${state === 'atrasada' ? 'font-medium text-red-600' : state === 'hoje' ? 'font-medium text-ink' : 'text-zinc-500'}`}>
                      {state === 'atrasada' ? 'Atrasada · ' : state === 'hoje' ? 'Hoje · ' : ''}
                      {shortDate(item.scheduled_date)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          {roteiro.instructions && (
            <details className="rounded-xl border border-zinc-200 bg-white px-5 py-3">
              <summary className="cursor-pointer select-none text-sm font-medium">Orientações de contagem</summary>
              <p className="mt-2 whitespace-pre-line text-sm text-zinc-600">{roteiro.instructions}</p>
            </details>
          )}
        </section>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
      ) : !hasAny ? (
        <FirstSteps />
      ) : (
        <>
          {open.length > 0 && (
            <section aria-labelledby="em-andamento">
              <h2 id="em-andamento" className="eyebrow mb-3">Em andamento</h2>
              <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
                {open.map((c) => (
                  <li key={c.id}>
                    <Link to={`/contagens/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-zinc-50">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.nome}</p>
                        <p className="text-xs text-zinc-500">Iniciada em {formatDate(c.created_at)}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-sm text-zinc-600">
                        Continuar <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {last && (
            <section aria-labelledby="ultima">
              <h2 id="ultima" className="eyebrow mb-3">Última contagem finalizada</h2>
              <Link to={`/relatorio/${last.count.id}`} className="card block transition-colors hover:border-zinc-300">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="truncate font-medium">{last.count.nome}</p>
                  <p className="shrink-0 text-xs text-zinc-500">{formatDate(last.count.finished_at || last.count.created_at)}</p>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-4">
                  <Stat label="Certos" value={last.regular} dot="bg-green-500" />
                  <Stat label="Faltas" value={last.falta} dot="bg-red-500" />
                  <Stat label="Sobras" value={last.excesso} dot="bg-amber-500" />
                </dl>
                <p className="mt-4 flex items-center gap-1 text-sm text-zinc-600">
                  Ver relatório <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </p>
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className="tabular mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  )
}

function FirstSteps() {
  const steps = [
    ['Crie uma contagem', 'Dê um nome, como “Balanço de outubro”.'],
    ['Importe a planilha do estoque', 'Exporte do seu sistema em Excel ou CSV, com código, nome e saldo.'],
    ['Bipe as peças', 'Use a câmera do celular ou digite os códigos. Funciona até sem internet.'],
    ['Veja o que falta e o que sobra', 'O relatório compara o contado com o sistema e sai em PDF ou Excel.'],
  ]
  return (
    <section aria-labelledby="como-funciona">
      <h2 id="como-funciona" className="eyebrow mb-3">Como funciona</h2>
      <ol className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {steps.map(([title, text], i) => (
          <li key={title} className="flex gap-4 px-5 py-4">
            <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-xs font-medium">{i + 1}</span>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-zinc-500">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
