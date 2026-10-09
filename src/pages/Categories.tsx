import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { createCategory, deleteCategory, getCategories, updateCategory, type Category } from '@/lib/db'
import ConfirmDialog from '@/components/ConfirmDialog'
import ScheduleTabs from '@/components/ScheduleTabs'
import { useToast } from '@/components/Toast'

// Tons sóbrios, distinguíveis entre si no calendário.
const COLORS = ['#3D3B36', '#8A6A4F', '#B7791F', '#C2412D', '#A14A6B', '#6B5B95', '#3F6C8F', '#1F8A5F', '#75716A']

const SUGGESTIONS = ['Vestidos', 'Blusas', 'Calças', 'Saias', 'Casacos', 'Jeans', 'Calçados', 'Bolsas', 'Acessórios']

type Draft = { id: string | null; name: string; color: string }

export default function Categories() {
  const { addToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Category | null>(null)

  const load = useCallback(async () => {
    try {
      setCategories(await getCategories())
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível carregar as categorias', description: err instanceof Error ? err.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load() }, [load])

  const nextColor = () => COLORS[categories.length % COLORS.length]

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return
    const name = draft.name.trim()
    if (!name) return
    if (categories.some((c) => c.id !== draft.id && c.name.toLowerCase() === name.toLowerCase())) {
      addToast({ type: 'warning', message: 'Já existe uma categoria com esse nome' })
      return
    }
    setSaving(true)
    try {
      if (draft.id) await updateCategory(draft.id, { name, color: draft.color })
      else await createCategory({ name, priority: 3, color: draft.color, is_active: true })
      setDraft(null)
      await load()
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível salvar', description: err instanceof Error ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  async function addSuggestion(name: string) {
    try {
      await createCategory({ name, priority: 3, color: nextColor(), is_active: true })
      await load()
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível criar', description: err instanceof Error ? err.message : undefined })
    }
  }

  async function remove() {
    const c = toDelete
    setToDelete(null)
    if (!c) return
    try {
      await deleteCategory(c.id)
      await load()
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível excluir', description: err instanceof Error ? err.message : undefined })
    }
  }

  const remaining = SUGGESTIONS.filter((s) => !categories.some((c) => c.name.toLowerCase() === s.toLowerCase()))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ScheduleTabs />
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p className="page-subtitle">Os grupos de produtos da loja. O cronograma distribui as categorias pelas semanas.</p>
        </div>
        {!draft && (
          <button type="button" className="btn shrink-0" onClick={() => setDraft({ id: null, name: '', color: nextColor() })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Nova
          </button>
        )}
      </header>

      {draft && (
        <form onSubmit={save} className="card space-y-4">
          <div>
            <label htmlFor="cat-name" className="label">{draft.id ? 'Renomear categoria' : 'Nome da categoria'}</label>
            <input id="cat-name" className="input" maxLength={100} autoFocus placeholder="Ex.: Vestidos"
              value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <fieldset>
            <legend className="label">Cor no calendário</legend>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cor ${color}`}
                  aria-pressed={draft.color === color}
                  onClick={() => setDraft({ ...draft, color })}
                  className={`h-8 w-8 rounded-full transition-shadow ${draft.color === color ? 'ring-2 ring-ink ring-offset-2' : ''}`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button type="submit" className="btn" disabled={saving || !draft.name.trim()}>{saving ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="btn btn-quiet" onClick={() => setDraft(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2" aria-busy="true"><div className="skeleton h-14" /><div className="skeleton h-14" /></div>
      ) : categories.length === 0 && !draft ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center">
          <p className="font-medium">Nenhuma categoria ainda</p>
          <p className="mt-1 text-sm text-zinc-500">Toque nas sugestões abaixo para adicionar ou crie as suas.</p>
        </div>
      ) : categories.length > 0 ? (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setDraft({ id: c.id, name: c.name, color: c.color })}>Editar</button>
              <button type="button" className="btn btn-quiet btn-sm hover:bg-red-50 hover:text-red-600" onClick={() => setToDelete(c)}>Excluir</button>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && remaining.length > 0 && (
        <section aria-labelledby="sugestoes">
          <h2 id="sugestoes" className="eyebrow mb-3">Sugestões</h2>
          <div className="flex flex-wrap gap-2">
            {remaining.map((s) => (
              <button key={s} type="button" onClick={() => addSuggestion(s)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:border-zinc-400">
                + {s}
              </button>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir esta categoria?"
        description={toDelete ? `“${toDelete.name}” sai também das contagens programadas no cronograma.` : ''}
        confirmLabel="Excluir"
        destructive
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
