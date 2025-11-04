import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Mail, ArrowRight, Calendar, BarChart3, Users } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function TrialWelcome() {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState('')
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false)

  useEffect(() => {
    // Verifica se o usuário está logado
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || '')
        setIsEmailConfirmed(user.email_confirmed_at !== null)
      }
    }
    
    checkUser()

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserEmail(session.user.email || '')
        setIsEmailConfirmed(session.user.email_confirmed_at !== null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const steps = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Confirme seu email',
      description: 'Enviamos um link de confirmação para seu email',
      completed: isEmailConfirmed
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Configure suas categorias',
      description: 'Crie categorias para organizar seus produtos',
      completed: false
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Configure seu cronograma',
      description: 'Automatize suas contagens de estoque',
      completed: false
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Faça sua primeira contagem',
      description: 'Comece a usar o sistema na prática',
      completed: false
    }
  ]

  const handleGetStarted = () => {
    if (isEmailConfirmed) {
      navigate('/categorias')
    } else {
      // Redireciona para página de confirmação de email
      navigate('/confirm-email')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">AUDITE.AI</span>
          </div>
          
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-orange-600" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Bem-vindo ao seu teste gratuito!
          </h1>
          
          <p className="text-lg text-gray-600 mb-2">
            Sua conta foi criada com sucesso. Você tem <strong>7 dias</strong> para explorar todos os recursos.
          </p>
          
          {userEmail && (
            <p className="text-sm text-gray-500">
              Conta criada para: <strong>{userEmail}</strong>
            </p>
          )}
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
            O que você pode fazer durante o teste:
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-zinc-700" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Contagens Ilimitadas</h3>
              <p className="text-sm text-gray-600">
                Faça quantas contagens precisar para testar o sistema
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Cronograma Automático</h3>
              <p className="text-sm text-gray-600">
                Configure e teste o sistema de agendamento inteligente
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-zinc-700" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Suporte Completo</h3>
              <p className="text-sm text-gray-600">
                Nossa equipe está disponível para ajudar você
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Próximos passos para começar:
          </h2>
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  step.completed 
                    ? 'bg-orange-100 text-orange-600' 
                    : index === 0 && !isEmailConfirmed
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {step.completed ? <Check className="w-5 h-5" /> : step.icon}
                </div>
                
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${
                    step.completed ? 'text-green-900' : 'text-gray-900'
                  }`}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
                
                {step.completed && (
                  <Check className="w-5 h-5 text-green-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Email Confirmation Alert */}
        {!isEmailConfirmed && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-900 mb-1">
                  Confirme seu email para continuar
                </h3>
                <p className="text-sm text-orange-700 mb-3">
                  Enviamos um link de confirmação para <strong>{userEmail}</strong>. 
                  Clique no link para ativar sua conta e começar a usar o sistema.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={() => supabase.auth.resend({ type: 'signup', email: userEmail })}
                    className="text-sm text-yellow-700 hover:text-yellow-800 font-medium"
                  >
                    Reenviar email de confirmação
                  </button>
                  <span className="hidden sm:block text-yellow-600">•</span>
                  <Link 
                    to="/login" 
                    className="text-sm text-yellow-700 hover:text-yellow-800 font-medium"
                  >
                    Já confirmei, fazer login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="text-center space-y-4">
          <button
            onClick={handleGetStarted}
            disabled={!isEmailConfirmed}
            className="bg-orange-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isEmailConfirmed ? 'Começar Agora' : 'Confirme seu email primeiro'}
            {isEmailConfirmed && <ArrowRight className="w-5 h-5" />}
          </button>
          
          <div className="text-sm text-gray-500">
            <p>Precisa de ajuda? <a href="mailto:suporte@audite.ai" className="text-blue-600 hover:underline">Fale conosco</a></p>
          </div>
        </div>

        {/* Trial Info */}
        <div className="mt-12 bg-zinc-50 border border-zinc-200 rounded-lg p-6 text-center">
          <h3 className="font-semibold text-zinc-900 mb-2">Informações do seu teste</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-zinc-700 font-medium">Duração:</span>
              <div className="text-zinc-900">7 dias completos</div>
            </div>
            <div>
              <span className="text-zinc-700 font-medium">Plano:</span>
              <div className="text-zinc-900">Profissional</div>
            </div>
            <div>
              <span className="text-zinc-700 font-medium">Cobrança:</span>
              <div className="text-zinc-900">Apenas após o período</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}