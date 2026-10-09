import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { InputValidator } from '@/lib/security'
import AuthLayout, { FormError, authErrorMessage } from '@/components/AuthLayout'

/**
 * Destino do link de recuperação enviado por e-mail. O Supabase abre uma
 * sessão temporária a partir do link; com ela o usuário define a nova senha.
 */
export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let settled = false
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        settled = true
        setReady('ok')
      }
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true
        setReady('ok')
      }
    })
    // O link pode levar um instante para ser trocado por uma sessão.
    const timer = setTimeout(() => { if (!settled) setReady('invalid') }, 4000)
    return () => {
      clearTimeout(timer)
      sub.subscription.unsubscribe()
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const pw = InputValidator.password(password)
    if (!pw.valid) return setError(pw.errors[0])
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(authErrorMessage(error))
    navigate('/dashboard', { replace: true })
  }

  if (ready === 'invalid') {
    return (
      <AuthLayout
        title="Link inválido ou expirado"
        subtitle="Peça um novo link para criar sua senha."
        footer={<Link to="/login" className="link">Voltar para o login</Link>}
      >
        <Link to="/recuperar-senha" className="btn w-full">Pedir novo link</Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Nova senha" subtitle="Escolha uma senha para a sua conta.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="label">Nova senha</label>
          <input id="password" type="password" autoComplete="new-password" required minLength={8}
            className="input" value={password} onChange={(e) => setPassword(e.target.value)}
            disabled={ready !== 'ok'} />
          <p className="mt-1.5 text-xs text-zinc-500">Pelo menos 8 caracteres.</p>
        </div>
        <FormError>{error}</FormError>
        <button type="submit" className="btn w-full" disabled={loading || ready !== 'ok' || !password}>
          {loading ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </AuthLayout>
  )
}
