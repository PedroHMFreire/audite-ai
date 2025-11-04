import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabaseClient'
import { InputValidator, rateLimiter, SecurityLogger } from '@/lib/security'

interface TrialSignupProps {
  selectedPlan?: string
}

export default function TrialSignup({ selectedPlan: propSelectedPlan }: TrialSignupProps) {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  
  // Pegar o plano dos parâmetros de URL ou usar o prop como fallback
  const planFromUrl = searchParams.get('plan')
  const selectedPlan = planFromUrl || propSelectedPlan || 'Profissional'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    ownerName: '',
    phone: '',
    segment: 'roupas'
  })

  const segments = [
    { value: 'roupas', label: 'Roupas e Acessórios' },
    { value: 'calcados', label: 'Calçados' },
    { value: 'eletronicos', label: 'Eletrônicos' },
    { value: 'casa', label: 'Casa e Decoração' },
    { value: 'beleza', label: 'Beleza e Cosméticos' },
    { value: 'esportes', label: 'Esportes e Fitness' },
    { value: 'livraria', label: 'Livros e Papelaria' },
    { value: 'outros', label: 'Outros' }
  ]

  const planFeatures = {
    'Básico': [
      'Até 5 categorias',
      '10 contagens por mês',
      '1 usuário',
      'Relatórios básicos'
    ],
    'Profissional': [
      'Categorias ilimitadas',
      'Contagens ilimitadas',
      'Até 3 usuários',
      'Cronograma automático',
      'Relatórios avançados'
    ],
    'Premium': [
      'Tudo do Profissional',
      'Usuários ilimitados',
      'Múltiplas lojas',
      'API de integração',
      'Suporte 24/7'
    ]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações de segurança
    if (!InputValidator.email(formData.email)) {
      addToast({
        type: 'error',
        message: 'Email inválido'
      })
      return
    }

    if (!rateLimiter.checkSignup(formData.email)) {
      addToast({
        type: 'error',
        message: 'Muitas tentativas de cadastro. Tente novamente em 1 hora.'
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      addToast({
        type: 'error',
        message: 'As senhas não coincidem'
      })
      return
    }

    const passwordValidation = InputValidator.password(formData.password)
    if (!passwordValidation.valid) {
      addToast({
        type: 'error',
        message: 'Senha não atende aos critérios de segurança',
        description: passwordValidation.errors.join(', ')
      })
      return
    }

    // Sanitização de inputs
    const sanitizedData = {
      ...formData,
      storeName: InputValidator.sanitizeText(formData.storeName),
      ownerName: InputValidator.sanitizeText(formData.ownerName),
      phone: InputValidator.sanitizeText(formData.phone)
    }

    setLoading(true)
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedData.email,
        password: sanitizedData.password,
        options: {
          data: {
            store_name: sanitizedData.storeName,
            owner_name: sanitizedData.ownerName,
            phone: sanitizedData.phone,
            segment: sanitizedData.segment,
            plan: selectedPlan,
            trial_start: new Date().toISOString(),
            trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
            trial_active: true,
            subscription_status: 'trial'
          }
        }
      })

      if (authError) {
        SecurityLogger.logAuthAttempt(sanitizedData.email, false, authError.message)
        throw authError
      }

      if (authData.user) {
        SecurityLogger.logAuthAttempt(sanitizedData.email, true)
        
        addToast({
          type: 'success',
          message: 'Teste gratuito iniciado!',
          description: 'Verifique seu email para confirmar a conta'
        })

        // Redireciona para uma página de boas-vindas ou login
        navigate('/trial-welcome')
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error)
      addToast({
        type: 'error',
        message: 'Erro ao criar conta',
        description: error instanceof Error ? error.message : 'Tente novamente'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600">Voltar</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">AUDITE.AI</span>
            </div>
            <Link to="/login" className="text-gray-600 hover:text-gray-900">
              Já tem conta? Entrar
            </Link>
          </div>
        </div>
      </header>

      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Comece seu teste gratuito
            </h1>
            <p className="text-gray-600">
              7 dias grátis do plano <strong>{selectedPlan}</strong> • Sem cartão de crédito
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Formulário */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome do proprietário *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.ownerName}
                        onChange={e => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Seu nome completo"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome da loja *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.storeName}
                        onChange={e => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Boutique Elegance"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="seu@email.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Segmento da loja *
                    </label>
                    <select
                      required
                      value={formData.segment}
                      onChange={e => setFormData(prev => ({ ...prev, segment: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {segments.map(segment => (
                        <option key={segment.value} value={segment.value}>
                          {segment.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Senha *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar senha *
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Digite a senha novamente"
                      />
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-orange-900 mb-1">O que você ganha:</p>
                        <ul className="text-orange-700 space-y-1">
                          <li>• 7 dias de teste gratuito completo</li>
                          <li>• Acesso a todos os recursos do plano {selectedPlan}</li>
                          <li>• Suporte técnico incluído</li>
                          <li>• Cancele a qualquer momento</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-500 text-white py-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Criando conta...' : 'Iniciar Teste Gratuito'}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    Ao criar sua conta, você concorda com nossos{' '}
                    <a href="#" className="text-orange-600 hover:underline">Termos de Uso</a> e{' '}
                    <a href="#" className="text-orange-600 hover:underline">Política de Privacidade</a>
                  </p>
                </form>
              </div>
            </div>

            {/* Resumo do Plano */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
                <h3 className="font-bold text-gray-900 mb-4">Plano {selectedPlan}</h3>
                
                <div className="space-y-3 mb-6">
                  {planFeatures[selectedPlan as keyof typeof planFeatures]?.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      R$ 0
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      primeiros 7 dias
                    </div>
                    <div className="text-sm text-gray-600">
                      Depois R$ {selectedPlan === 'Básico' ? '29' : selectedPlan === 'Profissional' ? '59' : '99'}/mês
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <div className="text-sm text-zinc-700">
                    <strong>Garantia:</strong> Cancele antes do 7º dia e não será cobrado nada.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}