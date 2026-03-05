import { AlertCircle, Check, Loader2 } from 'lucide-react'

interface FormFieldProps {
  label: string
  value: string | number
  onChange: (value: string | number) => void
  type?: 'text' | 'email' | 'password' | 'number' | 'tel'
  placeholder?: string
  error?: string
  success?: boolean
  validating?: boolean
  hint?: string
  disabled?: boolean
  autoComplete?: string
}

export function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  success,
  validating,
  hint,
  disabled,
  autoComplete
}: FormFieldProps) {
  const handleChange = (newValue: string | number) => {
    onChange(newValue)
  }

  const hasError = !!error
  const showSuccess = success && !hasError && !validating

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
        {label}
      </label>

      {/* Input Container */}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`
            w-full px-4 py-2.5 rounded-xl border
            text-slate-900 dark:text-slate-50
            placeholder:text-zinc-400 dark:placeholder:text-zinc-600
            focus:outline-none focus:ring-2
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasError
              ? 'border-danger bg-red-50 dark:bg-red-900/10 focus:ring-red-200 dark:focus:ring-red-900/50'
              : showSuccess
              ? 'border-success bg-green-50 dark:bg-green-900/10 focus:ring-green-200 dark:focus:ring-green-900/50'
              : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-primary-500 dark:focus:ring-primary-400'
            }
          `}
        />

        {/* Status Icons */}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {validating && (
            <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
          )}
          {!validating && showSuccess && (
            <Check className="w-5 h-5 text-success" />
          )}
          {!validating && hasError && (
            <AlertCircle className="w-5 h-5 text-danger" />
          )}
        </div>
      </div>

      {/* Error Message */}
      {hasError && (
        <p className="text-sm text-danger flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Hint / Help Text */}
      {!hasError && hint && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      )}
    </div>
  )
}
