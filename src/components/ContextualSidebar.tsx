import { Zap, BarChart3, Grid, Calendar, Settings, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

type Props = {
  onTutorialClick?: () => void
}

export default function ContextualSidebar({ onTutorialClick }: Props) {
  const quickLinks = [
    { icon: <Grid className="h-5 w-5" />, label: 'Contagens', href: '/contagens', badge: null },
    { icon: <BarChart3 className="h-5 w-5" />, label: 'Cronograma', href: '/cronograma', badge: null },
    { icon: <Calendar className="h-5 w-5" />, label: 'Calendário', href: '/calendario', badge: null },
    { icon: <Settings className="h-5 w-5" />, label: 'Categorias', href: '/categorias', badge: null },
  ]

  const stats = [
    { label: 'Ativos esse mês', value: '12', icon: Zap },
    { label: 'Próxima tarefa', value: 'Hoje', icon: Calendar }
  ]

  return (
    <aside className="hidden lg:block w-72 fixed right-0 top-0 h-screen pt-24 pr-4 overflow-y-auto">
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="space-y-2">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <div key={idx} className="card p-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{stat.label}</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{stat.value}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Links */}
        <div className="card">
          <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wider">
            Atalhos Rápidos
          </div>
          <div className="space-y-1">
            {quickLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className="flex items-center justify-between p-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {link.icon}
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full font-medium">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Tutorial */}
        <button
          onClick={onTutorialClick}
          className="w-full p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Precisa de ajuda?</span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 text-left mt-1">
            Veja o tutorial passo a passo
          </p>
        </button>

        {/* Info card */}
        <div className="card p-3 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-800">
          <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 mb-2">
            💡 Dica do dia
          </p>
          <p className="text-xs text-primary-600 dark:text-primary-400">
            Use os templates de contagem para economizar tempo. Você pode reutilizar as últimas configurações.
          </p>
        </div>
      </div>
    </aside>
  )
}
