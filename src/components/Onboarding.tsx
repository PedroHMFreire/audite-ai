import { useState, useEffect } from 'react'
import { X, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAnalytics } from '@/lib/analytics'

interface OnboardingStep {
  id: string
  title: string
  description: string
  target: string // CSS selector do elemento
  position: 'top' | 'bottom' | 'left' | 'right'
  action?: {
    type: 'click' | 'input' | 'upload' | 'navigate'
    text: string
    handler?: () => void
  }
  validation?: () => boolean
  isOptional?: boolean
}

interface OnboardingState {
  isActive: boolean
  currentStep: number
  completedSteps: string[]
  skippedSteps: string[]
}

// Definição dos passos do onboarding
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Audite AI! 🎉',
    description: 'Vamos fazer um tour completo para você dominar a plataforma. Levará apenas 5 minutos e você aprenderá como fazer uma auditoria completa!',
    target: 'body',
    position: 'bottom'
  },
  {
    id: 'dashboard-overview',
    title: 'Seu Dashboard de Controle',
    description: 'Aqui você vê o resumo das suas auditorias: produtos regulares, em excesso e em falta. Este é seu centro de comando!',
    target: '.dashboard-cards',
    position: 'bottom'
  },
  {
    id: 'navigation-menu',
    title: 'Menu de Navegação',
    description: 'Use este menu para navegar entre Contagens, Categorias, Cronograma e Calendário. Cada seção tem uma função específica.',
    target: '.navigation-menu',
    position: 'right'
  },
  {
    id: 'create-first-count',
    title: 'PASSO 1: Criar Nova Contagem',
    description: 'Toda auditoria começa aqui! Clique em "Nova Contagem" para iniciar uma auditoria de estoque. Dê um nome descritivo como "Auditoria Novembro 2025".',
    target: '.btn-new-count',
    position: 'bottom',
    action: {
      type: 'click',
      text: 'Clique em "Nova Contagem" para começar'
    }
  },
  {
    id: 'upload-explanation',
    title: 'PASSO 2: Preparar sua Planilha',
    description: 'Sua planilha deve ter 3 colunas obrigatórias: CÓDIGO (identificação do produto), NOME (descrição) e SALDO (quantidade em estoque). Formato: Excel (.xlsx) ou CSV.',
    target: '.file-upload-area',
    position: 'top'
  },
  {
    id: 'upload-file',
    title: 'PASSO 3: Fazer Upload da Planilha',
    description: 'Arraste sua planilha aqui ou clique para selecionar. O sistema validará automaticamente se está no formato correto.',
    target: '.file-upload-area',
    position: 'top',
    action: {
      type: 'upload',
      text: 'Faça upload da sua planilha de estoque'
    }
  },
  {
    id: 'manual-entry-explanation',
    title: 'PASSO 4: Entender a Contagem Manual',
    description: 'Agora você vai ao estoque físico e conta os produtos. Para cada item encontrado, digite o CÓDIGO aqui. O sistema comparará com sua planilha.',
    target: '.manual-entry-section',
    position: 'bottom'
  },
  {
    id: 'manual-entry',
    title: 'PASSO 5: Inserir Códigos Encontrados',
    description: 'Digite os códigos dos produtos que você realmente encontrou no estoque. Pode repetir códigos se encontrou múltiplas unidades.',
    target: '.manual-entry-input',
    position: 'bottom',
    action: {
      type: 'input',
      text: 'Digite um código de produto (ex: A001)'
    }
  },
  {
    id: 'results-explanation',
    title: 'PASSO 6: Entender os Resultados',
    description: 'O sistema compara automaticamente: REGULAR (quantidade certa), EXCESSO (encontrou mais que esperado), FALTA (não encontrou o produto).',
    target: '.results-summary',
    position: 'top'
  },
  {
    id: 'view-results',
    title: 'PASSO 7: Analisar Divergências',
    description: 'Aqui estão suas divergências! Produtos em FALTA precisam de reposição. Produtos em EXCESSO podem estar mal cadastrados.',
    target: '.results-cards',
    position: 'top'
  },
  {
    id: 'generate-report',
    title: 'PASSO 8: Gerar Relatório Final',
    description: 'Clique em "Ver relatório" para gerar um PDF profissional com todos os resultados. Perfeito para apresentar para gestores!',
    target: '.btn-generate-report',
    position: 'bottom',
    action: {
      type: 'click',
      text: 'Clique em "Ver relatório"'
    }
  },
  {
    id: 'export-options',
    title: 'PASSO 9: Exportar Dados',
    description: 'No relatório, você pode exportar em PDF (para apresentação) ou Excel (para análise). Ambos são profissionais e prontos para uso.',
    target: '.export-buttons',
    position: 'top',
    isOptional: true
  },
  {
    id: 'categories-intro',
    title: 'EXTRA: Organizar por Categorias',
    description: 'Use "Categorias" para organizar produtos por tipo: Higiene, Alimentos, Bebidas, etc. Isso facilita auditorias específicas.',
    target: '.nav-categories',
    position: 'right',
    isOptional: true
  },
  {
    id: 'schedule-intro',
    title: 'EXTRA: Cronograma Automático',
    description: 'O "Cronograma" automatiza suas auditorias: define quais categorias contar em cada semana/mês. Muito útil para lojas grandes!',
    target: '.nav-schedule',
    position: 'right',
    isOptional: true
  },
  {
    id: 'complete',
    title: 'Parabéns! Você é um Expert! 🎊',
    description: 'Agora você sabe fazer auditorias profissionais! Resumo: Nova Contagem → Upload Planilha → Contar Fisicamente → Inserir Códigos → Gerar Relatório. Simples assim!',
    target: '.onboarding-complete',
    position: 'bottom'
  }
]

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    isActive: false,
    currentStep: 0,
    completedSteps: [],
    skippedSteps: []
  })
  
  const { track } = useAnalytics()

  // Carrega estado do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_state')
    if (saved) {
      const parsedState = JSON.parse(saved)
      setState(parsedState)
    }
  }, [])

  // Salva estado no localStorage
  useEffect(() => {
    localStorage.setItem('onboarding_state', JSON.stringify(state))
  }, [state])

  const startOnboarding = () => {
    setState(prev => ({ ...prev, isActive: true, currentStep: 0 }))
    track('ONBOARDING_STARTED')
  }

  const nextStep = () => {
    const currentStepData = ONBOARDING_STEPS[state.currentStep]
    
    setState(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1,
      completedSteps: [...prev.completedSteps, currentStepData.id]
    }))

    track('ONBOARDING_STEP_COMPLETED', { 
      step: currentStepData.id,
      stepNumber: state.currentStep + 1 
    })

    // Se chegou ao fim
    if (state.currentStep >= ONBOARDING_STEPS.length - 1) {
      completeOnboarding()
    }
  }

  const skipStep = () => {
    const currentStepData = ONBOARDING_STEPS[state.currentStep]
    
    setState(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1,
      skippedSteps: [...prev.skippedSteps, currentStepData.id]
    }))

    track('ONBOARDING_STEP_SKIPPED', { 
      step: currentStepData.id,
      stepNumber: state.currentStep + 1 
    })
  }

  const previousStep = () => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }))
  }

  const completeOnboarding = () => {
    setState(prev => ({ ...prev, isActive: false }))
    track('ONBOARDING_COMPLETED', {
      completedSteps: state.completedSteps.length,
      skippedSteps: state.skippedSteps.length,
      totalSteps: ONBOARDING_STEPS.length
    })
  }

  const resetOnboarding = () => {
    setState({
      isActive: false,
      currentStep: 0,
      completedSteps: [],
      skippedSteps: []
    })
    localStorage.removeItem('onboarding_state')
  }

  const shouldShowOnboarding = (): boolean => {
    // Mostra se nunca completou ou se é um novo usuário
    const hasCompletedBefore = localStorage.getItem('onboarding_completed')
    return !hasCompletedBefore
  }

  return {
    state,
    currentStep: ONBOARDING_STEPS[state.currentStep],
    totalSteps: ONBOARDING_STEPS.length,
    startOnboarding,
    nextStep,
    skipStep,
    previousStep,
    completeOnboarding,
    resetOnboarding,
    shouldShowOnboarding,
    isLastStep: state.currentStep >= ONBOARDING_STEPS.length - 1
  }
}

// Componente de overlay do onboarding
export function OnboardingOverlay() {
  const onboarding = useOnboarding()
  
  if (!onboarding.state.isActive || !onboarding.currentStep) {
    return null
  }

  const step = onboarding.currentStep
  const targetElement = document.querySelector(step.target)
  
  if (!targetElement) {
    return null
  }

  const rect = targetElement.getBoundingClientRect()
  const tooltipPosition = calculateTooltipPosition(rect, step.position)

  return (
    <>
      {/* Overlay escuro */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998]" />
      
      {/* Spotlight no elemento alvo */}
      <div 
        className="fixed border-4 border-blue-500 rounded-lg z-[9999] pointer-events-none"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
        }}
      />
      
      {/* Tooltip */}
      <div
        className="fixed z-[10000] bg-white rounded-lg shadow-2xl p-6 max-w-sm"
        style={tooltipPosition}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
          <button
            onClick={onboarding.completeOnboarding}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">{step.description}</p>
        
        {step.action && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              👆 {step.action.text}
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {onboarding.state.currentStep + 1} de {onboarding.totalSteps}
            </span>
            
            {/* Progress bar */}
            <div className="w-20 h-2 bg-gray-200 rounded-full">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ 
                  width: `${((onboarding.state.currentStep + 1) / onboarding.totalSteps) * 100}%` 
                }}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            {onboarding.state.currentStep > 0 && (
              <button
                onClick={onboarding.previousStep}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
            
            {step.isOptional && (
              <button
                onClick={onboarding.skipStep}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Pular
              </button>
            )}
            
            <button
              onClick={onboarding.nextStep}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {onboarding.isLastStep ? 'Finalizar' : 'Próximo'}
              {!onboarding.isLastStep && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// Calcula posição do tooltip baseado no elemento alvo
function calculateTooltipPosition(
  rect: DOMRect, 
  position: 'top' | 'bottom' | 'left' | 'right'
): React.CSSProperties {
  const padding = 16
  
  switch (position) {
    case 'top':
      return {
        top: rect.top - 200 - padding,
        left: rect.left + (rect.width / 2) - 150,
      }
    case 'bottom':
      return {
        top: rect.bottom + padding,
        left: rect.left + (rect.width / 2) - 150,
      }
    case 'left':
      return {
        top: rect.top + (rect.height / 2) - 100,
        left: rect.left - 320 - padding,
      }
    case 'right':
      return {
        top: rect.top + (rect.height / 2) - 100,
        left: rect.right + padding,
      }
    default:
      return {
        top: rect.bottom + padding,
        left: rect.left,
      }
  }
}

// Hook para marcar elementos para onboarding
export function useOnboardingTarget(id: string) {
  return {
    className: `onboarding-target-${id}`,
    'data-onboarding': id
  }
}