import { Link, NavLink, useLocation } from 'react-router-dom'
import { CalendarDays, ClipboardList, Home, UserRound } from 'lucide-react'
import Logo from './Logo'
import { describeAccess, useAccess } from '@/contexts'

const NAV = [
  { to: '/dashboard', label: 'Início', icon: Home, match: ['/dashboard'] },
  { to: '/contagens', label: 'Contagens', icon: ClipboardList, match: ['/contagens', '/relatorio'] },
  { to: '/cronograma', label: 'Cronograma', icon: CalendarDays, match: ['/cronograma', '/categorias'] },
  { to: '/conta', label: 'Conta', icon: UserRound, match: ['/conta', '/assinatura', '/catalogo', '/admin'] },
]

const TONE_CLASS = {
  neutral: 'border-zinc-200 bg-white text-zinc-700',
  ok: 'border-zinc-200 bg-white text-zinc-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  danger: 'border-red-100 bg-red-50 text-red-700',
} as const

function isActive(pathname: string, match: string[]) {
  return match.some((m) => pathname === m || pathname.startsWith(m + '/'))
}

export default function Header() {
  const { pathname } = useLocation()
  const { access } = useAccess()
  const status = describeAccess(access)
  // Só chama atenção para a assinatura quando há algo a fazer.
  const showStatus = status.label && access?.status !== 'active' && access?.status !== 'comp' && !access?.is_admin

  return (
    <header
      className="sticky top-0 z-40 border-b border-zinc-200 bg-paper/90 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container-safe flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" aria-label="Audite — início">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive(pathname, item.match)
                    ? 'bg-zinc-100 font-medium text-ink'
                    : 'text-zinc-500 hover:text-ink'
                }`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {showStatus && (
          <Link
            to="/assinatura"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-zinc-400 ${TONE_CLASS[status.tone]}`}
          >
            {status.label}
          </Link>
        )}
      </div>
    </header>
  )
}

/** Navegação inferior no celular: tudo ao alcance do polegar. */
export function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-paper/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {NAV.map((item) => {
          const active = isActive(pathname, item.match)
          const Icon = item.icon
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
                  active ? 'font-medium text-ink' : 'text-zinc-500'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.6} aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
