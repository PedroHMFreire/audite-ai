import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'

export default function Header() {
  const nav = useNavigate()
  const loc = useLocation()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session))
    return () => { sub.subscription.unsubscribe() }
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    nav('/login')
  }

  return (
    <header className="sticky top-0 z-50 bg-white/75 dark:bg-zinc-950/75 backdrop-blur border-b border-zinc-100 dark:border-zinc-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {authed && loc.pathname !== '/login' && (
            <button className="badge" onClick={logout}>Sair</button>
          )}
        </div>
      </div>
    </header>
  )
}
