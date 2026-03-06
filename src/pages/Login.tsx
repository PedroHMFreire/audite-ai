import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useNavigate, Link } from 'react-router-dom'
import { InputValidator, rateLimiter, SecurityLogger } from '@/lib/security'
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
import { FormField } from '@/components/FormField'

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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-zinc-900 dark:text-white">
            {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Ou{' '}
            <Link to="/" className="font-medium text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500 transition-colors">
              volte para a página inicial
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={submit}>
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={(value) => setEmail(value.toString())}
            placeholder="seu@email.com"
            error={error && error.includes('email') ? 'Email inválido' : undefined}
            hint="Usaremos seu email para acessar a conta"
          />

          <FormField
            label="Senha"
            type="password"
            value={password}
            onChange={(value) => setPassword(value.toString())}
            placeholder="Sua senha"
            error={error && !error.includes('email') ? error : undefined}
            hint={mode === 'signup' 
              ? 'Mínimo 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial'
              : undefined
            }
          />

          {/* Password Strength Feedback */}
          {mode === 'signup' && (
            <PasswordStrengthMeter 
              password={password}
              strength={passwordStrength}
            />
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Processando...' : (mode === 'login' ? 'Entrar' : 'Criar conta')}
            </button>
          </div>

          <div className="text-center">
            {mode === 'login' ? (
              <button
                type="button"
                className="text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500 transition-colors"
                onClick={() => setMode('signup')}
              >
                Não tem conta? Cadastre-se
              </button>
            ) : (
              <button
                type="button"
                className="text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500 transition-colors"
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
