import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import FileUpload from '@/components/FileUpload'
import ManualEntry from '@/components/ManualEntry'
import {
  addManualEntry,
  computeAndSaveResults,
  getCountById,
  savePlanItems,
  listManualEntries,
  updateManualEntry,
  deleteManualEntry,
  getPlanItems
} from '@/lib/db'
import { supabase } from '@/lib/supabaseClient'

type PlanRow = { codigo: string; nome: string; saldo: number }
type Entry = { id: string; count_id: string; codigo: string; qty: number; created_at: string }

export default function CountDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [count, setCount] = useState<any>(null)
  const [plan, setPlan] = useState<PlanRow[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCode, setEditCode] = useState<string>('')
  const [editQty, setEditQty] = useState<number>(1)

  useEffect(() => {
    if (!id) return
    getCountById(id).then(setCount)
    refreshPlan()
    refreshEntries()
  }, [id])

  async function refreshPlan() {
    if (!id) return
    const rows = await getPlanItems(id)
    setPlan(rows)
  }

  async function refreshEntries() {
    if (!id) return
    const rows = await listManualEntries(id)
    setEntries(rows)
  }

  async function onParsed(items: PlanRow[]) {
    setPlan(items)
    if (!id) return
    // sobrescreve a planilha desta contagem
    await supabase.from('plan_items').delete().eq('count_id', id)
    await savePlanItems(id, items)
    alert('Planilha carregada com sucesso!')
    await refreshPlan()
  }

  async function onAdd(codigo: string, qty: number = 1) {
    if (!id) return
    await addManualEntry(id, codigo, qty)
    await refreshEntries()
  }

  function startEdit(e: Entry) {
    setEditingId(e.id)
    setEditCode(e.codigo)
    setEditQty(e.qty || 1)
  }

  async function saveEdit() {
    if (!editingId) return
    await updateManualEntry(editingId, { codigo: editCode.trim(), qty: Math.max(1, Number(editQty) || 1) })
    setEditingId(null)
    await refreshEntries()
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function removeEntry(idRow: string) {
    if (!confirm('Remover este item?')) return
    await deleteManualEntry(idRow)
    await refreshEntries()
  }

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

  async function finalizar() {
    if (!id) return
    setSaving(true)
    try {
      await computeAndSaveResults(id)
      nav(`/relatorio/${id}`)
    } finally {
      setSaving(false)
    }
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

      {/* NOVO: Resumo de quantidades (mobile-first) */}
      <div className="grid grid-cols-2 gap-3">
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
      <div className="grid grid-cols-3 gap-3">
        <div className="card"><div className="text-xs text-zinc-500">Regulares</div><div className="text-2xl font-semibold">{stats.reg}</div></div>
        <div className="card"><div className="text-xs text-zinc-500">Excesso</div><div className="text-2xl font-semibold">{stats.exc}</div></div>
        <div className="card"><div className="text-xs text-zinc-500">Falta</div><div className="text-2xl font-semibold">{stats.fal}</div></div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm">Itens inseridos</div>
          <div className="text-xs text-zinc-500">Mais recentes primeiro</div>
        </div>
        <ul className="max-h-80 overflow-auto text-sm divide-y divide-zinc-100 dark:divide-zinc-800">
          {entries.map((e) => (
            <li key={e.id} className="py-2 flex items-center gap-2">
              {editingId === e.id ? (
                <>
                  <input className="input" value={editCode} onChange={ev=>setEditCode(ev.target.value)} />
                  <input className="input w-24" inputMode="numeric" value={editQty} onChange={ev=>setEditQty(Math.max(1, Number(ev.target.value) || 1))} />
                  <button className="badge" onClick={saveEdit}>Salvar</button>
                  <button className="badge" onClick={cancelEdit}>Cancelar</button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="font-medium">{e.codigo}</div>
                    <div className="text-xs text-zinc-500">Qtd: {e.qty} • {new Date(e.created_at).toLocaleString()}</div>
                  </div>
                  <button className="badge" onClick={()=>startEdit(e)}>Editar</button>
                  <button className="badge" onClick={()=>removeEntry(e.id)}>Remover</button>
                </>
              )}
            </li>
          ))}
          {entries.length === 0 && <div className="text-zinc-500 p-2">Nenhuma inserção nesta contagem.</div>}
        </ul>
      </div>

      <div className="flex gap-3">
        <button className="btn" onClick={finalizar} disabled={saving}>{saving ? 'Processando…' : 'Finalizar contagem'}</button>
        <Link to="/" className="badge">Voltar</Link>
      </div>
    </div>
  )
}
