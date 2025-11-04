import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Star, Users, BarChart3, Calendar, Shield, Zap, Heart } from 'lucide-react'

const plans = [
  {
    name: 'Básico',
    price: 29,
    period: 'mês',
    description: 'Ideal para lojas pequenas iniciando',
    features: [
      'Até 5 categorias',
      '10 contagens por mês',
      '1 usuário',
      'Relatórios básicos',
      'Suporte por email'
    ],
    highlighted: false,
    cta: 'Começar Teste Gratuito'
  },
  {
    name: 'Profissional',
    price: 59,
    period: 'mês',
    description: 'Para lojas em crescimento',
    features: [
      'Categorias ilimitadas',
      'Contagens ilimitadas',
      'Até 3 usuários',
      'Cronograma automático',
      'Relatórios avançados',
      'Suporte prioritário'
    ],
    highlighted: true,
    cta: 'Começar Teste Gratuito',
    badge: 'Mais Popular'
  },
  {
    name: 'Premium',
    price: 99,
    period: 'mês',
    description: 'Para redes e lojas grandes',
    features: [
      'Tudo do Profissional',
      'Usuários ilimitados',
      'Múltiplas lojas',
      'API de integração',
      'Relatórios personalizados',
      'Suporte 24/7',
      'Gerente de conta dedicado'
    ],
    highlighted: false,
    cta: 'Começar Teste Gratuito'
  }
]

const testimonials = [
  {
    name: 'Maria Silva',
    role: 'Proprietária - Boutique Elegance',
    content: 'O AUDITE.AI revolucionou nosso controle de estoque. Economizamos 5 horas por semana!',
    rating: 5
  },
  {
    name: 'João Santos',
    role: 'Gerente - Calçados Premium',
    content: 'Finalmente conseguimos organizar nossas contagens. O cronograma automático é perfeito.',
    rating: 5
  },
  {
    name: 'Ana Costa',
    role: 'Sócia - Moda Jovem',
    content: 'Interface super fácil de usar. Minha equipe aprendeu em minutos!',
    rating: 5
  }
]

const features = [
  {
    icon: <BarChart3 className="w-8 h-8 text-zinc-700" />,
    title: 'Controle Total do Estoque',
    description: 'Monitore excesso, falta e regularidade com relatórios automáticos e precisos.'
  },
  {
    icon: <Calendar className="w-8 h-8 text-orange-500" />,
    title: 'Cronograma Inteligente',
    description: 'Sistema automático programa suas contagens garantindo que nada seja esquecido.'
  },
  {
    icon: <Users className="w-8 h-8 text-zinc-700" />,
    title: 'Equipe Colaborativa',
    description: 'Permita que sua equipe trabalhe junto, cada um com suas responsabilidades.'
  },
  {
    icon: <Zap className="w-8 h-8 text-orange-500" />,
    title: 'Rápido e Simples',
    description: 'Interface intuitiva que qualquer pessoa aprende a usar em minutos.'
  },
  {
    icon: <Shield className="w-8 h-8 text-zinc-700" />,
    title: 'Dados Seguros',
    description: 'Seus dados protegidos com criptografia e backup automático na nuvem.'
  },
  {
    icon: <Heart className="w-8 h-8 text-orange-500" />,
    title: 'Suporte Dedicado',
    description: 'Nossa equipe está sempre disponível para ajudar você a ter sucesso.'
  }
]

export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleStartTrial = (planName: string) => {
    setSelectedPlan(planName)
    // Navegar para a página de trial signup com o plano selecionado
    navigate(`/trial-signup?plan=${encodeURIComponent(planName)}`)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold text-zinc-900">AUDITE.AI</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#recursos" className="text-zinc-600 hover:text-zinc-900 transition-colors">Recursos</a>
              <a href="#precos" className="text-zinc-600 hover:text-zinc-900 transition-colors">Preços</a>
              <a href="#depoimentos" className="text-zinc-600 hover:text-zinc-900 transition-colors">Depoimentos</a>
              <Link 
                to="/login" 
                className="bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Entrar
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-zinc-50 to-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 mb-6">
              Controle de Estoque
              <span className="text-orange-500 block">Inteligente e Automático</span>
            </h1>
            <p className="text-xl text-zinc-600 mb-8 max-w-3xl mx-auto">
              Pare de perder dinheiro com estoque desorganizado. O AUDITE.AI automatiza suas contagens 
              e gera relatórios precisos para sua loja crescer com segurança.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button 
                onClick={() => handleStartTrial('Profissional')}
                className="bg-orange-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors shadow-lg"
              >
                🚀 Teste Grátis por 7 Dias
              </button>
              <a 
                href="#recursos" 
                className="border-2 border-zinc-300 text-zinc-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-zinc-50 transition-colors"
              >
                Ver Como Funciona
              </a>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-500" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-500" />
                <span>Cancelamento gratuito</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-500" />
                <span>Suporte incluído</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-zinc-500 mb-8">Confiado por mais de 500+ lojistas</p>
            <div className="flex items-center justify-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-orange-400 fill-current" />
              ))}
              <span className="ml-2 text-zinc-600 font-semibold">4.9/5</span>
            </div>
            <p className="text-zinc-500">Baseado em 200+ avaliações</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
              Tudo que sua loja precisa
            </h2>
            <p className="text-xl text-zinc-600">
              Funcionalidades pensadas especialmente para pequenos e médios lojistas
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-zinc-100">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-zinc-900 mb-3">{feature.title}</h3>
                <p className="text-zinc-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
              Planos para todo tamanho de negócio
            </h2>
            <p className="text-xl text-zinc-600">
              Comece grátis por 7 dias. Sem cartão de crédito. Cancele quando quiser.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`relative bg-white rounded-2xl shadow-lg border-2 p-8 ${
                  plan.highlighted ? 'border-orange-500 scale-105' : 'border-zinc-200'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      {plan.badge}
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">{plan.name}</h3>
                  <p className="text-zinc-600 mb-4">{plan.description}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-zinc-900">R$ {plan.price}</span>
                    <span className="text-zinc-600">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <span className="text-zinc-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleStartTrial(plan.name)}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-zinc-500">
              Todos os planos incluem <strong>7 dias de teste gratuito</strong> e suporte técnico
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
              O que nossos clientes dizem
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-orange-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-zinc-600 mb-4 italic">
                  "{testimonial.content}"
                </blockquote>
                <div>
                  <div className="font-semibold text-zinc-900">{testimonial.name}</div>
                  <div className="text-sm text-zinc-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-zinc-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto para revolucionar seu estoque?
          </h2>
          <p className="text-xl text-zinc-300 mb-8">
            Junte-se a centenas de lojistas que já economizam tempo e dinheiro com o AUDITE.AI
          </p>
          <button
            onClick={() => handleStartTrial('Profissional')}
            className="bg-orange-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors shadow-lg"
          >
            Começar Teste Gratuito Agora
          </button>
          <p className="text-zinc-300 mt-4 text-sm">
            7 dias grátis • Sem cartão de crédito • Suporte incluído
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-bold">AUDITE.AI</span>
              </div>
              <p className="text-zinc-400">
                Controle de estoque inteligente para pequenas e médias empresas.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><a href="#recursos" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#precos" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrações</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-zinc-800 mt-8 pt-8 text-center">
            <p className="text-zinc-400">
              © 2025 AUDITE.AI. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}