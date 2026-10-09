import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { rateLimiter } from '@/lib/security'
import AuthLayout, { FormError, authErrorMessage } from '@/components/AuthLayout'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(from, { replace: true })
    })
  }, [navigate, from])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cleanEmail = email.trim().toLowerCase()
    if (!rateLimiter.checkLogin(cleanEmail)) {
      setError('Muitas tentativas. Aguarde 15 minutos e tente de novo.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    setLoading(false)
    if (error) {
      setError(authErrorMessage(error))
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acesse suas contagens."
      footer={<>Ainda não tem conta? <Link to="/cadastro" className="link">Teste grátis</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" type="email" autoComplete="email" inputMode="email" required
            className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="label">Senha</label>
            <Link to="/recuperar-senha" className="text-xs text-zinc-500 hover:text-ink">Esqueci minha senha</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" required
            className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <FormError>{error}</FormError>
        <button type="submit" className="btn w-full" disabled={loading || !email || !password}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </AuthLayout>
  )
}
