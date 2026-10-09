import { Monitor, Moon, Sun } from 'lucide-react'
import { setThemePref, useTheme, type ThemePref } from '@/lib/theme'

/** Botão de um toque: alterna entre claro e escuro. */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { dark } = useTheme()
  const Icon = dark ? Sun : Moon
  return (
    <button
      type="button"
      onClick={() => setThemePref(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-ink ${className}`}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  )
}

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Automático', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
]

/** Escolha completa, para a tela de Conta. */
export function ThemeSetting() {
  const { pref } = useTheme()
  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = pref === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setThemePref(value)}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 text-sm transition-colors ${
              active ? 'bg-white font-medium text-ink shadow-sm' : 'text-zinc-600 hover:text-ink'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
