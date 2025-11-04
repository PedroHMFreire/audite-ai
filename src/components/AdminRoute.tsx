import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface AdminRouteProps {
  children: React.ReactNode
  requiredPermission?: string
  fallback?: React.ReactNode
}

export default function AdminRoute({ children, requiredPermission, fallback }: AdminRouteProps) {
  const [loading, setLoading] = useState(true)
  const [canAccess, setCanAccess] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  async function checkAccess() {
    try {
      // Verifica se é admin de forma mais simples
      const { data, error } = await supabase.rpc('is_admin')
      
      if (error) {
        console.error('Erro ao verificar admin:', error)
        setCanAccess(false)
      } else {
        setCanAccess(data === true)
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error)
      setCanAccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      fallback || (
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">🚫 Acesso Negado</div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Você não tem permissão para acessar esta página.
          </p>
          <button 
            onClick={() => window.history.back()} 
            className="btn mt-4"
          >
            Voltar
          </button>
        </div>
      )
    )
  }

  return <>{children}</>
}