import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  clearCatalog, createOrganization, deleteCatalogItem, getCatalog, getCatalogCount, getMyOrg, uploadCatalog,
  type CatalogItem,
} from '@/lib/catalog'
import { readSpreadsheet, toCatalogRows } from '@/lib/spreadsheet'
import { useAuth } from '@/contexts'
import { useToast } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'

const PAGE = 50

/**
 * Catálogo de produtos da loja: código → nome. Serve para o Audite mostrar o
 * nome da peça ao bipar um código que não está na planilha da contagem.
 */
export default function Catalog() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(true)
  const [items, setItems] = useState<CatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<{ done: number; total: number } | 'reading' | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (q: string, off: number, replace: boolean) => {
    setLoading(true)
    try {
      const result = await getCatalog(q, PAGE, off)
      setItems((prev) => (replace ? result.items : [...prev, ...result.items]))
      if (off === 0 && !q) setTotal(await getCatalogCount())
      setHasMore(result.hasMore)
      setOffset(off + PAGE)
    } catch {
      setItems((prev) => (replace ? [] : prev))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    getMyOrg().then((ctx) => {
      if (ctx) {
        setOrgId(ctx.org.id)
        setCanEdit(ctx.role === 'admin')
      }
      load('', 0, true)
    })
  }, [load])

  function onSearch(q: string) {
    setSearch(q)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => load(q, 0, true), 300)
  }

  /** O catálogo fica ligado a uma organização; no plano único ela é criada sozinha. */
  async function ensureOrg(): Promise<string> {
    if (orgId) return orgId
    const name = (user?.user_metadata?.store_name as string | undefined)?.trim() || 'Minha loja'
    const id = await createOrganization(name)
    setOrgId(id)
    return id
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMessage(null)
    setProgress('reading')
    try {
      const rows = toCatalogRows(await readSpreadsheet(file))
      if (rows.length === 0) {
        setMessage({ ok: false, text: 'Não encontramos produtos no arquivo. As colunas devem ser: código e nome.' })
        return
      }
      await ensureOrg()
      const count = await uploadCatalog(rows, (done, total) => setProgress({ done, total }))
      setMessage({ ok: true, text: `${count.toLocaleString('pt-BR')} produtos adicionados ou atualizados.` })
      setSearch('')
      load('', 0, true)
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Não foi possível importar.' })
    } finally {
      setProgress(null)
    }
  }

  async function handleClear() {
    setConfirmClear(false)
    if (!orgId) return
    try {
      await clearCatalog(orgId)
      setItems([])
      setTotal(0)
      setHasMore(false)
      addToast({ type: 'info', message: 'Catálogo apagado', duration: 2500 })
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível apagar', description: err instanceof Error ? err.message : undefined })
    }
  }

  async function handleDelete(codigo: string) {
    try {
      await deleteCatalogItem(codigo)
      setItems((prev) => prev.filter((i) => i.codigo !== codigo))
      setTotal((prev) => Math.max(0, prev - 1))
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível remover', description: err instanceof Error ? err.message : undefined })
    }
  }

  const uploading = progress !== null

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <Link to="/conta" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Conta
        </Link>
        <h1 className="page-title mt-3">Catálogo de produtos</h1>
        <p className="page-subtitle">
          Opcional. Com o catálogo, o Audite mostra o nome da peça ao bipar um código que não está na planilha da
          contagem.
        </p>
      </header>

      {canEdit && (
        <section className="card" aria-labelledby="importar">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="importar" className="text-base font-semibold">Importar</h2>
            <p className="tabular text-sm text-zinc-500">{total.toLocaleString('pt-BR')} {total === 1 ? 'produto' : 'produtos'}</p>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Excel (.xlsx) ou CSV com duas colunas: código e nome. Códigos repetidos são atualizados.</p>
          <label className={`btn btn-secondary mt-4 cursor-pointer ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
            <input type="file" accept=".xlsx,.csv" onChange={handleFile} disabled={uploading} className="sr-only" />
            {progress === 'reading' ? 'Lendo arquivo…' : uploading ? 'Enviando…' : 'Escolher arquivo'}
          </label>
          {progress && progress !== 'reading' && (
            <div className="mt-4" role="status">
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
                <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
              </div>
              <p className="tabular mt-1.5 text-xs text-zinc-500">{progress.done.toLocaleString('pt-BR')} de {progress.total.toLocaleString('pt-BR')}</p>
            </div>
          )}
          {message && <p role="status" className={`mt-3 text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
        </section>
      )}

      {(total > 0 || search) && (
        <section className="space-y-3" aria-label="Produtos do catálogo">
          <input
            className="input"
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por código ou nome"
            autoCapitalize="off" autoCorrect="off" spellCheck={false}
          />
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">{loading ? 'Carregando…' : 'Nenhum produto encontrado.'}</p>
          ) : (
            <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.nome || <span className="font-normal italic text-zinc-500">Sem nome</span>}</p>
                    <p className="tabular truncate font-mono text-xs text-zinc-500">{item.codigo}</p>
                  </div>
                  {canEdit && (
                    <button type="button" className="shrink-0 text-xs text-zinc-500 hover:text-red-600" onClick={() => handleDelete(item.codigo)}>
                      Remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {hasMore && (
            <button type="button" className="btn btn-secondary w-full" onClick={() => load(search, offset, false)} disabled={loading}>
              {loading ? 'Carregando…' : 'Carregar mais'}
            </button>
          )}
          {canEdit && total > 0 && !search && (
            <button type="button" className="text-sm text-zinc-500 hover:text-red-600" onClick={() => setConfirmClear(true)}>
              Apagar todo o catálogo
            </button>
          )}
        </section>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Apagar todo o catálogo?"
        description={`Os ${total.toLocaleString('pt-BR')} produtos serão removidos. As contagens já feitas não mudam.`}
        confirmLabel="Apagar"
        destructive
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
