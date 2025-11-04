import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useNavigate, Link } from 'react-router-dom'
import { InputValidator, rateLimiter, SecurityLogger } from '@/lib/security'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<{valid: boolean; errors: string[]}>({valid: false, errors: []})
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/dashboard')
      }
    }
    checkSession()
  }, [navigate])

  // Validação de senha em tempo real para signup
  useEffect(() => {
    if (mode === 'signup' && password) {
      setPasswordStrength(InputValidator.password(password))
    }
  }, [password, mode])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validação de email
      if (!InputValidator.email(email)) {
        throw new Error('Email inválido')
      }

      if (mode === 'login') {
        // Rate limiting para login
        if (!rateLimiter.checkLogin(email)) {
          throw new Error('Muitas tentativas de login. Tente novamente em 15 minutos.')
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password })
        
        if (error) {
          SecurityLogger.logAuthAttempt(email, false, error.message)
          throw error
        }

        SecurityLogger.logAuthAttempt(email, true)
        navigate('/dashboard')
        
      } else {
        // Rate limiting para signup
        if (!rateLimiter.checkSignup(email)) {
          throw new Error('Muitas tentativas de cadastro. Tente novamente em 1 hora.')
        }

        // Validação de senha forte para signup
        if (!passwordStrength.valid) {
          throw new Error('Senha não atende aos critérios de segurança')
        }

        const { error } = await supabase.auth.signUp({ email, password })
        
        if (error) {
          SecurityLogger.logAuthAttempt(email, false, error.message)
          throw error
        }

        SecurityLogger.logAuthAttempt(email, true)
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <Link to="/" className="font-medium text-blue-600 hover:text-blue-500">
              volte para a página inicial
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={submit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                required
              />
            </div>
            <div>
              <input
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Indicador de força da senha para signup */}
          {mode === 'signup' && password && (
            <div className="rounded-md bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Critérios de senha:</div>
              <ul className="text-xs space-y-1">
                {passwordStrength.errors.map((err, index) => (
                  <li key={index} className="flex items-center gap-2 text-red-600">
                    <span>✗</span> {err}
                  </li>
                ))}
                {passwordStrength.valid && (
                  <li className="flex items-center gap-2 text-green-600">
                    <span>✓</span> Senha atende todos os critérios
                  </li>
                )}
              </ul>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Processando...' : (mode === 'login' ? 'Entrar' : 'Criar conta')}
            </button>
          </div>

          <div className="text-center">
            {mode === 'login' ? (
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500"
                onClick={() => setMode('signup')}
              >
                Não tem conta? Cadastre-se
              </button>
            ) : (
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500"
                onClick={() => setMode('login')}
              >
                Já tem conta? Entrar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
