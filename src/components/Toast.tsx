import { useEffect, useState } from 'react'
import { createContext, useContext, useCallback, ReactNode } from 'react'

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

// Componente do Toast Individual
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Animação de entrada
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = useCallback(() => {
    setIsLeaving(true)
    setTimeout(() => onRemove(toast.id), 300) // Aguarda animação
  }, [toast.id, onRemove])

  // Ícones por tipo
  const getIcon = () => {
    switch (toast.type) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      case 'info': return 'ℹ️'
      default: return '📢'
    }
  }

  // Classes CSS por tipo
  const getTypeClasses = () => {
    switch (toast.type) {
      case 'success': 
        return 'bg-green-500 border-green-400 text-white'
      case 'warning': 
        return 'bg-yellow-500 border-yellow-400 text-white'
      case 'error': 
        return 'bg-red-500 border-red-400 text-white'
      case 'info': 
        return 'bg-blue-500 border-blue-400 text-white'
      default: 
        return 'bg-zinc-800 border-zinc-700 text-white'
    }
  }

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getTypeClasses()}
        rounded-lg border shadow-lg p-3 cursor-pointer
        hover:scale-105 active:scale-95
        max-w-sm w-full
      `}
      onClick={handleRemove}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-0.5">{getIcon()}</span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm">{toast.message}</div>
          {toast.description && (
            <div className="text-xs opacity-90 mt-1">{toast.description}</div>
          )}
        </div>
        <button 
          className="text-xs opacity-60 hover:opacity-100 ml-2 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            handleRemove()
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// Container dos Toasts
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto w-full max-w-sm px-4">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}