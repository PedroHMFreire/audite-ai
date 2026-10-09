import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { getCounts, getUpcomingSchedule, type Count, type UpcomingSchedule } from '@/lib/db'
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
  const [upcoming, setUpcoming] = useState<UpcomingSchedule[]>([])
  const [hasAny, setHasAny] = useState(false)

  const storeName = (user?.user_metadata?.store_name as string | undefined)?.trim()

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [counts, schedule] = await Promise.all([
          getCounts(20, 0, '', 'ativas'),
          getUpcomingSchedule().catch(() => [] as UpcomingSchedule[]),
        ])
        if (!alive) return
        setHasAny(counts.length > 0)
        setOpen(counts.filter(isOpen).slice(0, 3))
        setUpcoming(schedule.slice(0, 4))

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

          {upcoming.length > 0 && (
            <section aria-labelledby="proximas">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 id="proximas" className="eyebrow">Próximas do cronograma</h2>
                <Link to="/cronograma" className="text-xs text-zinc-500 hover:text-ink">Ver calendário</Link>
              </div>
              <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
                {upcoming.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.category_color || '#A29E96' }} aria-hidden="true" />
                      <span className="truncate text-sm">{s.category_name}</span>
                    </span>
                    <span className={`shrink-0 text-xs ${s.urgency === 'overdue' ? 'font-medium text-red-600' : 'text-zinc-500'}`}>
                      {s.urgency === 'overdue' ? 'Atrasada · ' : s.urgency === 'today' ? 'Hoje · ' : ''}
                      {formatDate(s.scheduled_date + 'T12:00:00')}
                    </span>
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
