import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAccess } from '@/contexts'

/**
 * Aviso exibido quando o teste acabou ou a assinatura está inativa.
 * O usuário continua vendo e exportando o que já tem; só não cria nem edita.
 */
export function AccessNotice({ className = '' }: { className?: string }) {
  const { access, loading } = useAccess()
  if (loading || !access || access.has_access) return null

  const trialOver = access.status === 'trialing'
  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between ${className}`} role="status">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-ink">
            {trialOver ? 'Seu período de teste terminou' : 'Sua assinatura está inativa'}
          </p>
          <p className="text-sm text-zinc-500">
            Suas contagens e relatórios continuam disponíveis para consulta. Assine para voltar a contar.
          </p>
        </div>
      </div>
      <Link to="/assinatura" className="btn shrink-0">Ver assinatura</Link>
    </div>
  )
}

/** true quando o usuário pode criar e editar contagens. */
export function useCanWrite(): boolean {
  const { access, loading } = useAccess()
  // Enquanto carrega, não bloqueia a interface; o banco é quem garante a regra.
  return loading || !access || access.has_access
}

/** Converte o erro do banco em mensagem para o usuário. */
export function accessErrorMessage(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String((err as any)?.message ?? '')
  if (/assinatura_inativa|row-level security/i.test(msg)) {
    return 'Seu acesso está inativo. Assine para continuar contando.'
  }
  return null
}
