import { Routes, Route, Navigate } from 'react-router-dom'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import Counts from '@/pages/Counts'
import CountDetail from '@/pages/CountDetail'
import Report from '@/pages/Report'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

function PrivateRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(!!data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-zinc-500 dark:text-zinc-400">Carregando…</div>
  return isAuthed ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-50">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/contagens" element={<PrivateRoute><Counts /></PrivateRoute>} />
          <Route path="/contagens/:id" element={<PrivateRoute><CountDetail /></PrivateRoute>} />
          <Route path="/relatorio/:id" element={<PrivateRoute><Report /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
