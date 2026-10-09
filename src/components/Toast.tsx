import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

// Tipos
export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
  description?: string
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

// Context
const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = {
      id,
      duration: 4000, // 4 segundos padrão
      ...toast,
    }

    setToasts(prev => [...prev, newToast])

    // Auto-remove após duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// Hook
export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const DOT: Record<ToastType, string> = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-zinc-400',
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-xl bg-ink px-4 py-3 text-white shadow-lg animate-fade-in"
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[toast.type]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.message}</p>
        {toast.description && <p className="mt-0.5 break-words text-xs text-zinc-300">{toast.description}</p>}
      </div>
      <button
        type="button"
        aria-label="Fechar aviso"
        className="-mr-1 shrink-0 rounded p-1 text-zinc-400 hover:text-white"
        onClick={() => onRemove(toast.id)}
      >
        ✕
      </button>
    </div>
  )
}

// No topo: no celular o rodapé é ocupado pela navegação e pela barra de bipar.
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] mx-auto flex w-full max-w-sm flex-col gap-2 px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
    >
      {toasts.slice(-3).map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}
