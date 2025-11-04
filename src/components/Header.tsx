import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'
import { getUserProfile, getTrialStatusMessage, UserProfile } from '@/lib/trial'
import { useUserPermissions, PERMISSIONS } from '@/lib/permissions'

export default function Header() {
  const nav = useNavigate()
  const loc = useLocation()
  const [authed, setAuthed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
      if (data.session) {
        loadUserProfile()
        checkAdminStatus()
      }
    })
    
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session)
      if (session) {
        loadUserProfile()
        checkAdminStatus()
      } else {
        setUserProfile(null)
        setIsAdmin(false)
      }
    })
    
    return () => { sub.subscription.unsubscribe() }
  }, [])

  async function loadUserProfile() {
    const profile = await getUserProfile()
    setUserProfile(profile)
  }

  async function checkAdminStatus() {
    try {
      const { data } = await supabase.rpc('is_admin')
      setIsAdmin(data === true)
    } catch (error) {
      console.error('Erro ao verificar admin:', error)
      setIsAdmin(false)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    nav('/login')
    setMobileMenuOpen(false)
  }

  function handleMobileNavClick() {
    setMobileMenuOpen(false)
  }

  const trialStatus = getTrialStatusMessage(userProfile)

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
              <nav className="navigation-menu hidden sm:flex items-center gap-4">
                <Link 
                  to="/contagens" 
                  className={`nav-counts text-sm transition-colors ${
                    loc.pathname.startsWith('/contagens') || loc.pathname.startsWith('/relatorio')
                      ? 'text-zinc-900 dark:text-zinc-100 font-medium' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Contagens
                </Link>
                <Link 
                  to="/categorias" 
                  className={`nav-categories text-sm transition-colors ${
                    loc.pathname === '/categorias'
                      ? 'text-zinc-900 dark:text-zinc-100 font-medium' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Categorias
                </Link>
                <Link 
                  to="/cronograma" 
                  className={`nav-schedule text-sm transition-colors ${
                    loc.pathname === '/cronograma'
                      ? 'text-zinc-900 dark:text-zinc-100 font-medium' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Cronograma
                </Link>
                
                {/* Admin Dashboard Link - Only for admins */}
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className={`text-sm transition-colors flex items-center gap-1 ${
                      loc.pathname === '/admin'
                        ? 'text-zinc-900 dark:text-zinc-100 font-medium' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Settings className="h-3 w-3" />
                    Admin
                  </Link>
                )}
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
            
            {/* Trial Status & Desktop logout */}
            {authed && loc.pathname !== '/login' && (
              <div className="hidden sm:flex items-center gap-3">
                {trialStatus.type === 'active' && (
                  <span className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md border border-zinc-200 dark:border-zinc-700">
                    {trialStatus.message}
                  </span>
                )}
                {trialStatus.type === 'expired' && (
                  <span className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md border border-zinc-200 dark:border-zinc-700">
                    {trialStatus.message}
                  </span>
                )}
                <button className="badge" onClick={logout}>Sair</button>
              </div>
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
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium' 
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
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium' 
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
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium' 
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                ⚙️ Cronograma
              </Link>
              
              {/* Admin Dashboard Link - Mobile */}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  onClick={handleMobileNavClick}
                  className={`block p-3 rounded-lg transition-colors ${
                    loc.pathname === '/admin'
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium' 
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  ⚙️ Dashboard Admin
                </Link>
              )}
              
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-3 space-y-3">
                {/* Trial Status in Mobile */}
                {(trialStatus.type === 'active' || trialStatus.type === 'expired') && (
                  <div className={`p-3 rounded-lg text-sm text-center ${
                    trialStatus.type === 'active' || trialStatus.type === 'expired'
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                  }`}>
                    {trialStatus.message}
                  </div>
                )}
                
                <button 
                  onClick={logout}
                  className="w-full p-3 text-left text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
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
