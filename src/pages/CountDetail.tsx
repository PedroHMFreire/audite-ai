import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import FileUpload from '@/components/FileUpload'
import ManualEntry from '@/components/ManualEntry'
import { useToast } from '@/components/Toast'
import ConfirmFinalizationModal from '@/components/ConfirmFinalizationModal'
import CoverageProgressBar from '@/components/CoverageProgressBar'
import {
  addManualEntry,
  computeAndSaveResults,
  getCountById,
  savePlanItems,
  listManualEntries,
  updateManualEntry,
  deleteManualEntry,
  getPlanItems,
  type Count
} from '@/lib/db'
import { supabase } from '@/lib/supabaseClient'

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
  const [editCode, setEditCode] = useState<string>('')
  const [editQty, setEditQty] = useState<number>(1)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Validação de UUID
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  useEffect(() => {
    if (!id) {
      nav('/')
      return
    }
    
    if (!isValidUUID(id)) {
      addToast({
        type: 'error',
        message: 'ID da contagem inválido'
      })
      nav('/')
      return
    }

    const loadData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const [countData, planData, entriesData] = await Promise.all([
          getCountById(id),
          getPlanItems(id),
          listManualEntries(id)
        ])
        
        setCount(countData)
        setPlan(planData)
        setEntries(entriesData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar dados'
        setError(message)
        addToast({
          type: 'error',
          message: 'Erro ao carregar contagem',
          description: message
        })
        console.error('Erro ao carregar contagem:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, nav, addToast])

  const refreshPlan = useCallback(async () => {
    if (!id) return
    try {
      const rows = await getPlanItems(id)
      setPlan(rows)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar planilha'
      addToast({
        type: 'error',
        message: 'Erro ao carregar planilha',
        description: message
      })
      console.error('Erro ao carregar planilha:', err)
    }
  }, [id, addToast])

  const refreshEntries = useCallback(async () => {
    if (!id) return
    try {
      const rows = await listManualEntries(id)
      setEntries(rows)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar entradas'
      addToast({
        type: 'error',
        message: 'Erro ao carregar entradas',
        description: message
      })
      console.error('Erro ao carregar entradas:', err)
    }
  }, [id, addToast])

  const onParsed = useCallback(async (items: PlanRow[]) => {
    if (!id) return
    
    try {
      setPlan(items)
      
      // Validar que count pertence ao usuário antes de deletar
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user?.id) {
        throw new Error('Usuário não autenticado')
      }

      const { data: countData, error: countError } = await supabase
        .from('counts')
        .select('id')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single()

      if (countError || !countData) {
        throw new Error('Você não tem permissão para modificar esta contagem')
      }

      // Agora sim delete com segurança
      await supabase.from('plan_items').delete().eq('count_id', id)
      await savePlanItems(id, items)
      
      addToast({
        type: 'success',
        message: 'Planilha carregada com sucesso!'
      })
      await refreshPlan()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar planilha'
      addToast({
        type: 'error',
        message: 'Erro ao salvar planilha',
        description: message
      })
      console.error('Erro ao processar planilha:', err)
    }
  }, [id, refreshPlan, addToast])

  const onAdd = useCallback(async (codigo: string, qty: number = 1) => {
    if (!id) return
    
    // 🎯 VALIDAÇÃO DE CÓDIGO DESCONHECIDO - Nova funcionalidade!
    const planCodes = new Set(plan.map(p => p.codigo))
    if (!planCodes.has(codigo) && plan.length > 0) {
      addToast({
        type: 'warning',
        message: 'Código desconhecido',
        description: `"${codigo}" não está na planilha atual`,
        duration: 5000 // 5 segundos para warning
      })
    }
    
    try {
      await addManualEntry(id, codigo, qty)
      await refreshEntries()
      
      // Toast de sucesso mais discreto para não poluir
      if (planCodes.has(codigo)) {
        addToast({
          type: 'success',
          message: 'Item adicionado',
          duration: 2000 // 2 segundos apenas
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar item'
      addToast({
        type: 'error',
        message: 'Erro ao adicionar item',
        description: message
      })
      console.error('Erro ao adicionar entrada:', err)
    }
  }, [id, plan, refreshEntries, addToast])

  const startEdit = useCallback((e: Entry) => {
    setEditingId(e.id)
    setEditCode(e.codigo)
    setEditQty(e.qty || 1)
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId) return
    
    try {
      await updateManualEntry(editingId, { 
        codigo: editCode.trim(), 
        qty: Math.max(1, Number(editQty) || 1) 
      })
      setEditingId(null)
      await refreshEntries()
      addToast({
        type: 'success',
        message: 'Item atualizado',
        duration: 2000
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar item'
      addToast({
        type: 'error',
        message: 'Erro ao atualizar item',
        description: message
      })
      console.error('Erro ao salvar edição:', err)
    }
  }, [editingId, editCode, editQty, refreshEntries, addToast])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditCode('')
    setEditQty(1)
  }, [])

  const removeEntry = useCallback(async (idRow: string) => {
    if (!confirm('Remover este item?')) return
    
    try {
      await deleteManualEntry(idRow)
      await refreshEntries()
      addToast({
        type: 'info',
        message: 'Item removido',
        duration: 2000
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover item'
      addToast({
        type: 'error',
        message: 'Erro ao remover item',
        description: message
      })
      console.error('Erro ao remover entrada:', err)
    }
  }, [refreshEntries, addToast])

  // >>> NOVO: totais de códigos e itens (planilha x inseridos)
  const totals = useMemo(() => {
    const planCodes = plan.length
    const planItems = plan.reduce((acc, p) => acc + (Number(p.saldo) || 0), 0)

    const insertedItems = entries.reduce((acc, e) => acc + (Number(e.qty) || 1), 0)
    const insertedCodes = new Set(entries.map(e => e.codigo)).size

    return { planCodes, planItems, insertedCodes, insertedItems }
  }, [plan, entries])

  // Cards de categoria (reg/exc/fal) continuam iguais
  const stats = useMemo(() => {
    const mapPlan = new Map<string, number>()
    for (const p of plan) mapPlan.set(p.codigo, p.saldo)
    const mapAdd = new Map<string, number>()
    for (const a of entries) mapAdd.set(a.codigo, (mapAdd.get(a.codigo) || 0) + (a.qty || 1))

    let reg = 0, exc = 0, fal = 0
    for (const [c, saldo] of mapPlan.entries()) {
      const m = mapAdd.get(c) || 0
      if (m === saldo) reg++
      else if (m === 0) fal++
    }
    for (const [c] of mapAdd.entries()) {
      if (!mapPlan.has(c)) exc++
    }
    return { reg, exc, fal }
  }, [plan, entries])

  const finalizar = useCallback(async () => {
    if (!id) {
      console.error('❌ Erro: ID da contagem está vazio')
      addToast({
        type: 'error',
        message: 'Erro interno',
        description: 'ID da contagem não encontrado'
      })
      return
    }
    
    console.log('🔄 Iniciando finalização da contagem...', { count_id: id })
    setIsProcessing(true)
    
    try {
      console.log('📊 Calculando resultados...')
      const results = await computeAndSaveResults(id)
      
      console.log(`✓ Contagem finalizada com sucesso! ${results.length} resultados salvos`)
      addToast({
        type: 'success',
        message: 'Contagem finalizada!',
        description: `${results.length} itens processados. Redirecionando...`
      })
      
      // Aguarda um pouco para o toast aparecer antes de navegar
      setTimeout(() => {
        nav(`/relatorio/${id}`)
      }, 1000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao finalizar contagem'
      console.error('❌ Erro ao finalizar:', message, err)
      
      addToast({
        type: 'error',
        message: 'Erro ao finalizar contagem',
        description: message
      })
    } finally {
      setIsProcessing(false)
      setShowConfirmModal(false)
    }
  }, [id, nav, addToast])

  const handleFinalizarClick = useCallback(() => {
    console.log('🔍 Validando antes de finalizar...', { planCodes: totals.planCodes, entradas: entries.length })
    
    // Validação 1: Verifica se há planilha carregada
    if (plan.length === 0) {
      console.warn('⚠️ Validação falhou: Planilha vazia')
      addToast({
        type: 'error',
        message: 'Planilha não carregada',
        description: 'Envie a planilha de códigos antes de finalizar'
      })
      return
    }

    // Validação 2: Verifica se há itens inseridos
    if (entries.length === 0) {
      console.warn('⚠️ Validação falhou: Nenhum item inserido')
      addToast({
        type: 'error',
        message: 'Nenhum item inserido',
        description: 'Insira pelo menos um item antes de finalizar'
      })
      return
    }

    // Todas as validações passaram
    console.log('✓ Validações passaram. Abrindo modal de confirmação...')
    setShowConfirmModal(true)
  }, [plan, entries, addToast, totals])

  // Verifica se componente ainda está montado antes de atualizar estado
  useEffect(() => {
    let isMounted = true
    
    return () => {
      isMounted = false
    }
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Carregando contagem...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="text-center py-6">
            <div className="text-red-500 mb-2">⚠️ Erro</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{error}</div>
            <Link to="/" className="btn">Voltar para Home</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contagem: {count?.nome || '...'}</h1>
        <Link to={`/relatorio/${id}`} className="badge">Ver relatório</Link>
      </div>

      <div className="card space-y-4">
        <div>
          <div className="text-sm mb-2">1) Envie a planilha (código | nome | saldo)</div>
          <FileUpload onParsed={onParsed} />
        </div>
        <div>
          <div className="text-sm mb-2">2) Insira os códigos encontrados no estoque</div>
          <ManualEntry onAdd={onAdd} />
        </div>
      </div>

      {/* Barra de cobertura com status detalhado */}
      <CoverageProgressBar
        planCodes={totals.planCodes}
        insertedCodes={totals.insertedCodes}
        planItems={totals.planItems}
        insertedItems={totals.insertedItems}
      />

      {/* Resumo de quantidades (mobile-first) - Cards compactos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* Cards de categoria (mantidos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card"><div className="text-xs text-zinc-500">Regulares</div><div className="text-2xl font-semibold">{stats.reg}</div></div>
        <div className="card"><div className="text-xs text-zinc-500">Excesso</div><div className="text-2xl font-semibold">{stats.exc}</div></div>
        <div className="card"><div className="text-xs text-zinc-500">Falta</div><div className="text-2xl font-semibold">{stats.fal}</div></div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Itens Inseridos</h3>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Mais recentes primeiro</div>
        </div>
        <ul className="max-h-80 overflow-auto text-sm divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-800">
          {entries.map((e, idx) => {
            const striped = idx % 2 === 0
            return (
              <li 
                key={e.id} 
                className={`py-3 px-4 flex items-center gap-3 transition-colors ${
                  striped 
                    ? 'bg-white dark:bg-zinc-900' 
                    : 'bg-zinc-50 dark:bg-zinc-800/50'
                } hover:bg-zinc-100 dark:hover:bg-zinc-700`}
              >
                {editingId === e.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input 
                      className="input text-sm flex-1" 
                      value={editCode} 
                      onChange={ev=>setEditCode(ev.target.value)}
                      autoFocus
                    />
                    <input 
                      className="input text-sm w-20" 
                      type="number"
                      min="1"
                      value={editQty} 
                      onChange={ev=>setEditQty(ev.target.value === '' ? 1 : Math.max(1, Number(ev.target.value) || 1))} 
                    />
                    <button className="badge bg-green-600 hover:bg-green-700 text-white text-xs" onClick={saveEdit}>✓</button>
                    <button className="badge bg-zinc-400 hover:bg-zinc-500 text-white text-xs" onClick={cancelEdit}>✕</button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-semibold text-zinc-900 dark:text-white">{e.codigo}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Qtd: <span className="font-medium">{e.qty || 1}</span> • {new Date(e.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button 
                        className="badge bg-blue-600 hover:bg-blue-700 text-white text-xs px-2" 
                        onClick={()=>startEdit(e)}
                        title="Editar este item"
                      >
                        Editar
                      </button>
                      <button 
                        className="badge bg-red-600 hover:bg-red-700 text-white text-xs px-2" 
                        onClick={()=>removeEntry(e.id)}
                        title="Remover este item"
                      >
                        Remover
                      </button>
                    </div>
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
        <button className="btn" onClick={handleFinalizarClick} disabled={isProcessing}>
          {isProcessing ? 'Processando…' : 'Finalizar contagem'}
        </button>
        <Link to="/" className="badge">Voltar</Link>
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
