import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CoverageProgressBar from '@/components/CoverageProgressBar'
import ConfirmFinalizationModal from '@/components/ConfirmFinalizationModal'
import FileUpload from '@/components/FileUpload'
import ManualEntry from '@/components/ManualEntry'
import { useToast } from '@/components/Toast'
import {
  addManualEntry,
  computeAndSaveResults,
  deleteManualEntry,
  getCountById,
  getPlanItems,
  listManualEntries,
  replacePlanItems,
  updateManualEntry,
  type Count
} from '@/lib/db'

type PlanRow = { codigo: string; nome: string; saldo: number }
type Entry = { id: string; count_id: string; codigo: string; qty?: number; created_at: string }

export default function CountDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { addToast } = useToast()
  const [count, setCount] = useState<Count | null>(null)
  const [plan, setPlan] = useState<PlanRow[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editQty, setEditQty] = useState<number>(1)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const isEditable = count?.status !== 'finalizada' && count?.status !== 'arquivada'
  const canViewReport = count?.status === 'finalizada'

  useEffect(() => {
    if (!id || !isValidUUID(id)) {
      addToast({ type: 'error', message: 'ID da contagem invalido' })
      nav('/contagens')
      return
    }

    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const [countData, planData, entriesData] = await Promise.all([
          getCountById(id!),
          getPlanItems(id!),
          listManualEntries(id!)
        ])

        if (cancelled) return
        setCount(countData)
        setPlan(planData)
        setEntries(entriesData)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Erro ao carregar dados'
        setError(message)
        addToast({ type: 'error', message: 'Erro ao carregar contagem', description: message })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [id, nav, addToast])

  const refreshPlan = useCallback(async () => {
    if (!id) return
    const rows = await getPlanItems(id)
    setPlan(rows)
  }, [id])

  const refreshEntries = useCallback(async () => {
    if (!id) return
    const rows = await listManualEntries(id)
    setEntries(rows)
  }, [id])

  const onParsed = useCallback(async (items: PlanRow[]) => {
    if (!id) return
    if (!isEditable) {
      addToast({
        type: 'warning',
        message: 'Contagem bloqueada',
        description: 'Reabra a contagem antes de alterar a planilha'
      })
      return
    }

    try {
      await replacePlanItems(id, items)
      await refreshPlan()
      addToast({ type: 'success', message: 'Planilha carregada com sucesso!' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar planilha'
      addToast({ type: 'error', message: 'Erro ao salvar planilha', description: message })
    }
  }, [id, isEditable, refreshPlan, addToast])

  const onAdd = useCallback(async (codigo: string, qty: number = 1) => {
    if (!id) return
    if (!isEditable) {
      addToast({
        type: 'warning',
        message: 'Contagem bloqueada',
        description: 'Reabra a contagem antes de inserir itens'
      })
      return
    }

    const planCodes = new Set(plan.map(p => p.codigo))
    if (!planCodes.has(codigo) && plan.length > 0) {
      addToast({
        type: 'warning',
        message: 'Codigo desconhecido',
        description: `"${codigo}" nao esta na planilha atual`,
        duration: 5000
      })
    }

    try {
      await addManualEntry(id, codigo, qty)
      await refreshEntries()
      if (planCodes.has(codigo)) addToast({ type: 'success', message: 'Item adicionado', duration: 2000 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar item'
      addToast({ type: 'error', message: 'Erro ao adicionar item', description: message })
    }
  }, [id, isEditable, plan, refreshEntries, addToast])

  const startEdit = useCallback((entry: Entry) => {
    setEditingId(entry.id)
    setEditCode(entry.codigo)
    setEditQty(entry.qty || 1)
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId || !isEditable) return

    try {
      await updateManualEntry(editingId, {
        codigo: editCode.trim(),
        qty: Math.max(1, Number(editQty) || 1)
      })
      setEditingId(null)
      await refreshEntries()
      addToast({ type: 'success', message: 'Item atualizado', duration: 2000 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar item'
      addToast({ type: 'error', message: 'Erro ao atualizar item', description: message })
    }
  }, [editingId, isEditable, editCode, editQty, refreshEntries, addToast])

  const removeEntry = useCallback(async (entryId: string) => {
    if (!isEditable) return
    if (!confirm('Remover este item?')) return

    try {
      await deleteManualEntry(entryId)
      await refreshEntries()
      addToast({ type: 'info', message: 'Item removido', duration: 2000 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover item'
      addToast({ type: 'error', message: 'Erro ao remover item', description: message })
    }
  }, [isEditable, refreshEntries, addToast])

  const totals = useMemo(() => {
    const planCodes = plan.length
    const planItems = plan.reduce((acc, p) => acc + (Number(p.saldo) || 0), 0)
    const insertedItems = entries.reduce((acc, e) => acc + (Number(e.qty) || 1), 0)
    const insertedCodes = new Set(entries.map(e => e.codigo)).size
    return { planCodes, planItems, insertedCodes, insertedItems }
  }, [plan, entries])

  const stats = useMemo(() => {
    const mapPlan = new Map<string, number>()
    const mapAdd = new Map<string, number>()

    for (const p of plan) mapPlan.set(p.codigo, p.saldo)
    for (const entry of entries) mapAdd.set(entry.codigo, (mapAdd.get(entry.codigo) || 0) + (entry.qty || 1))

    let reg = 0
    let exc = 0
    let fal = 0

    for (const [codigo, saldo] of mapPlan.entries()) {
      const counted = mapAdd.get(codigo) || 0
      if (counted === saldo) reg++
      else if (counted < saldo) fal++
      else exc++
    }

    for (const codigo of mapAdd.keys()) {
      if (!mapPlan.has(codigo)) exc++
    }

    return { reg, exc, fal }
  }, [plan, entries])

  const finalizar = useCallback(async () => {
    if (!id || !isEditable) return
    setIsProcessing(true)

    try {
      const summary = await computeAndSaveResults(id)
      addToast({
        type: 'success',
        message: 'Contagem finalizada!',
        description: `${summary.total} itens processados. Redirecionando...`
      })
      setCount(prev => prev ? { ...prev, status: 'finalizada' } : prev)
      window.setTimeout(() => nav(`/relatorio/${id}`), 1000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao finalizar contagem'
      addToast({ type: 'error', message: 'Erro ao finalizar contagem', description: message })
    } finally {
      setIsProcessing(false)
      setShowConfirmModal(false)
    }
  }, [id, isEditable, nav, addToast])

  const handleFinalizarClick = useCallback(() => {
    if (!isEditable) return

    if (plan.length === 0) {
      addToast({
        type: 'error',
        message: 'Planilha nao carregada',
        description: 'Envie a planilha de codigos antes de finalizar'
      })
      return
    }

    if (entries.length === 0) {
      addToast({
        type: 'error',
        message: 'Nenhum item inserido',
        description: 'Insira pelo menos um item antes de finalizar'
      })
      return
    }

    setShowConfirmModal(true)
  }, [isEditable, plan, entries, addToast])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Carregando contagem...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="text-center py-6">
            <div className="text-red-500 mb-2">Erro</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{error}</div>
            <Link to="/contagens" className="btn">Voltar para contagens</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Contagem: {count?.nome || '...'}</h1>
          {!isEditable && (
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {count?.status === 'arquivada' ? 'Contagem arquivada' : 'Contagem finalizada'}.
            </div>
          )}
        </div>
        {canViewReport && <Link to={`/relatorio/${id}`} className="badge">Ver relatorio</Link>}
      </div>

      {!isEditable && (
        <div className="card border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-sm text-yellow-800 dark:text-yellow-100">
          Esta contagem esta bloqueada para edicao. Reabra a contagem pelo relatorio para alterar planilha ou itens.
        </div>
      )}

      <div className={`card space-y-4 ${!isEditable ? 'opacity-70' : ''}`}>
        <div>
          <div className="text-sm mb-2">1) Envie a planilha (codigo | nome | saldo)</div>
          <FileUpload onParsed={onParsed} />
        </div>
        <div>
          <div className="text-sm mb-2">2) Insira os codigos encontrados no estoque</div>
          <ManualEntry onAdd={onAdd} />
        </div>
      </div>

      <CoverageProgressBar
        planCodes={totals.planCodes}
        insertedCodes={totals.insertedCodes}
        planItems={totals.planItems}
        insertedItems={totals.insertedItems}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Planilha - Codigos" value={totals.planCodes} />
        <MetricCard label="Planilha - Itens" value={totals.planItems} />
        <MetricCard label="Inseridos - Codigos" value={totals.insertedCodes} />
        <MetricCard label="Inseridos - Itens" value={totals.insertedItems} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard label="Regulares" value={stats.reg} />
        <MetricCard label="Excesso" value={stats.exc} />
        <MetricCard label="Falta" value={stats.fal} />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Itens Inseridos</h3>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Mais recentes primeiro</div>
        </div>
        <ul className="max-h-80 overflow-auto text-sm divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-800">
          {entries.map((entry, idx) => {
            const striped = idx % 2 === 0
            return (
              <li
                key={entry.id}
                className={`py-3 px-4 flex items-center gap-3 transition-colors ${
                  striped ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50 dark:bg-zinc-800/50'
                } hover:bg-zinc-100 dark:hover:bg-zinc-700`}
              >
                {editingId === entry.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input className="input text-sm flex-1" value={editCode} onChange={ev => setEditCode(ev.target.value)} autoFocus />
                    <input
                      className="input text-sm w-20"
                      type="number"
                      min="1"
                      value={editQty}
                      onChange={ev => setEditQty(ev.target.value === '' ? 1 : Math.max(1, Number(ev.target.value) || 1))}
                    />
                    <button className="badge bg-green-600 hover:bg-green-700 text-white text-xs" onClick={saveEdit}>Salvar</button>
                    <button className="badge bg-zinc-400 hover:bg-zinc-500 text-white text-xs" onClick={() => setEditingId(null)}>Cancelar</button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-semibold text-zinc-900 dark:text-white">{entry.codigo}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Qtd: <span className="font-medium">{entry.qty || 1}</span> - {new Date(entry.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    {isEditable && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button className="badge bg-blue-600 hover:bg-blue-700 text-white text-xs px-2" onClick={() => startEdit(entry)}>Editar</button>
                        <button className="badge bg-red-600 hover:bg-red-700 text-white text-xs px-2" onClick={() => removeEntry(entry.id)}>Remover</button>
                      </div>
                    )}
                  </>
                )}
              </li>
            )
          })}
          {entries.length === 0 && (
            <li className="py-6 px-4 text-center text-zinc-500 dark:text-zinc-400 italic">
              Nenhum item inserido ainda
            </li>
          )}
        </ul>
      </div>

      <div className="flex gap-3">
        {isEditable && (
          <button className="btn" onClick={handleFinalizarClick} disabled={isProcessing}>
            {isProcessing ? 'Processando...' : 'Finalizar contagem'}
          </button>
        )}
        <Link to="/contagens" className="badge">Voltar</Link>
      </div>

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

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function isValidUUID(uuid: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(uuid)
}
