import { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  illustration?: ReactNode
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  illustration
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Ilustração (se fornecida) */}
      {illustration && (
        <div className="mb-8 h-48 w-48 text-zinc-300 dark:text-zinc-700">
          {illustration}
        </div>
      )}

      {/* Ícone (alternativo) */}
      {icon && !illustration && (
        <div className="mb-6 text-6xl">
          {icon}
        </div>
      )}

      {/* Título */}
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {title}
      </h3>

      {/* Descrição */}
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 max-w-md">
        {description}
      </p>

      {/* Botão de Ação */}
      {action && (
        <button
          onClick={action.onClick}
          className={`
            px-6 py-2.5 rounded-xl font-medium text-sm
            transition-all duration-200
            ${action.variant === 'secondary'
              ? 'bg-zinc-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              : 'bg-primary-500 text-white hover:bg-primary-600'
            }
          `}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
