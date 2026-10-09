type Props = {
  isOpen: boolean
  planCodes: number
  planItems: number
  insertedCodes: number
  insertedItems: number
  notCounted: number
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmFinalizationModal({
  isOpen, planCodes, planItems, insertedItems, notCounted, loading, onConfirm, onCancel,
}: Props) {
  if (!isOpen) return null
  const n = (v: number) => v.toLocaleString('pt-BR')

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 animate-fade-in sm:items-center" onClick={onCancel} role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="finalizar-titulo"
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="finalizar-titulo" className="text-base font-semibold">Finalizar contagem?</h2>

        <dl className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 text-sm">
          <div className="flex justify-between px-3 py-2.5">
            <dt className="text-zinc-500">Produtos na planilha</dt>
            <dd className="tabular font-medium">{n(planCodes)}</dd>
          </div>
          <div className="flex justify-between px-3 py-2.5">
            <dt className="text-zinc-500">Peças contadas</dt>
            <dd className="tabular font-medium">{n(insertedItems)} <span className="font-normal text-zinc-500">de {n(planItems)}</span></dd>
          </div>
          <div className="flex justify-between px-3 py-2.5">
            <dt className="text-zinc-500">Produtos não contados</dt>
            <dd className={`tabular font-medium ${notCounted > 0 ? 'text-red-600' : ''}`}>{n(notCounted)}</dd>
          </div>
        </dl>

        <p className="mt-4 text-sm text-zinc-600">
          {notCounted > 0
            ? `${n(notCounted)} ${notCounted === 1 ? 'produto que não foi contado entrará' : 'produtos que não foram contados entrarão'} no relatório como falta. `
            : ''}
          Você pode reabrir a contagem depois, pelo relatório.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className="btn btn-secondary">Continuar contando</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="btn">
            {loading ? 'Finalizando…' : 'Finalizar'}
          </button>
        </div>
      </div>
    </div>
  )
}
