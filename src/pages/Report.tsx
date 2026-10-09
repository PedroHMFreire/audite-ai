import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import {
  getCountById, getJustifications, getResultsByCount, getStoreById, reopenCount, upsertJustification, MOTIVO_LABELS,
  type Count, type DivergenceJustification, type Motivo, type Result,
} from '@/lib/db'
import { batchLookupProducts } from '@/lib/catalog'
import { downloadBlob, fileSlug, generateReportXlsx, type ReportData } from '@/lib/reportExport'
import { useCanWrite } from '@/components/AccessGate'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useToast } from '@/components/Toast'

type Tab = 'falta' | 'excesso' | 'regular'

const TABS: { key: Tab; label: string; dot: string; empty: string }[] = [
  { key: 'falta', label: 'Faltas', dot: 'bg-red-500', empty: 'Nenhuma falta. Tudo o que o sistema diz ter foi encontrado.' },
  { key: 'excesso', label: 'Sobras', dot: 'bg-amber-500', empty: 'Nenhuma sobra.' },
  { key: 'regular', label: 'Certos', dot: 'bg-green-500', empty: 'Nenhum produto com a quantidade exata.' },
]

export default function Report() {
  const { id } = useParams()
  const nav = useNavigate()
  const { addToast } = useToast()
  const canWrite = useCanWrite()
  const [count, setCount] = useState<Count | null>(null)
  const [rows, setRows] = useState<Result[] | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)
  const [names, setNames] = useState<Map<string, string>>(new Map())
  const [justifications, setJustifications] = useState<Map<string, DivergenceJustification>>(new Map())
  const [tab, setTab] = useState<Tab>('falta')
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)
  const [confirmReopen, setConfirmReopen] = useState(false)
  const [reopening, setReopening] = useState(false)

  useEffect(() => {
    if (!id) return
    let alive = true
    ;(async () => {
      try {
        const [countData, results, justs] = await Promise.all([
          getCountById(id), getResultsByCount(id), getJustifications(id),
        ])
        if (!alive) return
        setCount(countData)
        setRows(results)
        setJustifications(new Map(justs.map((j) => [j.codigo, j])))
        // Abre na primeira aba que tem conteúdo.
        const first = TABS.find((t) => results.some((r) => r.status === t.key))
        if (first) setTab(first.key)

        if (countData.store_id) getStoreById(countData.store_id).then((n) => alive && setStoreName(n)).catch(() => {})
        const semNome = results.filter((r) => !r.nome_produto).map((r) => r.codigo)
        if (semNome.length) batchLookupProducts(semNome).then((m) => alive && setNames(m)).catch(() => {})
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Não foi possível carregar o relatório.')
      }
    })()
    return () => { alive = false }
  }, [id])

  const groups = useMemo(() => {
    const g: Record<Tab, Result[]> = { falta: [], excesso: [], regular: [] }
    for (const r of rows || []) g[r.status]?.push(r)
    // Maiores diferenças primeiro: é o que o lojista quer ver.
    const diff = (r: Result) => Math.abs((r.manual_qtd || 0) - (r.saldo_qtd || 0))
    g.falta.sort((a, b) => diff(b) - diff(a))
    g.excesso.sort((a, b) => diff(b) - diff(a))
    return g
  }, [rows])

  const units = (list: Result[]) => list.reduce((a, r) => a + Math.abs((r.manual_qtd || 0) - (r.saldo_qtd || 0)), 0)
  const pendentes = [...groups.falta, ...groups.excesso].filter((r) => !justifications.has(r.codigo)).length

  function reportData(): ReportData {
    return {
      countName: count?.nome || 'Contagem',
      storeName,
      date: new Date(count?.finished_at || count?.created_at || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      results: rows || [],
      names,
      justifications,
    }
  }

  async function exportAs(kind: 'pdf' | 'xlsx') {
    setExporting(kind)
    try {
      const data = reportData()
      const blob = kind === 'pdf'
        ? (await import('@/lib/pdf')).generateReportPDF(data)
        : await generateReportXlsx(data)
      downloadBlob(blob, `relatorio-${fileSlug(data.countName)}.${kind}`)
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível gerar o arquivo', description: err instanceof Error ? err.message : undefined })
    } finally {
      setExporting(null)
    }
  }

  async function handleReopen() {
    if (!id) return
    setReopening(true)
    try {
      await reopenCount(id)
      nav(`/contagens/${id}`)
    } catch (err) {
      setConfirmReopen(false)
      addToast({ type: 'error', message: 'Não foi possível reabrir', description: err instanceof Error ? err.message : undefined, duration: 7000 })
    } finally {
      setReopening(false)
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="font-medium">Não foi possível abrir o relatório</p>
        <p className="mt-1 text-sm text-zinc-500">{error}</p>
        <Link to="/contagens" className="btn btn-secondary mt-6">Voltar para contagens</Link>
      </div>
    )
  }

  if (!rows || !count) {
    return <div className="mx-auto max-w-3xl space-y-4" aria-busy="true"><div className="skeleton h-10 w-2/3" /><div className="skeleton h-28" /><div className="skeleton h-64" /></div>
  }

  if (count.status !== 'finalizada' || rows.length === 0) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="font-medium">Esta contagem ainda não foi finalizada</p>
        <p className="mt-1 text-sm text-zinc-500">O relatório aparece aqui quando você finalizar a contagem.</p>
        <Link to={`/contagens/${id}`} className="btn mt-6">Abrir contagem</Link>
      </div>
    )
  }

  const list = groups[tab]
  const current = TABS.find((t) => t.key === tab)!

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link to="/contagens" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Contagens
        </Link>
        <h1 className="page-title mt-3">{count.nome}</h1>
        <p className="page-subtitle">
          {storeName ? `${storeName} · ` : ''}Finalizada em {reportData().date}
        </p>
      </header>

      <dl className="grid grid-cols-3 divide-x divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        <Stat label="Certos" value={groups.regular.length} dot="bg-green-500" />
        <Stat label="Faltas" value={groups.falta.length} dot="bg-red-500" detail={pecas(units(groups.falta))} />
        <Stat label="Sobras" value={groups.excesso.length} dot="bg-amber-500" detail={pecas(units(groups.excesso))} />
      </dl>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => exportAs('pdf')} disabled={!!exporting}>
          <Download className="h-4 w-4" aria-hidden="true" /> {exporting === 'pdf' ? 'Gerando…' : 'PDF'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => exportAs('xlsx')} disabled={!!exporting}>
          <Download className="h-4 w-4" aria-hidden="true" /> {exporting === 'xlsx' ? 'Gerando…' : 'Excel'}
        </button>
        {canWrite && (
          <button type="button" className="btn btn-quiet ml-auto" onClick={() => setConfirmReopen(true)}>Reabrir contagem</button>
        )}
      </div>

      <section aria-label="Produtos conferidos">
        <div role="tablist" aria-label="Situação" className="flex gap-1 border-b border-zinc-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors ${
                tab === t.key ? 'border-ink font-medium text-ink' : 'border-transparent text-zinc-500 hover:text-ink'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
              {t.label}
              <span className="tabular text-zinc-400">{groups[t.key].length}</span>
            </button>
          ))}
        </div>

        {tab !== 'regular' && pendentes > 0 && list.length > 0 && (
          <p className="mt-4 text-sm text-zinc-500">
            {pendentes} {pendentes === 1 ? 'divergência sem motivo anotado' : 'divergências sem motivo anotado'}. Anotar é opcional e sai no PDF e no Excel.
          </p>
        )}

        {list.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">{current.empty}</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {list.map((r) => {
              const diff = (r.manual_qtd || 0) - (r.saldo_qtd || 0)
              const nome = r.nome_produto || names.get(r.codigo)
              return (
                <li key={r.codigo} className="px-4 py-3.5 sm:px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{nome || <span className="font-mono">{r.codigo}</span>}</p>
                      {nome && <p className="tabular truncate font-mono text-xs text-zinc-500">{r.codigo}</p>}
                      {!nome && tab === 'excesso' && <p className="text-xs text-zinc-500">Fora da planilha</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular text-sm">
                        {r.manual_qtd} <span className="text-zinc-400">de {r.saldo_qtd}</span>
                      </p>
                      <p className={`tabular text-xs font-medium ${diff === 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {diff === 0 ? 'Certo' : diff < 0 ? `Falta ${-diff}` : `Sobra ${diff}`}
                      </p>
                    </div>
                  </div>
                  {tab !== 'regular' && id && (
                    <JustificationEditor
                      countId={id}
                      codigo={r.codigo}
                      justification={justifications.get(r.codigo)}
                      onSaved={(j) => setJustifications((prev) => new Map(prev).set(r.codigo, j))}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmReopen}
        title="Reabrir a contagem?"
        description="Você volta a bipar de onde parou. O relatório é refeito quando finalizar de novo; os motivos anotados são mantidos."
        confirmLabel={reopening ? 'Reabrindo…' : 'Reabrir'}
        onConfirm={handleReopen}
        onCancel={() => setConfirmReopen(false)}
      />
    </div>
  )
}

function Stat({ label, value, dot, detail }: { label: string; value: number; dot: string; detail?: string }) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className="tabular mt-1 text-2xl font-semibold">{value.toLocaleString('pt-BR')}</dd>
      {detail && <dd className="tabular text-xs text-zinc-500">{detail}</dd>}
    </div>
  )
}

const pecas = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'peça' : 'peças'}`

const MOTIVO_OPTIONS = Object.entries(MOTIVO_LABELS) as [Motivo, string][]

function JustificationEditor({ countId, codigo, justification, onSaved }: {
  countId: string
  codigo: string
  justification?: DivergenceJustification
  onSaved: (j: DivergenceJustification) => void
}) {
  const [motivo, setMotivo] = useState<Motivo | ''>(justification?.motivo || '')
  const [observacao, setObservacao] = useState(justification?.observacao || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMotivo(justification?.motivo || '')
    setObservacao(justification?.observacao || '')
  }, [justification])

  async function save(nextMotivo: Motivo, nextObservacao: string) {
    if (nextMotivo === 'outra' && !nextObservacao.trim()) return
    setError(null)
    setSaving(true)
    try {
      await upsertJustification(countId, codigo, nextMotivo, nextObservacao)
      onSaved({ count_id: countId, codigo, motivo: nextMotivo, observacao: nextMotivo === 'outra' ? nextObservacao.trim() : null })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o motivo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
      <select
        className="input min-h-9 py-1.5 text-sm sm:w-56"
        aria-label={`Motivo da divergência de ${codigo}`}
        value={motivo}
        disabled={saving}
        onChange={(e) => {
          const next = e.target.value as Motivo | ''
          setMotivo(next)
          if (next && next !== 'outra') void save(next, '')
        }}
      >
        <option value="">Anotar motivo…</option>
        {MOTIVO_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {motivo === 'outra' && (
        <input
          type="text"
          className="input min-h-9 flex-1 py-1.5 text-sm"
          placeholder="Descreva o motivo"
          aria-label="Descrição do motivo"
          maxLength={200}
          value={observacao}
          disabled={saving}
          onChange={(e) => setObservacao(e.target.value)}
          onBlur={() => void save('outra', observacao)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        />
      )}
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
