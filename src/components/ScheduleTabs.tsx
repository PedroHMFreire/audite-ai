import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/cronograma', label: 'Calendário' },
  { to: '/acompanhamento', label: 'Acompanhamento' },
  { to: '/categorias', label: 'Categorias' },
  { to: '/equipe', label: 'Equipe' },
]

/** Abas da área de cronograma. */
export default function ScheduleTabs() {
  const nav = useRef<HTMLElement>(null)
  // No celular as abas rolam de lado; a atual precisa estar à vista.
  useEffect(() => {
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [])
  return (
    <nav ref={nav} aria-label="Cronograma" className="flex gap-1 overflow-x-auto border-b border-zinc-200">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${
              isActive ? 'border-ink font-medium text-ink' : 'border-transparent text-zinc-500 hover:text-ink'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
