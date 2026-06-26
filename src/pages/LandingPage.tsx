import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Check, Star, Menu, X, ChevronDown, ChevronUp,
  Package, Calendar, FileCheck, BarChart3, Users,
  Shield, Zap, AlertTriangle
} from 'lucide-react'
import Logo from '../components/Logo'

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
      'Suporte por email',
    ],
    highlighted: false,
    cta: 'Começar Teste Gratuito',
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
      'Suporte prioritário',
    ],
    highlighted: true,
    cta: 'Começar Teste Gratuito',
    badge: 'Mais Popular',
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
      'Gerente de conta dedicado',
    ],
    highlighted: false,
    cta: 'Começar Teste Gratuito',
  },
]

const steps = [
  {
    number: '01',
    icon: <Package className="w-6 h-6" />,
    title: 'Cadastre suas categorias',
    description:
      'Configure os grupos de produtos da sua loja em minutos. Do estoque de tênis às blusas — organizado do jeito que faz sentido pro seu negócio.',
  },
  {
    number: '02',
    icon: <Calendar className="w-6 h-6" />,
    title: 'Siga o cronograma automático',
    description:
      'O sistema programa suas contagens e avisa a equipe na hora certa. Chega de esquecer categorias. A rotina de controle roda sozinha.',
  },
  {
    number: '03',
    icon: <FileCheck className="w-6 h-6" />,
    title: 'Receba o relatório de divergências',
    description:
      'Ao final de cada contagem, você vê exatamente o que sobrou, o que faltou e onde está a diferença. Balanço que finalmente fecha.',
  },
]

const features = [
  {
    icon: <AlertTriangle className="w-7 h-7 text-orange-500" />,
    title: 'Nunca mais perca venda por falta de peça',
    description:
      'O sistema detecta quando um item está abaixo do mínimo e alerta antes que o cliente chegue e você não tenha para vender.',
  },
  {
    icon: <BarChart3 className="w-7 h-7 text-zinc-700" />,
    title: 'Balanço que finalmente fecha',
    description:
      'Relatórios automáticos mostram exatamente onde está cada diferença entre sistema e estoque físico. Chega de "sumiu" sem explicação.',
  },
  {
    icon: <Calendar className="w-7 h-7 text-orange-500" />,
    title: 'Cronograma que roda sem você lembrar',
    description:
      'Defina a frequência de contagem por categoria e o sistema avisa a equipe. Sem papel, sem planilha, sem esquecimento.',
  },
  {
    icon: <Users className="w-7 h-7 text-zinc-700" />,
    title: 'Rastreie quem contou o quê',
    description:
      'Cada contagem registra o responsável, o horário e os valores. Acabou a discussão de "eu não contei isso".',
  },
  {
    icon: <Zap className="w-7 h-7 text-orange-500" />,
    title: 'Equipe conta no celular, sem treinamento',
    description:
      'Interface tão simples que qualquer funcionário aprende em minutos. Conta na tela, sem digitar depois em planilha.',
  },
  {
    icon: <Shield className="w-7 h-7 text-zinc-700" />,
    title: 'Histórico de 12 meses para nunca mais discutir',
    description:
      'Toda contagem fica salva na nuvem. Divergência com fornecedor? Você tem a prova em segundos.',
  },
]

const stats = [
  {
    value: 'R$ 2.400',
    label: 'de divergências encontradas',
    sub: 'média nos primeiros 30 dias de uso',
  },
  {
    value: '5h',
    label: 'economizadas por semana',
    sub: 'em contagens manuais e retrabalho',
  },
  {
    value: '97%',
    label: 'de precisão nas contagens',
    sub: 'contra ~71% em processos manuais',
  },
]

const testimonials = [
  {
    name: 'Carla Mendes',
    role: 'Proprietária — Closet Boutique, SP',
    content:
      'No primeiro balanço com o AUDITE.AI encontrei R$ 1.800 de diferença que eu nem sabia que existia. Nunca mais faço contagem em planilha.',
    rating: 5,
    highlight: 'R$ 1.800 encontrados no 1º balanço',
  },
  {
    name: 'Roberto Lima',
    role: 'Gerente — Calçados Mania, MG',
    content:
      'Antes eu passava 2 dias tentando fechar o balanço e nunca fechava direito. Agora termino em 4 horas e sei exatamente onde está cada diferença.',
    rating: 5,
    highlight: '2 dias → 4 horas no fechamento mensal',
  },
  {
    name: 'Patrícia Souza',
    role: 'Sócia — Moda Teen, RS',
    content:
      'Minha equipe aprendeu em 10 minutos. O cronograma automático garantiu que nunca mais esquecemos uma categoria. Simples e perfeito.',
    rating: 5,
    highlight: '0 categorias esquecidas desde o 1º mês',
  },
]

const faqs = [
  {
    question: 'Preciso saber mexer com tecnologia?',
    answer:
      'Não. O AUDITE.AI foi feito para o lojista e para sua equipe. Qualquer pessoa aprende a usar em menos de 10 minutos. Se tiver dúvida, nossa equipe ajuda por WhatsApp.',
  },
  {
    question: 'Funciona para qualquer tipo de loja?',
    answer:
      'Sim. Moda, calçados, eletrônicos, pet shop, papelaria — qualquer negócio que tenha estoque físico para controlar. Já são mais de 500 lojas de 14 segmentos diferentes.',
  },
  {
    question: 'Consigo usar no celular durante a contagem?',
    answer:
      'Com certeza. O sistema foi projetado para ser usado no celular enquanto você conta as peças no chão de loja. Sem papel, sem planilha, sem erro de digitação depois.',
  },
  {
    question: 'E se meu balanço já estiver uma bagunça?',
    answer:
      'Melhor hora de começar. Você vai descobrir exatamente onde estão as divergências — a maioria dos nossos clientes encontra centenas de reais em diferença já no primeiro balanço.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer:
      'Sim, sem multa e sem burocracia. Cancele pelo próprio sistema com 1 clique. Mas honestamente — depois de ver o balanço fechando, ninguém quer cancelar.',
  },
]

function ProductMockup() {
  return (
    <div className="relative mx-auto px-10" style={{ maxWidth: 320 }}>
      <div
        className="relative bg-zinc-950 rounded-[2.5rem] p-2.5 shadow-2xl"
        style={{
          boxShadow:
            '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        <div className="bg-white rounded-[2rem] overflow-hidden">
          {/* Status bar */}
          <div className="bg-zinc-900 px-5 py-2 flex justify-between items-center">
            <span className="text-white text-xs font-medium">9:41</span>
            <div className="flex gap-1 items-center">
              <div className="flex gap-0.5">
                {[3, 4, 5, 4].map((h, i) => (
                  <div key={i} className="w-0.5 bg-white rounded-sm opacity-80" style={{ height: h * 2 }} />
                ))}
              </div>
              <div className="w-5 h-2.5 border border-white/60 rounded-sm ml-1 relative">
                <div className="absolute inset-0.5 right-1 bg-white/80 rounded-sm" />
              </div>
            </div>
          </div>

          {/* App header */}
          <div className="bg-zinc-900 px-4 pb-4 pt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-zinc-400 text-xs">Relatório de contagem</div>
                <div className="text-white font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Hoje · 14h32
                </div>
              </div>
              <span className="bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                ✓ Concluída
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-zinc-800 rounded-xl p-2 text-center">
                <div className="text-green-400 font-bold text-xl leading-none">142</div>
                <div className="text-zinc-400 text-xs mt-1">Regular</div>
              </div>
              <div
                className="rounded-xl p-2 text-center"
                style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}
              >
                <div className="text-orange-400 font-bold text-xl leading-none">3</div>
                <div className="text-orange-300 text-xs mt-1">Faltando</div>
              </div>
              <div className="bg-zinc-800 rounded-xl p-2 text-center">
                <div className="text-blue-400 font-bold text-xl leading-none">8</div>
                <div className="text-zinc-400 text-xs mt-1">Excesso</div>
              </div>
            </div>
          </div>

          {/* Alert */}
          <div className="mx-3 mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold leading-none">!</span>
              </div>
              <div>
                <div className="text-orange-700 text-xs font-semibold">Divergência detectada</div>
                <div className="text-orange-600 text-xs mt-0.5">
                  Camiseta P Branca: sistema 12, contagem 9
                </div>
              </div>
            </div>
          </div>

          {/* Items list */}
          <div className="mx-3 mt-3 pb-4">
            <div className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
              Itens contados
            </div>
            {[
              { name: 'Calça Jeans 40', count: 24, status: 'ok' },
              { name: 'Vestido Floral M', count: 11, status: 'ok' },
              { name: 'Camiseta P Branca', count: 9, status: 'alert', expected: 12 },
              { name: 'Blusa Listrada G', count: 7, status: 'ok' },
              { name: 'Short Jeans 36', count: 15, status: 'ok' },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-2.5 border-b border-zinc-100 last:border-0 ${
                  item.status === 'alert' ? 'bg-orange-50 -mx-1 px-1 rounded-lg' : ''
                }`}
              >
                <div>
                  <div
                    className={`text-xs font-medium ${
                      item.status === 'alert' ? 'text-orange-700' : 'text-zinc-700'
                    }`}
                  >
                    {item.name}
                  </div>
                  {item.status === 'alert' && (
                    <div className="text-xs text-orange-400">Esperado: {item.expected}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-bold ${
                      item.status === 'alert' ? 'text-orange-600' : 'text-zinc-500'
                    }`}
                  >
                    {item.count}
                  </span>
                  {item.status === 'ok' ? (
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 bg-orange-200 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-xs font-bold leading-none">!</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div
        className="absolute left-0 top-20 bg-white rounded-2xl shadow-xl px-3 py-2.5 border border-zinc-100"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
      >
        <div className="text-xs text-zinc-400 font-medium">Divergência</div>
        <div className="text-sm font-bold text-orange-600" style={{ fontFamily: "'Syne', sans-serif" }}>
          −3 unid.
        </div>
      </div>
      <div
        className="absolute right-0 bottom-24 bg-white rounded-2xl shadow-xl px-3 py-2.5 border border-zinc-100"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
      >
        <div className="text-xs text-zinc-400 font-medium">Economia</div>
        <div className="text-sm font-bold text-green-600" style={{ fontFamily: "'Syne', sans-serif" }}>
          R$ 2.4k
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const link = document.createElement('link')
    link.href =
      'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link)
    }
  }, [])

  const handleStartTrial = (planName: string) => {
    navigate(`/trial-signup?plan=${encodeURIComponent(planName)}`)
  }

  const syne: React.CSSProperties = { fontFamily: "'Syne', sans-serif" }
  const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

  return (
    <div className="min-h-screen bg-white" style={dmSans}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.25s; }
        .fade-up-3 { animation-delay: 0.4s; }
        .fade-up-4 { animation-delay: 0.55s; }
        .fade-up-5 { animation-delay: 0.7s; }
        .hero-dot-grid {
          background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .orange-glow {
          box-shadow: 0 0 40px rgba(249, 115, 22, 0.3);
        }
      `}</style>

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Logo size={32} />
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              {['#problema', '#como-funciona', '#recursos', '#precos', '#depoimentos'].map((href, i) => {
                const labels = ['O Problema', 'Como Funciona', 'Recursos', 'Preços', 'Depoimentos']
                return (
                  <a
                    key={href}
                    href={href}
                    className="text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                    style={dmSans}
                  >
                    {labels[i]}
                  </a>
                )
              })}
              <Link
                to="/login"
                className="bg-orange-500 text-white px-5 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold"
              >
                Entrar
              </Link>
            </nav>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <nav className="md:hidden border-t border-zinc-800 py-4 space-y-1">
              {['#problema', '#como-funciona', '#recursos', '#precos', '#depoimentos'].map((href, i) => {
                const labels = ['O Problema', 'Como Funciona', 'Recursos', 'Preços', 'Depoimentos']
                return (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-zinc-400 hover:text-white transition-colors py-2.5 px-2 rounded-lg hover:bg-zinc-800"
                  >
                    {labels[i]}
                  </a>
                )
              })}
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors text-center font-semibold mt-2"
              >
                Entrar
              </Link>
            </nav>
          )}
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-zinc-950 hero-dot-grid py-16 md:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Text side */}
            <div className="flex-1 text-center lg:text-left">
              <div className="fade-up fade-up-1 inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-1.5 mb-6">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-orange-400 text-sm font-medium" style={dmSans}>
                  +500 lojas controlando o estoque com AUDITE.AI
                </span>
              </div>

              <h1
                className="fade-up fade-up-2 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight"
                style={syne}
              >
                Seu balanço{' '}
                <span className="text-orange-500">nunca fecha?</span>
                <br />
                Sempre faltando peça{' '}
                <span className="text-orange-500">na hora de vender?</span>
              </h1>

              <p
                className="fade-up fade-up-3 text-lg text-zinc-400 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed"
                style={dmSans}
              >
                O AUDITE.AI organiza suas contagens, detecta divergências automaticamente e garante
                que seu estoque físico bata com a realidade — sem papel, sem planilha, sem dor de cabeça.
              </p>

              <div className="fade-up fade-up-4 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
                <button
                  onClick={() => handleStartTrial('Profissional')}
                  className="bg-orange-500 text-white px-8 py-4 rounded-xl text-base font-bold hover:bg-orange-600 transition-all orange-glow hover:scale-105 active:scale-100"
                  style={{ ...dmSans, transition: 'all 0.2s ease' }}
                >
                  Testar grátis por 7 dias →
                </button>
                <a
                  href="#como-funciona"
                  className="border border-zinc-700 text-zinc-300 px-8 py-4 rounded-xl text-base font-medium hover:bg-zinc-800 hover:border-zinc-600 transition-all text-center"
                  style={dmSans}
                >
                  Ver como funciona
                </a>
              </div>

              <div className="fade-up fade-up-5 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6 text-sm text-zinc-500">
                {['Sem cartão de crédito', 'Cancelamento gratuito', 'Suporte incluído'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mockup side */}
            <div className="fade-up fade-up-3 flex-shrink-0 w-full lg:w-auto">
              <ProductMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ─────────────────────────────────────── */}
      <section className="bg-white border-b border-zinc-100 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-orange-400 fill-current" />
                ))}
              </div>
              <span className="text-zinc-700 font-semibold text-sm">4.9 / 5</span>
              <span className="text-zinc-400 text-sm">em 200+ avaliações</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-zinc-200" />
            <div className="text-sm text-zinc-600">
              <span className="font-bold text-zinc-900">500+</span> lojas em{' '}
              <span className="font-bold text-zinc-900">14 estados</span> brasileiros
            </div>
            <div className="hidden sm:block w-px h-5 bg-zinc-200" />
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Dados seguros com criptografia de ponta</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── O PROBLEMA ───────────────────────────────────────────── */}
      <section id="problema" className="py-16 md:py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-extrabold text-zinc-900 mb-4"
              style={syne}
            >
              A realidade de quem não controla o estoque
            </h2>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
              Se você se identifica com a coluna da esquerda, o AUDITE.AI foi feito para você.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Sem sistema */}
            <div className="bg-white border-2 border-red-100 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-4 h-4 text-red-500" />
                </div>
                <h3 className="font-bold text-zinc-900 text-lg" style={syne}>
                  Sem controle de estoque
                </h3>
              </div>
              <ul className="space-y-4">
                {[
                  'Peça some do estoque e ninguém sabe explicar',
                  'Balanço nunca fecha — diferença misteriosa todo mês',
                  'Contagem manual em papel cheia de erro humano',
                  'Funcionário conta errado, sem como rastrear',
                  'Cliente pede, mas a peça "estava" no sistema',
                  'Reposição feita no chute, sem base real',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-zinc-600">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-red-500" />
                    </div>
                    <span className="text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Com sistema */}
            <div className="bg-zinc-900 border-2 border-orange-500/30 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-white text-lg" style={syne}>
                  Com AUDITE.AI
                </h3>
              </div>
              <ul className="space-y-4">
                {[
                  'Divergências detectadas automaticamente na contagem',
                  'Relatório mostra exatamente onde está cada diferença',
                  'Contagem no celular — sem papel, sem erro de digitação',
                  'Histórico rastreável: quem contou, quando e o quê',
                  'Alerta antes de ficar sem peça pra vender',
                  'Reposição baseada em dados reais do estoque',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-orange-400" />
                    </div>
                    <span className="text-sm text-zinc-300 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────────── */}
      <section id="como-funciona" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-extrabold text-zinc-900 mb-4"
              style={syne}
            >
              3 passos para nunca mais perder dinheiro
            </h2>
            <p className="text-lg text-zinc-500">Começa a funcionar no mesmo dia que você ativa.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-zinc-200 to-transparent -translate-y-1/2 z-0" />
                )}
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="text-5xl font-extrabold text-zinc-100 leading-none select-none"
                      style={syne}
                    >
                      {step.number}
                    </div>
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-3" style={syne}>
                    {step.title}
                  </h3>
                  <p className="text-zinc-500 leading-relaxed text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => handleStartTrial('Profissional')}
              className="bg-zinc-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
              style={dmSans}
            >
              Começar agora — 7 dias grátis →
            </button>
          </div>
        </div>
      </section>

      {/* ── RECURSOS ─────────────────────────────────────────────── */}
      <section id="recursos" className="py-16 md:py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-extrabold text-zinc-900 mb-4"
              style={syne}
            >
              Tudo que sua loja precisa para fechar o balanço
            </h2>
            <p className="text-lg text-zinc-500">
              Funcionalidades pensadas para o dia a dia do lojista real.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-2xl border border-zinc-100 hover:border-orange-200 hover:shadow-md transition-all group"
              >
                <div className="mb-4 group-hover:scale-110 transition-transform w-fit">
                  {feature.icon}
                </div>
                <h3 className="text-base font-bold text-zinc-900 mb-2" style={syne}>
                  {feature.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS / IMPACTO REAL ─────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-extrabold text-white mb-3"
              style={syne}
            >
              O impacto real nas lojas que usam
            </h2>
            <p className="text-orange-100 text-lg">
              Números reais de clientes reais — não promessa de marketing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="bg-white/10 border border-white/20 rounded-2xl p-6 md:p-8 text-center backdrop-blur-sm"
              >
                <div
                  className="text-4xl md:text-5xl font-extrabold text-white mb-2"
                  style={syne}
                >
                  {stat.value}
                </div>
                <div className="text-orange-100 font-semibold mb-1">{stat.label}</div>
                <div className="text-orange-200 text-sm">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ──────────────────────────────────────────── */}
      <section id="depoimentos" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-extrabold text-zinc-900 mb-4"
              style={syne}
            >
              O que os lojistas dizem depois que fechou
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6 md:p-7 flex flex-col">
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-orange-400 fill-current" />
                  ))}
                </div>

                {/* Highlight badge */}
                <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 mb-4 w-fit">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0" />
                  <span className="text-orange-700 text-xs font-semibold">{t.highlight}</span>
                </div>

                {/* Quote */}
                <blockquote className="text-zinc-600 text-sm leading-relaxed flex-1 mb-5 italic">
                  "{t.content}"
                </blockquote>

                {/* Author */}
                <div className="pt-4 border-t border-zinc-200">
                  <div className="font-bold text-zinc-900 text-sm" style={syne}>
                    {t.name}
                  </div>
                  <div className="text-zinc-400 text-xs mt-0.5">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-zinc-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-extrabold text-zinc-900 mb-4"
              style={syne}
            >
              Perguntas frequentes
            </h2>
            <p className="text-zinc-500">Tudo que você quer saber antes de começar.</p>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-semibold text-zinc-900 text-sm pr-4" style={syne}>
                    {faq.question}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 border-t border-zinc-100">
                    <p className="text-zinc-600 text-sm leading-relaxed pt-4">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PREÇOS ───────────────────────────────────────────────── */}
      <section id="precos" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-extrabold text-zinc-900 mb-4"
              style={syne}
            >
              Planos para todo tamanho de negócio
            </h2>
            <p className="text-lg text-zinc-500">
              Comece grátis por 7 dias. Sem cartão de crédito. Cancele quando quiser.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl border-2 p-6 md:p-8 flex flex-col ${
                  plan.highlighted
                    ? 'border-orange-500 bg-zinc-950 md:scale-105 shadow-2xl'
                    : 'border-zinc-200 bg-white'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3
                    className={`text-xl font-extrabold mb-1 ${plan.highlighted ? 'text-white' : 'text-zinc-900'}`}
                    style={syne}
                  >
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${plan.highlighted ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <span
                    className={`text-4xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-zinc-900'}`}
                    style={syne}
                  >
                    R$ {plan.price}
                  </span>
                  <span className={`text-sm ml-1 ${plan.highlighted ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    /{plan.period}
                  </span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          plan.highlighted ? 'bg-orange-500' : 'bg-orange-50'
                        }`}
                      >
                        <Check
                          className={`w-3 h-3 ${plan.highlighted ? 'text-white' : 'text-orange-500'}`}
                        />
                      </div>
                      <span
                        className={`text-sm ${plan.highlighted ? 'text-zinc-300' : 'text-zinc-600'}`}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleStartTrial(plan.name)}
                  className={`w-full py-3 rounded-xl font-bold transition-all text-sm ${
                    plan.highlighted
                      ? 'bg-orange-500 text-white hover:bg-orange-600 orange-glow'
                      : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                  }`}
                  style={dmSans}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-zinc-400 text-sm mt-10">
            Todos os planos incluem <strong className="text-zinc-600">7 dias de teste gratuito</strong> e suporte técnico
          </p>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Guarantee badge */}
          <div className="inline-flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-2xl px-5 py-3 mb-8">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
            <p className="text-green-300 text-sm font-medium text-left">
              <strong className="text-green-400 block">Garantia de resultado</strong>
              Faça 1 contagem. Se não encontrar divergência, devolvemos seu dinheiro.
            </p>
          </div>

          <h2
            className="text-3xl md:text-5xl font-extrabold text-white mb-5 leading-tight"
            style={syne}
          >
            Pronto para ver o balanço fechar de verdade?
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            Junte-se a mais de 500 lojistas que pararam de perder dinheiro com estoque desorganizado.
          </p>

          <button
            onClick={() => handleStartTrial('Profissional')}
            className="bg-orange-500 text-white px-10 py-5 rounded-xl text-lg font-bold hover:bg-orange-600 transition-all orange-glow hover:scale-105 active:scale-100"
            style={{ ...dmSans, transition: 'all 0.2s ease' }}
          >
            Começar Teste Gratuito Agora →
          </button>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-zinc-500 mt-6">
            {['7 dias grátis', 'Sem cartão de crédito', 'Cancele quando quiser'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-zinc-950 border-t border-zinc-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity w-fit">
                <Logo size={32} />
              </Link>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Controle de estoque inteligente para pequenas e médias lojas do Brasil.
              </p>
            </div>

            {[
              {
                title: 'Produto',
                links: ['#recursos', '#precos', '#como-funciona'],
                labels: ['Recursos', 'Preços', 'Como Funciona'],
              },
              {
                title: 'Suporte',
                links: ['#', '#', '#'],
                labels: ['Central de Ajuda', 'Contato', 'Status'],
              },
              {
                title: 'Empresa',
                links: ['#', '#', '#'],
                labels: ['Sobre', 'Blog', 'Privacidade'],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-bold text-zinc-300 mb-4 text-sm" style={syne}>
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((href, i) => (
                    <li key={i}>
                      <a
                        href={href}
                        className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors block py-0.5"
                      >
                        {col.labels[i]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-zinc-600 text-sm">© 2025 AUDITE.AI. Todos os direitos reservados.</p>
            <div className="flex items-center gap-2 text-zinc-600 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Todos os sistemas operacionais</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
