import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/cronograma', label: 'Calendário' },
  { to: '/categorias', label: 'Categorias' },
]

/** Abas da área de cronograma. */
export default function ScheduleTabs() {
  return (
    <nav aria-label="Cronograma" className="flex gap-1 border-b border-zinc-200">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors ${
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
