interface PasswordStrengthMeterProps {
  password: string
  strength?: { valid: boolean; errors: string[] }
}

export function PasswordStrengthMeter({ password, strength }: PasswordStrengthMeterProps) {
  if (!password) return null

  const getStrengthLevel = () => {
    if (!password) return 0
    if (password.length < 8) return 1
    if (!strength?.valid) return 2
    return 3
  }

  const level = getStrengthLevel()
  const labels = ['Muito fraca', 'Fraca', 'Média', 'Forte']
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']

  return (
    <div className="mt-3 space-y-2">
      {/* Barra de força */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Força da senha: <span className={colors[level]}>{labels[level]}</span>
        </div>
        <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors[level]} transition-all duration-300`}
            style={{ width: `${((level + 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Requisitos */}
      {level < 3 && strength?.errors && (
        <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
          {strength.errors.map((error, i) => (
            <li key={i}>❌ {error}</li>
          ))}
        </ul>
      )}

      {/* Sucesso */}
      {level === 3 && (
        <p className="text-xs text-green-600 dark:text-green-400">
          ✅ Senha segura!
        </p>
      )}
    </div>
  )
}
