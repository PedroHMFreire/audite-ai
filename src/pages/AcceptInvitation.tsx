import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { acceptInvitation, getInvitationByToken } from '@/lib/catalog'

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>()
  const nav = useNavigate()

  const [session, setSession] = useState<boolean | 'loading'>('loading')
  const [orgName, setOrgName] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session)
    })
  }, [])

  useEffect(() => {
    if (!token) return
    getInvitationByToken(token).then(inv => {
      if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) {
        setErrorMsg('Este convite é inválido ou já expirou.')
        setStatus('error')
      } else {
        setOrgName(inv.org_name || 'organização')
      }
    })
  }, [token])

  async function handleAccept() {
    if (!token) return
    setStatus('loading')
    try {
      await acceptInvitation(token)
      setStatus('done')
      setTimeout(() => nav('/dashboard'), 2000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao aceitar convite')
      setStatus('error')
    }
  }

  function handleLogin() {
    nav(`/login?redirect=/convite/${token}`)
  }

  if (session === 'loading') {
    return <div className="py-20 text-center text-sm text-zinc-500">Carregando...</div>
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center space-y-5">
        <div>
          <div className="text-3xl mb-3">🏢</div>
          <h1 className="text-lg font-semibold">Convite para organização</h1>
          {orgName && <p className="text-sm text-zinc-500 mt-1">Você foi convidado para entrar em <strong>{orgName}</strong></p>}
        </div>

        {status === 'error' && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl p-3">
            {errorMsg}
          </div>
        )}

        {status === 'done' && (
          <div className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3">
            Convite aceito! Redirecionando...
          </div>
        )}

        {status !== 'error' && status !== 'done' && (
          session ? (
            <button
              className="btn w-full"
              onClick={handleAccept}
              disabled={status === 'loading' || !orgName}
            >
              {status === 'loading' ? 'Entrando...' : 'Aceitar e entrar na organização'}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">Faça login para aceitar o convite.</p>
              <button className="btn w-full" onClick={handleLogin}>
                Fazer login
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
