import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Header, { BottomNav } from '@/components/Header'
import AdminRoute from '@/components/AdminRoute'
import { ToastProvider } from '@/components/Toast'
import { useAuth } from '@/contexts'
import { PERMISSIONS } from '@/lib/permissions'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Terms from '@/pages/Terms'
import Privacy from '@/pages/Privacy'
import Home from '@/pages/Home'
import Counts from '@/pages/Counts'

// Telas pesadas (leitor de código, planilhas, PDF, gráficos) carregam sob demanda.
const CountDetail = lazy(() => import('@/pages/CountDetail'))
const Report = lazy(() => import('@/pages/Report'))
const Categories = lazy(() => import('@/pages/Categories'))
const ScheduleConfig = lazy(() => import('@/pages/ScheduleConfig'))
const ScheduleCalendar = lazy(() => import('@/pages/ScheduleCalendar'))
const Account = lazy(() => import('@/pages/Account'))
const Subscription = lazy(() => import('@/pages/Subscription'))
const Catalog = lazy(() => import('@/pages/Catalog'))
const Help = lazy(() => import('@/pages/Help'))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))

function Loading() {
  return (
    <div className="grid min-h-[40vh] place-items-center text-sm text-zinc-500" role="status" aria-live="polite">
      Carregando…
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

/** Moldura do aplicativo logado: cabeçalho, conteúdo e navegação inferior no celular. */
function AppLayout() {
  const { pathname } = useLocation()
  // Na tela de contagem o rodapé é a barra de bipar; a navegação sai do caminho.
  const focused = /^\/contagens\/[^/]+/.test(pathname)
  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className={`container-safe pt-6 sm:pt-8 ${focused ? 'pb-8' : 'pb-24 md:pb-12'}`}>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      {!focused && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Signup />} />
        <Route path="/recuperar-senha" element={<ForgotPassword />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/termos" element={<Terms />} />
        <Route path="/privacidade" element={<Privacy />} />

        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<Home />} />
          <Route path="/contagens" element={<Counts />} />
          <Route path="/contagens/:id" element={<CountDetail />} />
          <Route path="/relatorio/:id" element={<Report />} />
          <Route path="/calendario" element={<ScheduleCalendar />} />
          <Route path="/cronograma" element={<ScheduleConfig />} />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/conta" element={<Account />} />
          <Route path="/assinatura" element={<Subscription />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/ajuda" element={<Help />} />
          <Route
            path="/admin"
            element={
              <AdminRoute requiredPermission={PERMISSIONS.VIEW_ADMIN_DASHBOARD}>
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Route>

        {/* Endereços antigos */}
        <Route path="/trial-signup" element={<Navigate to="/cadastro" replace />} />
        <Route path="/trial-welcome" element={<Navigate to="/dashboard" replace />} />
        <Route path="/organizacao" element={<Navigate to="/catalogo" replace />} />
        <Route path="/notificacoes" element={<Navigate to="/conta" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}
