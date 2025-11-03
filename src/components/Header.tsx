import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'

export default function Header() {
  const nav = useNavigate()
  const loc = useLocation()
  const [authed, setAuthed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session))
    return () => { sub.subscription.unsubscribe() }
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    nav('/login')
    setMobileMenuOpen(false)
  }

  function handleMobileNavClick() {
    setMobileMenuOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/75 dark:bg-zinc-950/75 backdrop-blur border-b border-zinc-100 dark:border-zinc-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3" onClick={handleMobileNavClick}>
              <Logo />
            </Link>
            
            {/* Desktop Navigation - only show when authenticated and not on login */}
            {authed && loc.pathname !== '/login' && (
              <nav className="hidden sm:flex items-center gap-4">
                <Link 
                  to="/contagens" 
                  className={`text-sm transition-colors ${
                    loc.pathname.startsWith('/contagens') || loc.pathname.startsWith('/relatorio')
                      ? 'text-zinc-900 dark:text-zinc-100 font-medium' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Contagens
                </Link>
                <Link 
                  to="/categorias" 
                  className={`text-sm transition-colors ${
                    loc.pathname === '/categorias'
                      ? 'text-zinc-900 dark:text-zinc-100 font-medium' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Categorias
                </Link>
                <Link 
                  to="/cronograma" 
                  className={`text-sm transition-colors ${
                    loc.pathname === '/cronograma'
                      ? 'text-zinc-900 dark:text-zinc-100 font-medium' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Cronograma
                </Link>
                <Link 
                  to="/calendario" 
                  className={`text-sm transition-colors ${
                    loc.pathname === '/calendario'
                      ? 'text-zinc-900 dark:text-zinc-100 font-medium' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Calendário
                </Link>
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            {/* Mobile menu button */}
            {authed && loc.pathname !== '/login' && (
              <button
                className="sm:hidden p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menu"
              >
                <div className="w-5 h-5 flex flex-col justify-center items-center">
                  <span className={`block w-4 h-0.5 bg-zinc-600 dark:bg-zinc-400 transition-all duration-200 ${mobileMenuOpen ? 'rotate-45 translate-y-0.5' : ''}`} />
                  <span className={`block w-4 h-0.5 bg-zinc-600 dark:bg-zinc-400 mt-1 transition-all duration-200 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                  <span className={`block w-4 h-0.5 bg-zinc-600 dark:bg-zinc-400 mt-1 transition-all duration-200 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
                </div>
              </button>
            )}
            
            {/* Desktop logout */}
            {authed && loc.pathname !== '/login' && (
              <button className="hidden sm:block badge" onClick={logout}>Sair</button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {authed && loc.pathname !== '/login' && mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <nav className="absolute top-14 left-0 right-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-lg">
            <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
              <Link 
                to="/contagens" 
                onClick={handleMobileNavClick}
                className={`block p-3 rounded-lg transition-colors ${
                  loc.pathname.startsWith('/contagens') || loc.pathname.startsWith('/relatorio')
                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium' 
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                📊 Contagens
              </Link>
              <Link 
                to="/categorias" 
                onClick={handleMobileNavClick}
                className={`block p-3 rounded-lg transition-colors ${
                  loc.pathname === '/categorias'
                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium' 
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                🏷️ Categorias
              </Link>
              <Link 
                to="/cronograma" 
                onClick={handleMobileNavClick}
                className={`block p-3 rounded-lg transition-colors ${
                  loc.pathname === '/cronograma'
                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium' 
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                ⚙️ Cronograma
              </Link>
              <Link 
                to="/calendario" 
                onClick={handleMobileNavClick}
                className={`block p-3 rounded-lg transition-colors ${
                  loc.pathname === '/calendario'
                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium' 
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                📅 Calendário
              </Link>
              
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-3">
                <button 
                  onClick={logout}
                  className="w-full p-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                >
                  🚪 Sair
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
