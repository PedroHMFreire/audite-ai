import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAccess } from '@/contexts'

/** Só administradores. A regra de verdade está no banco; isto apenas evita mostrar a tela. */
export default function AdminRoute({ children }: { children: ReactNode }) {
  const { access, loading } = useAccess()
  if (loading) return <div className="grid min-h-[40vh] place-items-center text-sm text-zinc-500" role="status">Carregando…</div>
  if (!access?.is_admin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
