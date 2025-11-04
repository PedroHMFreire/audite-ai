import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AdminRoute from '@/components/AdminRoute'
import { ToastProvider } from '@/components/Toast'
import { OnboardingOverlay } from '@/components/Onboarding'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import Counts from '@/pages/Counts'
import CountDetail from '@/pages/CountDetail'
import Report from '@/pages/Report'
import Categories from '@/pages/Categories'
import ScheduleConfig from '@/pages/ScheduleConfig'
import ScheduleCalendar from '@/pages/ScheduleCalendar'
import AdminDashboard from '@/pages/AdminDashboard'
import LandingPage from '@/pages/LandingPage'
import TrialSignup from '@/pages/TrialSignup'
import TrialWelcome from '@/pages/TrialWelcome'
import TrialDebug from '@/pages/TrialDebug'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PERMISSIONS } from '@/lib/permissions'

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
  const location = useLocation()
  
  // Check if current route is public (landing page routes)
  const isPublicRoute = ['/', '/trial-signup', '/trial-welcome', '/trial-debug'].includes(location.pathname)
  const isLandingPage = location.pathname === '/'
  
  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-50">
        {/* Only show Header for app routes, not landing page */}
        {!isPublicRoute && <Header />}
        
        <main className={isPublicRoute ? '' : 'max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6'}>
          <Routes>
            {/* Public Routes - Landing Page System */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/trial-signup" element={<TrialSignup />} />
            <Route path="/trial-welcome" element={<TrialWelcome />} />
            <Route path="/trial-debug" element={<TrialDebug />} />
            
            {/* Auth Route */}
            <Route path="/login" element={<Login />} />
            
            {/* App Routes - Authenticated System */}
            <Route path="/dashboard" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/contagens" element={<PrivateRoute><Counts /></PrivateRoute>} />
            <Route path="/contagens/:id" element={<PrivateRoute><CountDetail /></PrivateRoute>} />
            <Route path="/relatorio/:id" element={<PrivateRoute><Report /></PrivateRoute>} />
            <Route path="/categorias" element={<PrivateRoute><Categories /></PrivateRoute>} />
            <Route path="/cronograma" element={<PrivateRoute><ScheduleConfig /></PrivateRoute>} />
            <Route path="/calendario" element={<PrivateRoute><ScheduleCalendar /></PrivateRoute>} />
            
            {/* Admin Routes - Protected */}
            <Route path="/admin" element={
              <PrivateRoute>
                <AdminRoute requiredPermission={PERMISSIONS.VIEW_ADMIN_DASHBOARD}>
                  <AdminDashboard />
                </AdminRoute>
              </PrivateRoute>
            } />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        {/* Only show Footer for app routes, not landing page */}
        {!isPublicRoute && <Footer />}
      </div>
      
      {/* Onboarding overlay - sempre no topo */}
      <OnboardingOverlay />
    </ToastProvider>
  )
}
