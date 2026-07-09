import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCountById, getResultsByCount, getPlanItems, listManualEntries, getStoreById, reopenCount, getJustifications, upsertJustification, MOTIVO_LABELS } from '@/lib/db'
import type { Result, DivergenceJustification, Motivo } from '@/lib/db'
import { getMyOrg, batchLookupProducts } from '@/lib/catalog'
import { generateReportPDF } from '@/lib/pdf'
import CoverageProgressBar from '@/components/CoverageProgressBar'

type PlanRow = { codigo: string; nome: string; saldo: number }
type Entry = { id: string; count_id: string; codigo: string; qty: number; created_at: string }

export default function Report() {
  const { id } = useParams()
  const nav = useNavigate()
  const [count, setCount] = useState<any>(null)
  const [rows, setRows] = useState<Result[]>([])
  const [plan, setPlan] = useState<PlanRow[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [storeName, setStoreName] = useState<string | null>(null)
  const [logoPng, setLogoPng] = useState<string | undefined>(undefined)
  const [reopening, setReopening] = useState(false)
  const [catalogNames, setCatalogNames] = useState<Map<string, string>>(new Map())
  const [justifications, setJustifications] = useState<Map<string, DivergenceJustification>>(new Map())

  useEffect(() => {
    if (!id) return
    
    ;(async () => {
      try {
        const countData = await getCountById(id)
        setCount(countData)
        
        // Busca o nome da loja se store_id existir
        if (countData?.store_id) {
          const stName = await getStoreById(countData.store_id)
          setStoreName(stName)
        }
      } catch (err) {
        console.error('Erro ao buscar contagem/loja:', err)
      }
    })()
    
    getResultsByCount(id).then(async results => {
      setRows(results)
      // Enriquece com nomes do catálogo para itens em excesso sem nome
      const hasOrg = await getMyOrg().then(ctx => ctx !== null).catch(() => false)
      if (hasOrg) {
        const needsName = results
          .filter(r => r.status === 'excesso' && !r.nome_produto)
          .map(r => r.codigo)
        if (needsName.length > 0) {
          const names = await batchLookupProducts(needsName)
          setCatalogNames(names)
        }
      }
    })
    getPlanItems(id).then(setPlan)
    listManualEntries(id).then(setEntries)
    getJustifications(id).then(list => setJustifications(new Map(list.map(j => [j.codigo, j]))))

    // Tenta converter logo.svg -> PNG (para o jsPDF)
    ;(async () => {
      try {
        const res = await fetch('/logo.svg')
        const svgText = await res.text()
        const png = await svgToPng(svgText, 240, 80)
        setLogoPng(png)
      } catch {
        setLogoPng(undefined)
      }
    })()
  }, [id])

  const catTotals = {
    regular: rows.filter(r=>r.status==='regular').length,
    excesso: rows.filter(r=>r.status==='excesso').length,
    falta: rows.filter(r=>r.status==='falta').length,
  }

  // >>> NOVO: totais de códigos e itens
  const totals = useMemo(() => {
    const planCodes = plan.length
    const planItems = plan.reduce((acc, p) => acc + (Number(p.saldo) || 0), 0)

    const insertedItems = entries.reduce((acc, e) => acc + (Number(e.qty) || 1), 0)
    const insertedCodes = new Set(entries.map(e => e.codigo)).size

    return { planCodes, planItems, insertedCodes, insertedItems }
  }, [plan, entries])

  function handleJustificationSaved(codigo: string, j: DivergenceJustification) {
    setJustifications(prev => {
      const next = new Map(prev)
      next.set(codigo, j)
      return next
    })
  }

  function exportPDF() {
    try {
      const blob = generateReportPDF({
        logoDataUrl: logoPng,
        countName: count?.nome || '',
        storeName: storeName || '—',
        date: new Date(count?.created_at || Date.now()).toLocaleString(),
        results: rows,
        justifications
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-${(count?.nome || 'contagem').replace(/\s+/g,'-').toLowerCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(()=>URL.revokeObjectURL(url), 5000)
    } catch (e) {
      alert('Não foi possível gerar o PDF: ' + (e as any)?.message)
    }
  }

  async function handleReopen() {
    if (!id) return
    try {
      setReopening(true)
      await reopenCount(id)
      nav(`/contagens/${id}`)
    } catch (err: any) {
      alert('Erro ao reabrir contagem: ' + err.message)
    } finally {
      setReopening(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Relatório</h1>
        <div className="text-sm text-zinc-500">
          Contagem: {count?.nome}
          {storeName && ` • Loja: ${storeName}`}
        </div>
      </div>

      {/* Barra de cobertura com status detalhado */}
      <CoverageProgressBar
        planCodes={totals.planCodes}
        insertedCodes={totals.insertedCodes}
        planItems={totals.planItems}
        insertedItems={totals.insertedItems}
      />

      {/* Resumo Planilha x Inseridos - Cards compactos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card">
          <div className="text-xs text-zinc-500">Planilha • Códigos</div>
          <div className="text-2xl font-semibold">{totals.planCodes}</div>
        </div>
        <div className="card">
          <div className="text-xs text-zinc-500">Planilha • Itens</div>
          <div className="text-2xl font-semibold">{totals.planItems}</div>
        </div>
        <div className="card">
          <div className="text-xs text-zinc-500">Inseridos • Códigos</div>
          <div className="text-2xl font-semibold">{totals.insertedCodes}</div>
        </div>
        <div className="card">
          <div className="text-xs text-zinc-500">Inseridos • Itens</div>
          <div className="text-2xl font-semibold">{totals.insertedItems}</div>
        </div>
      </div>

      {/* Totais por categoria (mantidos) */}
      <div className="grid grid-cols-3 lg:max-w-2xl gap-3">
        <div className="card"><div className="text-xs text-zinc-500">Regulares</div><div className="text-2xl font-semibold">{catTotals.regular}</div></div>
        <div className="card"><div className="text-xs text-zinc-500">Excesso</div><div className="text-2xl font-semibold">{catTotals.excesso}</div></div>
        <div className="card"><div className="text-xs text-zinc-500">Falta</div><div className="text-2xl font-semibold">{catTotals.falta}</div></div>
      </div>

      <div className="card">
        <div className="text-sm mb-3">Produtos regulares</div>
        <SimpleTable rows={rows.filter(r=>r.status==='regular')} type="regular" />
      </div>
      <div className="card">
        <div className="text-sm mb-3">Produtos em excesso</div>
        <SimpleTable
          rows={rows.filter(r=>r.status==='excesso')}
          type="excesso"
          catalogNames={catalogNames}
          countId={id}
          justifications={justifications}
          onJustificationSaved={handleJustificationSaved}
        />
      </div>
      <div className="card">
        <div className="text-sm mb-3">Produtos em falta</div>
        <SimpleTable
          rows={rows.filter(r=>r.status==='falta')}
          type="falta"
          countId={id}
          justifications={justifications}
          onJustificationSaved={handleJustificationSaved}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button className="btn flex-1 sm:flex-none" onClick={exportPDF}>Exportar PDF</button>
        <button 
          className="btn btn-secondary flex-1 sm:flex-none" 
          onClick={handleReopen}
          disabled={reopening}
        >
          {reopening ? 'Reabrindo…' : 'Reabrir'}
        </button>
      </div>
    </div>
  )
}

function SimpleTable({ rows, type, catalogNames = new Map(), countId, justifications, onJustificationSaved }: {
  rows: Result[]
  type: 'regular' | 'falta' | 'excesso'
  catalogNames?: Map<string, string>
  countId?: string
  justifications?: Map<string, DivergenceJustification>
  onJustificationSaved?: (codigo: string, j: DivergenceJustification) => void
}) {
  const hasJustification = type !== 'regular'
  const getNome = (r: Result) => r.nome_produto || catalogNames.get(r.codigo) || ''
  // Diferença semântica por tipo de tabela:
  // - falta:   saldo − encontrado  → positivo = quantas unidades faltam
  // - excesso: encontrado − saldo  → positivo = quantas unidades sobram
  // - regular: sempre 0
  const calcDiff = (r: Result) => {
    const manual = r.manual_qtd || 0
    const saldo = r.saldo_qtd || 0
    if (type === 'falta') return saldo - manual
    if (type === 'excesso') return manual - saldo
    return 0
  }

  const diffLabel = type === 'falta' ? 'Faltando' : type === 'excesso' ? 'Em excesso' : 'Diferença'
  const diffTitle =
    type === 'falta'
      ? 'Unidades a menos que o saldo da planilha'
      : type === 'excesso'
      ? 'Unidades a mais que o saldo da planilha (ou código não cadastrado)'
      : 'Quantidade bate com o saldo'

  const diffClass = (diff: number) => {
    if (diff === 0) return 'text-green-600 dark:text-green-400'
    if (type === 'falta') return 'text-red-600 dark:text-red-400 font-bold'
    return 'text-amber-600 dark:text-amber-400 font-bold'
  }

  const rowBg = (i: number) => {
    const even = i % 2 === 0
    if (type === 'regular') return even ? 'bg-green-50 dark:bg-green-950/20' : 'bg-white dark:bg-zinc-900'
    if (type === 'falta') return even ? 'bg-red-50 dark:bg-red-950/20' : 'bg-red-50/50 dark:bg-red-950/10'
    return even ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-amber-50/50 dark:bg-amber-950/10'
  }

  const mobileBg = () => {
    if (type === 'regular') return 'bg-green-50 dark:bg-green-950/20'
    if (type === 'falta') return 'bg-red-50 dark:bg-red-950/20'
    return 'bg-amber-50 dark:bg-amber-950/20'
  }

  return (
    <>
      {/* Desktop: Tabela */}
      <div className="hidden sm:block overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="text-left bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0">
            <tr>
              <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                <span title="Identificador único do produto">Código</span>
              </th>
              <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                <span title="Nome ou descrição do produto">Nome</span>
              </th>
              <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300 text-right">
                <span title="Quantidade registrada na planilha (saldo esperado)">Esperado</span>
              </th>
              <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300 text-right">
                <span title="Quantidade encontrada fisicamente na loja">Encontrado</span>
              </th>
              <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300 text-right">
                <span title={diffTitle}>{diffLabel}</span>
              </th>
              {hasJustification && (
                <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                  <span title="Motivo da divergência">Justificativa</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((r, i) => {
              const diff = calcDiff(r)
              return (
                <tr key={i} className={`${rowBg(i)} transition-all border-none`}>
                  <td className="py-3 px-4 font-mono font-medium text-zinc-900 dark:text-white">
                    {r.codigo}
                  </td>
                  <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 max-w-xs truncate" title={getNome(r) || undefined}>
                    {getNome(r) || <span className="italic text-zinc-400">Não cadastrado</span>}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-700 dark:text-zinc-300 font-medium">
                    {r.saldo_qtd}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-700 dark:text-zinc-300 font-medium">
                    {r.manual_qtd}
                  </td>
                  <td className={`py-3 px-4 text-right ${diffClass(diff)}`}>
                    {diff === 0 ? '✓' : `+${diff}`}
                  </td>
                  {hasJustification && (
                    <td className="py-3 px-4">
                      {countId && onJustificationSaved && (
                        <JustificationEditor
                          countId={countId}
                          codigo={r.codigo}
                          justification={justifications?.get(r.codigo)}
                          onSaved={onJustificationSaved}
                        />
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td className="py-4 px-4 text-center text-zinc-500 dark:text-zinc-400 italic" colSpan={hasJustification ? 6 : 5}>
                  Nenhum item encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: Cards */}
      <div className="sm:hidden space-y-2">
        {rows.map((r, i) => {
          const diff = calcDiff(r)
          return (
            <div key={i} className={`${mobileBg()} p-4 rounded-lg border border-zinc-200 dark:border-zinc-800`}>
              <div className="font-mono font-semibold text-zinc-900 dark:text-white mb-1">
                {r.codigo}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 truncate" title={getNome(r) || undefined}>
                {getNome(r) || <span className="italic text-zinc-400">Não cadastrado</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-zinc-500 dark:text-zinc-400 mb-1">Esperado</div>
                  <div className="font-semibold text-zinc-900 dark:text-white text-base">{r.saldo_qtd}</div>
                </div>
                <div>
                  <div className="text-zinc-500 dark:text-zinc-400 mb-1">Encontrado</div>
                  <div className="font-semibold text-zinc-900 dark:text-white text-base">{r.manual_qtd}</div>
                </div>
                <div>
                  <div className="text-zinc-500 dark:text-zinc-400 mb-1">{diffLabel}</div>
                  <div className={`font-bold text-base ${diffClass(diff)}`}>
                    {diff === 0 ? '✓' : `+${diff}`}
                  </div>
                </div>
              </div>
              {hasJustification && countId && onJustificationSaved && (
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="text-zinc-500 dark:text-zinc-400 mb-1 text-xs">Justificativa</div>
                  <JustificationEditor
                    countId={countId}
                    codigo={r.codigo}
                    justification={justifications?.get(r.codigo)}
                    onSaved={onJustificationSaved}
                  />
                </div>
              )}
            </div>
          )
        })}
        {rows.length === 0 && (
          <div className="py-4 px-4 text-center text-zinc-500 dark:text-zinc-400 italic">
            Nenhum item encontrado
          </div>
        )}
      </div>
    </>
  )
}

const MOTIVO_OPTIONS = Object.entries(MOTIVO_LABELS) as [Motivo, string][]

function JustificationEditor({ countId, codigo, justification, onSaved }: {
  countId: string
  codigo: string
  justification?: DivergenceJustification
  onSaved: (codigo: string, j: DivergenceJustification) => void
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
    if (nextMotivo === 'outra' && !nextObservacao.trim()) {
      setError('Descreva o motivo')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await upsertJustification(countId, codigo, nextMotivo, nextObservacao)
      onSaved(codigo, {
        count_id: countId,
        codigo,
        motivo: nextMotivo,
        observacao: nextMotivo === 'outra' ? nextObservacao.trim() : null,
      })
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar justificativa')
    } finally {
      setSaving(false)
    }
  }

  function handleMotivoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Motivo | ''
    setMotivo(next)
    if (!next) return
    if (next === 'outra') {
      if (observacao.trim()) void save(next, observacao)
      return
    }
    void save(next, '')
  }

  function handleObservacaoBlur() {
    if (motivo === 'outra') void save('outra', observacao)
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[10rem]">
      {!motivo && <span className="badge badge-warning w-fit">Pendente</span>}
      <select
        className="input py-1.5 text-xs"
        value={motivo}
        onChange={handleMotivoChange}
        disabled={saving}
      >
        <option value="">Selecionar motivo…</option>
        {MOTIVO_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      {motivo === 'outra' && (
        <input
          type="text"
          className="input py-1.5 text-xs"
          placeholder="Descreva o motivo…"
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          onBlur={handleObservacaoBlur}
          disabled={saving}
        />
      )}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  )
}

// Converte SVG (string) para PNG dataURL para uso no jsPDF
async function svgToPng(svgText: string, width = 240, height = 80): Promise<string> {
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.src = url
  await new Promise<void>(res => { img.onload = () => res() })
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)
  URL.revokeObjectURL(url)
  return canvas.toDataURL('image/png')
}
