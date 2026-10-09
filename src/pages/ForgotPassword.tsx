import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { InputValidator, rateLimiter } from '@/lib/security'
import AuthLayout, { FormError, authErrorMessage } from '@/components/AuthLayout'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cleanEmail = email.trim().toLowerCase()
    if (!InputValidator.email(cleanEmail)) return setError('Informe um e-mail válido.')
    if (!rateLimiter.checkPasswordReset(cleanEmail)) return setError('Muitas tentativas. Aguarde um pouco e tente de novo.')

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setLoading(false)
    if (error && !/rate limit/i.test(error.message)) return setError(authErrorMessage(error))
    setSent(true)
  }

  if (sent) {
    return (
      <AuthLayout
        title="Verifique seu e-mail"
        subtitle="Se houver uma conta com esse endereço, você vai receber um link para criar uma nova senha. O link vale por 1 hora."
        footer={<Link to="/login" className="link">Voltar para o login</Link>}
      >
        <span />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      footer={<Link to="/login" className="link">Voltar para o login</Link>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" type="email" autoComplete="email" inputMode="email" required
            className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <FormError>{error}</FormError>
        <button type="submit" className="btn w-full" disabled={loading || !email}>
          {loading ? 'Enviando…' : 'Enviar link'}
        </button>
      </form>
    </AuthLayout>
  )
}
