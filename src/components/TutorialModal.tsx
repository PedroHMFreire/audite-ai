import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Play, FileText, Calculator, ClipboardList, BarChart3 } from 'lucide-react'

interface TutorialStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  content: React.ReactNode
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'intro',
    title: 'Como Fazer uma Auditoria Completa',
    description: 'Aprenda o processo completo de auditoria de estoque em 5 passos simples',
    icon: <Play className="h-8 w-8" />,
    content: (
      <div className="space-y-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">O que é uma Auditoria de Estoque?</h4>
          <p className="text-zinc-700 dark:text-zinc-300">
            É o processo de conferir se os produtos no seu sistema (planilha) correspondem 
            aos produtos realmente presentes no estoque físico.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <div className="text-2xl mb-2">📋</div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">REGULAR</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Quantidade correta</div>
          </div>
          
          <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <div className="text-2xl mb-2">📈</div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">EXCESSO</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Mais que esperado</div>
          </div>
          
          <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">FALTA</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Produto não encontrado</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'prepare',
    title: 'PASSO 1: Preparar sua Planilha',
    description: 'Configure sua planilha com os dados do sistema',
    icon: <FileText className="h-8 w-8" />,
    content: (
      <div className="space-y-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Formato Obrigatório</h4>
          <p className="text-yellow-800 dark:text-yellow-200 mb-3">
            Sua planilha deve ter exatamente 3 colunas com estes nomes:
          </p>
          
          <div className="bg-white dark:bg-zinc-800 p-3 rounded border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">CÓDIGO</th>
                  <th className="text-left p-2 font-medium">NOME</th>
                  <th className="text-left p-2 font-medium">SALDO</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2">A001</td>
                  <td className="p-2">Shampoo Johnson</td>
                  <td className="p-2">15</td>
                </tr>
                <tr>
                  <td className="p-2">B002</td>
                  <td className="p-2">Sabonete Dove</td>
                  <td className="p-2">8</td>
                </tr>
                <tr>
                  <td className="p-2">C003</td>
                  <td className="p-2">Pasta de Dente</td>
                  <td className="p-2">12</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">💡 Dicas Importantes</h4>
          <ul className="space-y-2 text-zinc-700 dark:text-zinc-300">
            <li>• <strong>CÓDIGO:</strong> Use códigos únicos e simples (A001, B002, etc.)</li>
            <li>• <strong>NOME:</strong> Descrição clara do produto</li>
            <li>• <strong>SALDO:</strong> Quantidade que deveria ter no estoque</li>
            <li>• <strong>Formato:</strong> Excel (.xlsx) ou CSV</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'upload',
    title: 'PASSO 2: Fazer Upload e Começar',
    description: 'Carregue sua planilha e inicie a contagem',
    icon: <ClipboardList className="h-8 w-8" />,
    content: (
      <div className="space-y-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Como Fazer</h4>
          <ol className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <li className="flex items-start">
              <span className="bg-zinc-700 dark:bg-zinc-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
              <div>
                <strong>Clique em "Nova Contagem"</strong><br />
                <span className="text-sm">Dê um nome descritivo como "Auditoria Dezembro 2025"</span>
              </div>
            </li>
            
            <li className="flex items-start">
              <span className="bg-zinc-700 dark:bg-zinc-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
              <div>
                <strong>Faça upload da planilha</strong><br />
                <span className="text-sm">Arraste o arquivo ou clique para selecionar</span>
              </div>
            </li>
            
            <li className="flex items-start">
              <span className="bg-zinc-700 dark:bg-zinc-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
              <div>
                <strong>Sistema valida automaticamente</strong><br />
                <span className="text-sm">Você verá se a planilha está no formato correto</span>
              </div>
            </li>
          </ol>
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">⚠️ Problemas Comuns</h4>
          <ul className="space-y-1 text-amber-800 dark:text-amber-200">
            <li>• <strong>Nomes de colunas diferentes:</strong> Certifique-se que são exatamente CÓDIGO, NOME, SALDO</li>
            <li>• <strong>Arquivo muito grande:</strong> Máximo 1000 produtos por planilha</li>
            <li>• <strong>Códigos duplicados:</strong> Cada produto deve ter um código único</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'count',
    title: 'PASSO 3: Contar no Estoque Físico',
    description: 'Vá ao estoque e conte os produtos reais',
    icon: <Calculator className="h-8 w-8" />,
    content: (
      <div className="space-y-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Como Contar</h4>
          <ol className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <li className="flex items-start">
              <span className="bg-zinc-700 dark:bg-zinc-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
              <div>
                <strong>Vá ao seu estoque físico</strong><br />
                <span className="text-sm">Leve um dispositivo móvel com a tela da contagem aberta</span>
              </div>
            </li>
            
            <li className="flex items-start">
              <span className="bg-zinc-700 dark:bg-zinc-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
              <div>
                <strong>Encontre cada produto fisicamente</strong><br />
                <span className="text-sm">Pegue o produto na mão e veja o código dele</span>
              </div>
            </li>
            
            <li className="flex items-start">
              <span className="bg-zinc-700 dark:bg-zinc-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
              <div>
                <strong>Digite o código na tela</strong><br />
                <span className="text-sm">Para cada unidade encontrada, digite o código</span>
              </div>
            </li>
            
            <li className="flex items-start">
              <span className="bg-zinc-700 dark:bg-zinc-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
              <div>
                <strong>Repita o código se tiver mais unidades</strong><br />
                <span className="text-sm">Se encontrou 3 unidades do mesmo produto, digite o código 3 vezes</span>
              </div>
            </li>
          </ol>
        </div>
        
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">🎯 Exemplo Prático</h4>
          <div className="text-zinc-700 dark:text-zinc-300">
            <p className="mb-2"><strong>Você encontrou no estoque:</strong></p>
            <ul className="space-y-1 ml-4">
              <li>• 2 unidades do produto A001 → Digite: A001, A001</li>
              <li>• 1 unidade do produto B002 → Digite: B002</li>
              <li>• Nenhuma unidade do C003 → Não digite nada</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'results',
    title: 'PASSO 4: Analisar Resultados',
    description: 'Entenda as divergências encontradas',
    icon: <BarChart3 className="h-8 w-8" />,
    content: (
      <div className="space-y-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Sistema Compara Automaticamente</h4>
          <p className="text-zinc-700 dark:text-zinc-300 mb-3">
            O sistema compara o que você digitou (encontrado) com o que estava na planilha (esperado):
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded border border-zinc-200 dark:border-zinc-700">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">✅ REGULAR</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Quantidade encontrada = Quantidade esperada
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                <strong>Exemplo:</strong> Esperava 5, encontrou 5
              </div>
            </div>
            
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded border border-zinc-200 dark:border-zinc-700">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">📈 EXCESSO</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Quantidade encontrada {'>'} Quantidade esperada
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                <strong>Exemplo:</strong> Esperava 5, encontrou 8
              </div>
            </div>
            
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded border border-zinc-200 dark:border-zinc-700">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">⚠️ FALTA</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Quantidade encontrada {'<'} Quantidade esperada
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                <strong>Exemplo:</strong> Esperava 5, encontrou 2 (ou 0)
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">🎯 O que fazer com cada resultado?</h4>
          <ul className="space-y-2 text-zinc-700 dark:text-zinc-300">
            <li>• <strong>REGULAR:</strong> Tudo certo! Não precisa fazer nada</li>
            <li>• <strong>EXCESSO:</strong> Verifique se o produto está cadastrado errado no sistema</li>
            <li>• <strong>FALTA:</strong> Precisa repor o estoque ou atualizar o sistema</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'report',
    title: 'PASSO 5: Gerar Relatório Profissional',
    description: 'Exporte os resultados em PDF ou Excel',
    icon: <FileText className="h-8 w-8" />,
    content: (
      <div className="space-y-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Como Gerar o Relatório</h4>
          <ol className="space-y-2 text-zinc-700 dark:text-zinc-300">
            <li>1. Clique em <strong>"Ver relatório"</strong> na tela de resultados</li>
            <li>2. O sistema abre uma tela profissional com todos os dados</li>
            <li>3. Escolha o formato de exportação:</li>
          </ol>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h5 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">📄 Exportar PDF</h5>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
              <li>• Ideal para apresentações</li>
              <li>• Relatório visual e profissional</li>
              <li>• Perfeito para mostrar ao chefe</li>
              <li>• Gráficos e resumos incluídos</li>
            </ul>
          </div>
          
          <div className="bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h5 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">📊 Exportar Excel</h5>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
              <li>• Ideal para análise detalhada</li>
              <li>• Permite filtros e ordenação</li>
              <li>• Dados brutos para planilhas</li>
              <li>• Fácil de importar no sistema</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">🎊 Parabéns!</h4>
          <p className="text-zinc-700 dark:text-zinc-300">
            Agora você sabe fazer auditorias profissionais de estoque! O processo completo é:
            <br /><br />
            <strong>Nova Contagem → Upload Planilha → Contar Fisicamente → Inserir Códigos → Gerar Relatório</strong>
            <br /><br />
            Simples, rápido e profissional! 🚀
          </p>
        </div>
      </div>
    )
  }
]

interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  if (!isOpen) return null

  const step = TUTORIAL_STEPS[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1

  const nextStep = () => {
    if (!isLastStep) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(0)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
              {step.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {step.title}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {step.description}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            <span>Progresso do Tutorial</span>
            <span>{currentStep + 1} de {TUTORIAL_STEPS.length}</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
            <div 
              className="bg-zinc-600 dark:bg-zinc-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {step.content}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isFirstStep 
                ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed' 
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex items-center gap-2">
            {TUTORIAL_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-zinc-600 dark:bg-zinc-400' 
                    : 'bg-zinc-300 dark:bg-zinc-600 hover:bg-zinc-400 dark:hover:bg-zinc-500'
                }`}
              />
            ))}
          </div>

          {isLastStep ? (
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              Começar a usar! 🚀
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}