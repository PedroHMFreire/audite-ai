import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CoverageProgressBar from '@/components/CoverageProgressBar'
import ConfirmFinalizationModal from '@/components/ConfirmFinalizationModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import FileUpload from '@/components/FileUpload'
import ManualEntry from '@/components/ManualEntry'
import { useToast } from '@/components/Toast'
import {
  addManualEntry,
  computeAndSaveResults,
  getCountById,
  getPlanItems,
  getStoreById,
  listManualEntries,
  replacePlanItems,
  setManualEntryQty,
  type Count
} from '@/lib/db'
import { feedbackSuccess, feedbackWarning, feedbackNeutral, feedbackError } from '@/lib/feedback'
import { onPendingChange, flushQueue, pendingCountFor } from '@/lib/offlineQueue'
import { InputValidator } from '@/lib/security'
import { getMyOrg, lookupProduct, batchLookupProducts } from '@/lib/catalog'

// Carregado sob demanda: a lib de leitura (ZXing) só baixa ao abrir o scanner.
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

type PlanRow = { codigo: string; nome: string; saldo: number }
type Entry = { id: string; codigo: string; qty: number; pending?: boolean }
type ItemStatus = 'regular' | 'falta' | 'excesso' | 'nao_contado'

export default function CountDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { addToast } = useToast()
  const [count, setCount] = useState<Count | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)
  const [plan, setPlan] = useState<PlanRow[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [search, setSearch] = useState('')
  const [showNotCounted, setShowNotCounted] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Entry | null>(null)
  const lastAddRef = useRef<{ codigo: string; qty: number } | null>(null)
  const reconcileTimer = useRef<number | null>(null)
  const hasOrg = useRef<boolean>(false)
  const catalogCache = useRef<Map<string, string | null>>(new Map())
  const [catalogNames, setCatalogNames] = useState<Map<string, string | null>>(new Map())
  const [pendingUnknown, setPendingUnknown] = useState<{
    codigo: string
    qty: number
    suggestion: string | null
    suggestionNome: string | null
  } | null>(null)

  const isEditable = count?.status !== 'finalizada' && count?.status !== 'arquivada'
  const canViewReport = count?.status === 'finalizada'

  const planCodes = useMemo(() => new Set(plan.map(p => p.codigo)), [plan])

  const planNameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of plan) if (p.nome) m.set(p.codigo, p.nome)
    return m
  }, [plan])

  // Mapeia variações do código → código canônico do plano.
  // Cobre: case-insensitive + código sem letra final (ex: "98438" → "98438p").
  const planCodeNormMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of plan) {
      m.set(p.codigo.toLowerCase(), p.codigo)
      // sem a última letra (p, m, g, a, b…)
      if (/[a-z]$/i.test(p.codigo) && p.codigo.length > 1) {
        m.set(p.codigo.slice(0, -1).toLowerCase(), p.codigo)
      }
    }
    return m
  }, [plan])

  // Resolve o código digitado/lido para o código canônico do plano, se existir.
  const resolveCode = useCallback((raw: string): string => {
    return planCodeNormMap.get(raw.toLowerCase()) ?? raw
  }, [planCodeNormMap])

  // Busca nomes do catálogo para todos os itens sem nome no plano
  useEffect(() => {
    const needed = entries
      .map(e => e.codigo)
      .filter(c => !planNameMap.get(c) && !catalogNames.get(c))
    if (needed.length === 0) return
    batchLookupProducts(needed).then(map => {
      if (map.size === 0) return // sem resultado: não cacheia, permite retry
      setCatalogNames(prev => {
        const next = new Map(prev)
        needed.forEach(c => {
          const found = map.get(c)
          if (found) next.set(c, found) // só armazena se achou nome
        })
        return next
      })
    })
  }, [entries, planNameMap])

  useEffect(() => {
    if (!id || !InputValidator.uuid(id)) {
      addToast({ type: 'error', message: 'ID da contagem invalido' })
      nav('/contagens')
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      // Verifica se o usuário tem organização (para validação do catálogo)
      getMyOrg().then(ctx => { hasOrg.current = ctx !== null }).catch(() => {})
      try {
        const [countData, planData, entriesData] = await Promise.all([
          getCountById(id!),
          getPlanItems(id!),
          listManualEntries(id!)
        ])
        if (cancelled) return
        setCount(countData)
        setPlan(planData)
        setEntries(entriesData.map(e => ({ id: e.id, codigo: e.codigo, qty: e.qty })))
        if (countData.store_id) {
          getStoreById(countData.store_id).then(name => { if (!cancelled) setStoreName(name) }).catch(() => {})
        }
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Erro ao carregar dados'
        setError(message)
        addToast({ type: 'error', message: 'Erro ao carregar contagem', description: message })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, nav, addToast])

  // Reconcilia a lista com o servidor (ids reais) sem bloquear o fluxo de leitura.
  const scheduleReconcile = useCallback(() => {
    if (!id) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    if (reconcileTimer.current) window.clearTimeout(reconcileTimer.current)
    reconcileTimer.current = window.setTimeout(async () => {
      try {
        await flushQueue()
        const fresh = await listManualEntries(id)
        setEntries(fresh.map(e => ({ id: e.id, codigo: e.codigo, qty: e.qty })))
      } catch {
        /* mantém o estado local */
      }
    }, 1200)
  }, [id])

  const onParsed = useCallback(async (items: PlanRow[]) => {
    if (!id || !isEditable) return
    try {
      await replacePlanItems(id, items)
      const rows = await getPlanItems(id)
      setPlan(rows)
      addToast({ type: 'success', message: 'Planilha carregada!', description: `${rows.length} produtos no plano` })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar planilha'
      addToast({ type: 'error', message: 'Erro ao salvar planilha', description: message })
    }
  }, [id, isEditable, addToast])

  // Registra a entrada de fato (após validação ou confirmação)
  const doAdd = useCallback(async (codigo: string, qty: number, inPlan: boolean, catalogNome?: string | null) => {
    let newTotal = qty
    setEntries(prev => {
      const idx = prev.findIndex(e => e.codigo === codigo)
      if (idx >= 0) {
        newTotal = prev[idx].qty + qty
        const next = [...prev]
        next[idx] = { ...next[idx], qty: newTotal, pending: true }
        const [moved] = next.splice(idx, 1)
        return [moved, ...next]
      }
      return [{ id: `tmp-${codigo}`, codigo, qty, pending: true }, ...prev]
    })
    lastAddRef.current = { codigo, qty }
    if (inPlan) feedbackSuccess()
    else feedbackWarning()

    try {
      await addManualEntry(id!, codigo, qty)
      let toastType: 'success' | 'warning' | 'error' = inPlan ? 'success' : 'warning'
      let toastMsg = catalogNome || codigo
      let toastDesc = inPlan
        ? `Total contado: ${newTotal}`
        : catalogNome
          ? `${codigo} · fora do plano desta contagem`
          : 'Código desconhecido registrado como excesso'
      addToast({ type: toastType, message: toastMsg, description: toastDesc, duration: 2200 })
      scheduleReconcile()
    } catch (err) {
      feedbackError()
      const message = err instanceof Error ? err.message : 'Erro ao adicionar'
      addToast({ type: 'error', message: 'Não foi possível adicionar', description: message })
    }
  }, [id, addToast, scheduleReconcile])

  const onAdd = useCallback(async (codigoRaw: string, qty: number = 1) => {
    if (!id || !isEditable) {
      if (!isEditable) addToast({ type: 'warning', message: 'Contagem bloqueada', description: 'Reabra para inserir itens' })
      return
    }
    const codigo = resolveCode(codigoRaw.trim()) // normaliza para o código canônico do plano
    if (!codigo) return
    const inPlan = planCodes.size === 0 || planCodes.has(codigo)

    // Para códigos fora do plano com catálogo: validar ANTES do update otimista
    if (!inPlan && hasOrg.current) {
      if (!catalogCache.current.has(codigo)) {
        const found = await lookupProduct(codigo)
        catalogCache.current.set(codigo, found?.nome ?? null)
        if (found?.nome) setCatalogNames(prev => new Map(prev).set(codigo, found.nome))
      }
      const catalogNome = catalogCache.current.get(codigo)

      if (catalogNome == null) {
        // Código desconhecido: pedir confirmação antes de registrar
        feedbackWarning()
        const suggestion = findSimilarCode(codigo, Array.from(planCodes))
        setPendingUnknown({
          codigo,
          qty,
          suggestion,
          suggestionNome: suggestion ? (planNameMap.get(suggestion) || null) : null
        })
        return
      }

      // Encontrado no catálogo: registrar normalmente
      await doAdd(codigo, qty, false, catalogNome)
      return
    }

    await doAdd(codigo, qty, inPlan, undefined)
  }, [id, isEditable, planCodes, addToast, doAdd, planNameMap])

  const confirmUnknownCode = useCallback(async () => {
    if (!pendingUnknown) return
    const { codigo, qty } = pendingUnknown
    setPendingUnknown(null)
    await doAdd(codigo, qty, false, null)
  }, [pendingUnknown, doAdd])

  const undoLast = useCallback(async () => {
    const last = lastAddRef.current
    if (!last || !id) return
    lastAddRef.current = null
    const codigo = last.codigo
    let resultTotal = 0
    setEntries(prev => {
      const idx = prev.findIndex(e => e.codigo === codigo)
      if (idx < 0) return prev
      const remaining = prev[idx].qty - last.qty
      resultTotal = remaining
      if (remaining <= 0) return prev.filter((_, i) => i !== idx)
      const next = [...prev]
      next[idx] = { ...next[idx], qty: remaining, pending: true }
      return next
    })
    feedbackNeutral()
    try {
      await setManualEntryQty(id, codigo, resultTotal)
      addToast({ type: 'info', message: 'Desfeito', description: codigo, duration: 1600 })
      scheduleReconcile()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desfazer'
      addToast({ type: 'error', message: 'Não foi possível desfazer', description: message })
    }
  }, [id, addToast, scheduleReconcile])

  const confirmRemove = useCallback(async () => {
    const target = removeTarget
    setRemoveTarget(null)
    if (!target || !id) return
    setEntries(prev => prev.filter(e => e.codigo !== target.codigo))
    feedbackNeutral()
    try {
      await setManualEntryQty(id, target.codigo, 0)
      addToast({ type: 'info', message: 'Item removido', description: target.codigo, duration: 1600 })
      scheduleReconcile()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover'
      addToast({ type: 'error', message: 'Não foi possível remover', description: message })
    }
  }, [removeTarget, id, addToast, scheduleReconcile])

  // ----- Métricas -----
  const countedByCode = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of entries) m.set(e.codigo, (m.get(e.codigo) || 0) + e.qty)
    return m
  }, [entries])

  const stats = useMemo(() => {
    let regular = 0, falta = 0, excesso = 0, naoContado = 0
    const naoContados: PlanRow[] = []
    for (const p of plan) {
      const c = countedByCode.get(p.codigo) || 0
      if (c === 0) { naoContado++; naoContados.push(p) }
      else if (c === p.saldo) regular++
      else if (c < p.saldo) falta++
      else excesso++
    }
    let extras = 0
    for (const codigo of countedByCode.keys()) if (!planCodes.has(codigo)) extras++
    const contados = plan.length - naoContado
    return { regular, falta, excesso, naoContado, extras, contados, totalPlano: plan.length, naoContados }
  }, [plan, countedByCode, planCodes])

  const totals = useMemo(() => ({
    planCodes: plan.length,
    planItems: plan.reduce((a, p) => a + (Number(p.saldo) || 0), 0),
    insertedCodes: countedByCode.size,
    insertedItems: Array.from(countedByCode.values()).reduce((a, q) => a + q, 0)
  }), [plan, countedByCode])

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(e => e.codigo.toLowerCase().includes(q))
  }, [entries, search])

  const statusOf = useCallback((codigo: string): ItemStatus => {
    if (!planCodes.has(codigo)) return 'excesso'
    const saldo = plan.find(p => p.codigo === codigo)?.saldo ?? 0
    const c = countedByCode.get(codigo) || 0
    if (c === 0) return 'nao_contado'
    if (c === saldo) return 'regular'
    return c < saldo ? 'falta' : 'excesso'
  }, [plan, planCodes, countedByCode])

  const finalizar = useCallback(async () => {
    if (!id || !isEditable) return
    setIsProcessing(true)
    try {
      // Garante que entradas offline foram enviadas antes de computar
      await flushQueue()

      // Verifica se ainda restam entradas pendentes (ex: sem conexão)
      const remaining = await pendingCountFor(id)
      if (remaining > 0) {
        addToast({
          type: 'error',
          message: 'Entradas não sincronizadas',
          description: `${remaining} leitura(s) pendentes. Verifique a conexão e tente novamente.`
        })
        return
      }

      const summary = await computeAndSaveResults(id)
      addToast({ type: 'success', message: 'Contagem finalizada!', description: `${summary.total} itens processados` })
      setCount(prev => prev ? { ...prev, status: 'finalizada' } : prev)
      window.setTimeout(() => nav(`/relatorio/${id}`), 900)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao finalizar'
      addToast({ type: 'error', message: 'Erro ao finalizar contagem', description: message })
    } finally {
      setIsProcessing(false)
      setShowConfirmModal(false)
    }
  }, [id, isEditable, nav, addToast])

  const handleFinalizarClick = useCallback(() => {
    if (!isEditable) return
    if (plan.length === 0) {
      addToast({ type: 'error', message: 'Planilha não carregada', description: 'Envie a planilha antes de finalizar' })
      return
    }
    if (entries.length === 0) {
      addToast({ type: 'error', message: 'Nenhum item inserido', description: 'Insira ao menos um item' })
      return
    }
    setShowConfirmModal(true)
  }, [isEditable, plan, entries, addToast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-zinc-500">Carregando contagem...</div>
    )
  }
  if (error) {
    return (
      <div className="card text-center py-8">
        <div className="text-danger mb-2 font-medium">Erro</div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{error}</div>
        <Link to="/contagens" className="btn">Voltar para contagens</Link>
      </div>
    )
  }

  const progressPct = stats.totalPlano > 0 ? Math.round((stats.contados / stats.totalPlano) * 100) : 0

  return (
    <div className="space-y-5 pb-44">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">
            {count?.nome || '...'}
            {storeName && <span className="text-zinc-500 dark:text-zinc-400 font-normal"> • {storeName}</span>}
          </h1>
          <div className="mt-0.5"><SyncStatus countId={id!} /></div>
        </div>
        {canViewReport && <Link to={`/relatorio/${id}`} className="badge badge-primary flex-shrink-0">Ver relatório</Link>}
      </div>

      {!isEditable && (
        <div className="card border-warning/30 bg-warning/10 text-sm text-yellow-800 dark:text-yellow-100">
          Contagem bloqueada para edição. Reabra pelo relatório para alterar.
        </div>
      )}

      {/* Corpo em 2 colunas no desktop */}
      <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
      {/* Coluna esquerda: progresso, planilha, cobertura */}
      <div className="space-y-5 lg:col-span-2">
      {/* Progresso */}
      {plan.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-muted">Progresso da contagem</div>
              <div className="text-2xl font-semibold">
                {stats.contados}<span className="text-zinc-400 text-lg"> / {stats.totalPlano}</span>
                <span className="text-sm font-normal text-muted ml-1">produtos</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-primary-500 tabular-nums">{progressPct}%</div>
          </div>
          <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <Chip label="Regular" value={stats.regular} tone="success" />
            <Chip label="Falta" value={stats.falta} tone="warning" />
            <Chip label="Excesso" value={stats.excesso + stats.extras} tone="danger" />
            <Chip label="Não contados" value={stats.naoContado} tone="muted" />
          </div>
        </div>
      )}

      {/* Upload da planilha */}
      {isEditable && (
        <details className="card" open={plan.length === 0}>
          <summary className="cursor-pointer text-sm font-medium select-none">
            {plan.length === 0 ? '1) Envie a planilha (código | nome | saldo)' : `Planilha carregada · ${plan.length} produtos`}
          </summary>
          <div className="pt-3"><FileUpload onParsed={onParsed} /></div>
        </details>
      )}

      <CoverageProgressBar
        planCodes={totals.planCodes}
        insertedCodes={totals.insertedCodes}
        planItems={totals.planItems}
        insertedItems={totals.insertedItems}
      />
      </div>{/* fim coluna esquerda */}

      {/* Coluna direita: o que falta e itens contados */}
      <div className="space-y-5 lg:col-span-3">
      {/* Não contados (o que falta caçar) */}
      {isEditable && stats.naoContado > 0 && (
        <div className="card">
          <button
            className="w-full flex items-center justify-between text-sm font-medium"
            onClick={() => setShowNotCounted(v => !v)}
          >
            <span>Ainda não contados <span className="text-muted">({stats.naoContado})</span></span>
            <span className="text-muted">{showNotCounted ? '▾' : '▸'}</span>
          </button>
          {showNotCounted && (
            <ul className="mt-3 max-h-56 overflow-auto divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-800">
              {stats.naoContados.slice(0, 200).map(p => (
                <li key={p.codigo} className="flex items-center justify-between py-2.5 px-3 text-sm">
                  <span className="font-mono">{p.codigo}</span>
                  <span className="text-muted truncate ml-3">{p.nome}</span>
                </li>
              ))}
              {stats.naoContados.length > 200 && (
                <li className="py-2 px-3 text-xs text-center text-muted">+{stats.naoContados.length - 200} restantes</li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Itens contados */}
      <div className="card">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h3 className="text-sm font-semibold">Itens contados <span className="text-muted">({entries.length})</span></h3>
        </div>
        {entries.length > 8 && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar código..."
            className="input mb-3 font-mono"
            autoCapitalize="off" autoCorrect="off" spellCheck={false}
          />
        )}
        <ul className="max-h-[22rem] overflow-auto divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-800">
          {filteredEntries.map(entry => {
            const nome = planNameMap.get(entry.codigo) || catalogNames.get(entry.codigo) || null
            return (
            <li key={entry.id} className="flex items-center gap-3 py-3 px-3">
              <StatusDot status={statusOf(entry.codigo)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {nome || <span className="font-mono font-semibold">{entry.codigo}</span>}
                </div>
                {nome && (
                  <div className="text-xs font-mono text-zinc-400 dark:text-zinc-500 truncate">{entry.codigo}</div>
                )}
                <div className="text-xs text-muted mt-0.5">
                  {entry.qty} un
                  {entry.pending && <span className="ml-2 text-primary-500">⟳ sincronizando</span>}
                </div>
              </div>
              {isEditable && (
                <button
                  className="rounded-lg px-3 min-h-10 text-sm text-danger hover:bg-danger/10 active:scale-95 transition"
                  onClick={() => setRemoveTarget(entry)}
                  aria-label={`Remover ${entry.codigo}`}
                >
                  Remover
                </button>
              )}
            </li>
            )
          })}
          {filteredEntries.length === 0 && (
            <li className="py-8 px-4 text-center text-sm text-muted italic">
              {entries.length === 0 ? 'Nenhum item contado ainda' : 'Nenhum código corresponde à busca'}
            </li>
          )}
        </ul>
      </div>

      </div>{/* fim coluna direita */}
      </div>{/* fim grid 2 colunas */}

      {/* Barra fixa de ação (no alcance do polegar) */}
      {isEditable && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto space-y-2.5">
            <ManualEntry onAdd={onAdd} onScan={() => setShowScanner(true)} />
            <div className="flex gap-2">
              <button
                className="btn-ghost rounded-xl px-4 min-h-11 text-sm disabled:opacity-40"
                onClick={undoLast}
                disabled={!lastAddRef.current}
              >
                ↶ Desfazer
              </button>
              <button className="btn flex-1 min-h-11" onClick={handleFinalizarClick} disabled={isProcessing}>
                {isProcessing ? 'Processando...' : 'Finalizar contagem'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isEditable && (
        <Link to="/contagens" className="badge">Voltar</Link>
      )}

      {showScanner && (
        <Suspense fallback={<div className="fixed inset-0 z-[60] bg-black flex items-center justify-center text-white/80 text-sm">Abrindo câmera…</div>}>
          <BarcodeScanner
            planCodes={planCodes}
            onDetected={(code: string) => onAdd(code, 1)}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
      )}

      {/* Modal: código desconhecido */}
      {pendingUnknown && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm space-y-4 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0">
            <div>
              <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Código não encontrado</div>
              <div className="text-2xl font-mono font-bold tracking-wider">{pendingUnknown.codigo}</div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                Este código não está no plano nem no catálogo de produtos.<br />
                Verifique se foi lido ou digitado corretamente.
              </p>
            </div>

            {pendingUnknown.suggestion && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">Você quis dizer?</div>
                <div className="font-mono font-bold text-zinc-900 dark:text-white">{pendingUnknown.suggestion}</div>
                {pendingUnknown.suggestionNome && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">{pendingUnknown.suggestionNome}</div>
                )}
                <button
                  className="text-xs text-amber-700 dark:text-amber-400 underline underline-offset-2"
                  onClick={() => {
                    const s = pendingUnknown.suggestion!
                    const q = pendingUnknown.qty
                    setPendingUnknown(null)
                    onAdd(s, q)
                  }}
                >
                  Inserir {pendingUnknown.suggestion} em vez disso →
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button className="btn-ghost flex-1 min-h-11" onClick={() => setPendingUnknown(null)}>
                Cancelar
              </button>
              <button
                className="flex-1 min-h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors"
                onClick={confirmUnknownCode}
              >
                Inserir mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="Remover item?"
        description={removeTarget ? `${removeTarget.codigo} — ${removeTarget.qty} un serão removidas da contagem.` : ''}
        confirmLabel="Remover"
        destructive
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmFinalizationModal
        isOpen={showConfirmModal}
        planCodes={totals.planCodes}
        planItems={totals.planItems}
        insertedCodes={totals.insertedCodes}
        insertedItems={totals.insertedItems}
        loading={isProcessing}
        onConfirm={finalizar}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  )
}

function Chip({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'danger' | 'muted' }) {
  const tones: Record<string, string> = {
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
    muted: 'bg-zinc-500/10 text-zinc-500'
  }
  return (
    <div className={`rounded-xl px-3 py-2 ${tones[tone]}`}>
      <div className="text-lg font-semibold tabular-nums leading-none">{value}</div>
      <div className="text-[11px] mt-1 opacity-80">{label}</div>
    </div>
  )
}

function StatusDot({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, { c: string; t: string }> = {
    regular: { c: 'bg-emerald-500', t: 'Regular' },
    falta: { c: 'bg-amber-500', t: 'Falta' },
    excesso: { c: 'bg-red-500', t: 'Excesso' },
    nao_contado: { c: 'bg-zinc-300 dark:bg-zinc-600', t: 'Não contado' }
  }
  return <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${map[status].c}`} title={map[status].t} />
}

function SyncStatus({ countId }: { countId: string }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    const unsub = onPendingChange(async () => setPending(await pendingCountFor(countId)))
    void pendingCountFor(countId).then(setPending)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
      unsub()
    }
  }, [countId])

  if (!online) {
    return <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"><span className="h-2 w-2 rounded-full bg-amber-500" />Offline — salvando no aparelho</span>
  }
  if (pending > 0) {
    return <span className="inline-flex items-center gap-1.5 text-xs text-primary-500"><span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />Sincronizando {pending}…</span>
  }
  return <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-500" />Tudo salvo</span>
}

function levenshtein(a: string, b: string): number {
  const n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = temp
    }
  }
  return dp[n]
}

function findSimilarCode(codigo: string, planCodes: string[]): string | null {
  const MAX_DIST = 2
  const lower = codigo.toLowerCase()
  let best: string | null = null
  let bestDist = MAX_DIST + 1
  for (const c of planCodes) {
    if (Math.abs(c.length - codigo.length) > MAX_DIST) continue
    const d = levenshtein(lower, c.toLowerCase())
    if (d > 0 && d < bestDist) { bestDist = d; best = c }
  }
  return bestDist <= MAX_DIST ? best : null
}
