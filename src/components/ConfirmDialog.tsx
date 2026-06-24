import { useEffect, useRef } from 'react'

/**
 * Diálogo de confirmação acessível — substitui o confirm() nativo,
 * que é feio e bloqueante no mobile. Botões grandes, fácil no polegar.
 */

type Props = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel, onConfirm])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-xl p-5 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <h4 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h4>
        {description && <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            onClick={onCancel}
            className="btn-ghost rounded-xl px-4 py-3 sm:py-2.5 text-sm font-medium min-h-12 sm:min-h-10"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`rounded-xl px-4 py-3 sm:py-2.5 text-sm font-medium text-white min-h-12 sm:min-h-10 active:scale-[.98] transition ${
              destructive ? 'bg-danger hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
