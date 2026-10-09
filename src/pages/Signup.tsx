import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { InputValidator, rateLimiter } from '@/lib/security'
import { PLAN } from '@/lib/plan'
import AuthLayout, { FormError, authErrorMessage } from '@/components/AuthLayout'

export default function Signup() {
  const navigate = useNavigate()
  const [storeName, setStoreName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cleanEmail = email.trim().toLowerCase()

    if (!storeName.trim()) return setError('Informe o nome da loja.')
    if (!InputValidator.email(cleanEmail)) return setError('Informe um e-mail válido.')
    const pw = InputValidator.password(password)
    if (!pw.valid) return setError(pw.errors[0])
    if (!accepted) return setError('Para continuar, aceite os termos de uso e a política de privacidade.')
    if (!rateLimiter.checkSignup(cleanEmail)) return setError('Muitas tentativas de cadastro. Tente de novo mais tarde.')

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        // O período de teste é definido pelo servidor; daqui só vão dados cadastrais.
        data: {
          store_name: InputValidator.sanitizeText(storeName),
          owner_name: InputValidator.sanitizeText(ownerName),
        },
      },
    })
    setLoading(false)

    if (error) return setError(authErrorMessage(error))
    // Com confirmação de e-mail ligada, o Supabase não devolve erro para e-mail
    // já cadastrado: devolve um usuário sem identidades.
    if (data.user && data.user.identities?.length === 0) {
      return setError('Já existe uma conta com este e-mail. Entre ou recupere a senha.')
    }
    if (data.session) {
      navigate('/dashboard', { replace: true })
    } else {
      setConfirmSentTo(cleanEmail)
    }
  }

  if (confirmSentTo) {
    return (
      <AuthLayout title="Confirme seu e-mail">
        <div className="card flex items-start gap-3">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm text-zinc-600">
            Enviamos um link de confirmação para <strong className="text-ink">{confirmSentTo}</strong>.
            Abra o e-mail e toque no link para começar a usar o Audite.
          </p>
        </div>
        <p className="mt-6 text-sm text-zinc-500">
          Não chegou? Veja a caixa de spam ou <button type="button" className="link" onClick={() => setConfirmSentTo(null)}>tente de novo</button>.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Comece a contar"
      subtitle={`${PLAN.trialDays} dias grátis. Sem cartão de crédito.`}
      footer={<>Já tem conta? <Link to="/login" className="link">Entrar</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="store" className="label">Nome da loja</label>
          <input id="store" type="text" autoComplete="organization" maxLength={100} required
            className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="name" className="label">Seu nome <span className="font-normal text-zinc-500">(opcional)</span></label>
          <input id="name" type="text" autoComplete="name" maxLength={100}
            className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" type="email" autoComplete="email" inputMode="email" required
            className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className="label">Senha</label>
          <input id="password" type="password" autoComplete="new-password" required minLength={8}
            aria-describedby="password-hint"
            className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p id="password-hint" className="mt-1.5 text-xs text-zinc-500">Pelo menos 8 caracteres.</p>
        </div>
        <label className="flex items-start gap-3 text-sm text-zinc-600">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-brand"
            checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>
            Li e aceito os <Link to="/termos" target="_blank" className="link">termos de uso</Link> e
            a <Link to="/privacidade" target="_blank" className="link">política de privacidade</Link>.
          </span>
        </label>
        <FormError>{error}</FormError>
        <button type="submit" className="btn w-full" disabled={loading}>
          {loading ? 'Criando conta…' : 'Criar conta grátis'}
        </button>
      </form>
    </AuthLayout>
  )
}
