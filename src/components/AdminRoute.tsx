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
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')
      if (adminError || isAdmin !== true) {
        if (adminError) console.error('Erro ao verificar admin:', adminError)
        setCanAccess(false)
        return
      }

      if (!requiredPermission) {
        setCanAccess(true)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) {
        if (authError) console.error('Erro ao obter usuario autenticado:', authError)
        setCanAccess(false)
        return
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('permissions')
        .eq('user_id', authData.user.id)
        .single()

      if (roleError) {
        console.error('Erro ao verificar permissao requerida:', roleError)
        setCanAccess(false)
        return
      }

      const permissions = roleData?.permissions || []
      setCanAccess(Array.isArray(permissions) && permissions.includes(requiredPermission))
    } catch (error) {
      console.error('Erro ao verificar permissoes:', error)
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
          <p>Verificando permissoes...</p>
        </div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      fallback || (
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">Acesso negado</div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Voce nao tem permissao para acessar esta pagina.
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
