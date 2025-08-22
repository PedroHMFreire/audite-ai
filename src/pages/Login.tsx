import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        location.href = '/'
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('Conta criada! Verifique seu e-mail se necessário e faça login.')
        setMode('login')
      }
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 card">
      <h1 className="text-xl font-semibold mb-4">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
        <input className="input" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} type="password" required />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button className="btn w-full" disabled={loading}>{loading ? '...' : (mode === 'login' ? 'Entrar' : 'Criar conta')}</button>
      </form>
      <div className="text-sm text-zinc-500 mt-3">
        {mode === 'login' ? (
          <button className="link" onClick={() => setMode('signup')}>Não tem conta? Cadastre-se</button>
        ) : (
          <button className="link" onClick={() => setMode('login')}>Já tem conta? Entrar</button>
        )}
      </div>
    </div>
  )
}
