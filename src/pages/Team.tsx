import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { getCategories, type Category } from '@/lib/db'
import {
  createSeller, getCategorySellers, getSellers, removeSeller, setSellerCategories, updateSeller, type Seller,
} from '@/lib/team'
import ChipPicker from '@/components/ChipPicker'
import ConfirmDialog from '@/components/ConfirmDialog'
import ScheduleTabs from '@/components/ScheduleTabs'
import { useToast } from '@/components/Toast'

type Draft = { id: string | null; name: string; phone: string; categoryIds: string[] }

export default function Team() {
  const { addToast } = useToast()
  const [sellers, setSellers] = useState<Seller[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [bySeller, setBySeller] = useState<Map<string, string[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [toRemove, setToRemove] = useState<Seller | null>(null)

  const load = useCallback(async () => {
    try {
      const [team, cats, byCategory] = await Promise.all([getSellers(), getCategories(), getCategorySellers()])
      const map = new Map<string, string[]>()
      for (const [categoryId, sellerIds] of byCategory) {
        for (const sellerId of sellerIds) map.set(sellerId, [...(map.get(sellerId) || []), categoryId])
      }
      setSellers(team)
      setCategories(cats)
      setBySeller(map)
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível carregar a equipe', description: err instanceof Error ? err.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load() }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return
    const name = draft.name.trim()
    if (!name) return
    if (sellers.some((s) => s.id !== draft.id && s.name.toLowerCase() === name.toLowerCase())) {
      addToast({ type: 'warning', message: 'Já existe alguém com esse nome na equipe' })
      return
    }
    setSaving(true)
    try {
      const phone = draft.phone.trim() || null
      const id = draft.id || (await createSeller(name, phone)).id
      if (draft.id) await updateSeller(id, { name, phone })
      await setSellerCategories(id, draft.categoryIds)
      setDraft(null)
      await load()
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível salvar', description: err instanceof Error ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    const seller = toRemove
    setToRemove(null)
    if (!seller) return
    try {
      await removeSeller(seller.id)
      await load()
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível remover', description: err instanceof Error ? err.message : undefined })
    }
  }

  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const categoriesOf = (sellerId: string) =>
    (bySeller.get(sellerId) || []).map((id) => categoryName.get(id)).filter(Boolean).join(', ')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ScheduleTabs />
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Equipe</h1>
          <p className="page-subtitle">Quem conta o quê. Cada vendedor responde pelas categorias da sua seção.</p>
        </div>
        {!draft && (
          <button type="button" className="btn shrink-0" onClick={() => setDraft({ id: null, name: '', phone: '', categoryIds: [] })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Novo
          </button>
        )}
      </header>

      {draft && (
        <form onSubmit={save} className="card space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="seller-name" className="label">Nome do vendedor</label>
              <input id="seller-name" className="input" maxLength={80} autoFocus placeholder="Ex.: Ana"
                value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="seller-phone" className="label">WhatsApp <span className="font-normal text-zinc-500">(opcional)</span></label>
              <input id="seller-phone" className="input" type="tel" inputMode="tel" maxLength={30} placeholder="(11) 98765-4321"
                value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
          </div>
          {categories.length > 0 ? (
            <ChipPicker
              legend="Categorias sob responsabilidade"
              hint="Uma categoria pode ter mais de um responsável. As que ficarem sem ninguém são de toda a equipe."
              options={categories}
              value={draft.categoryIds}
              onChange={(categoryIds) => setDraft({ ...draft, categoryIds })}
            />
          ) : (
            <p className="text-sm text-zinc-500">
              <Link to="/categorias" className="link">Cadastre as categorias</Link> para dizer por quais este vendedor responde.
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn" disabled={saving || !draft.name.trim()}>{saving ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="btn btn-quiet" onClick={() => setDraft(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2" aria-busy="true"><div className="skeleton h-14" /><div className="skeleton h-14" /></div>
      ) : sellers.length === 0 && !draft ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center">
          <p className="font-medium">Ninguém na equipe ainda</p>
          <p className="mt-1 text-sm text-zinc-500">Cadastre os vendedores para direcionar cada contagem a quem cuida daquela seção.</p>
        </div>
      ) : sellers.length > 0 ? (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {sellers.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <p className="truncate text-sm text-zinc-500">{categoriesOf(s.id) || 'Sem categoria própria'}</p>
              </div>
              <button type="button" className="btn btn-quiet btn-sm"
                onClick={() => setDraft({ id: s.id, name: s.name, phone: s.phone || '', categoryIds: bySeller.get(s.id) || [] })}>Editar</button>
              <button type="button" className="btn btn-quiet btn-sm hover:bg-red-50 hover:text-red-600" onClick={() => setToRemove(s)}>Remover</button>
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={!!toRemove}
        title="Remover da equipe?"
        description={toRemove ? `${toRemove.name} deixa de responder pelas categorias e pelas contagens ainda não feitas. As já feitas continuam com o nome no histórico.` : ''}
        confirmLabel="Remover"
        destructive
        onConfirm={remove}
        onCancel={() => setToRemove(null)}
      />
    </div>
  )
}
