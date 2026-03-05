import { SCHEDULE_TEMPLATES, ScheduleTemplate, generateConfigFromTemplate } from '@/lib/scheduleTemplates'
import { ScheduleConfig } from '@/lib/db'

interface TemplateSelectProps {
  onSelect: (config: Partial<ScheduleConfig>, template: ScheduleTemplate) => void
  selectedId?: string
  loading?: boolean
}

export default function TemplateSelect({ onSelect, selectedId, loading }: TemplateSelectProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <span>🎨</span>
          Templates Inteligentes
        </h3>
        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
          IA
        </span>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        Escolha um template baseado no seu cenário ou criar customizado
      </p>

      <div className="space-y-3">
        {SCHEDULE_TEMPLATES.map(template => (
          <button
            key={template.id}
            onClick={() => {
              const config = generateConfigFromTemplate(template)
              onSelect(config, template)
            }}
            disabled={loading}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left group ${
              selectedId === template.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{template.icon}</span>
                  <h4 className="font-medium">{template.name}</h4>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                  {template.description}
                </p>
                
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-zinc-500">Setores/sem</span>
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      {template.sectors_per_week}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-500">Duração</span>
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      {template.total_weeks}w
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-500">Total contagens</span>
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      {template.sectors_per_week * template.total_weeks}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 italic mb-2">
                  {template.recommendation_text}
                </p>

                {template.ideal_for.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.ideal_for.map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded"
                      >
                        {tag === 'high_error_rate' && '📊 Alto erro'}
                        {tag === 'high_turnover' && '👥 Alto turnover'}
                        {tag === 'large_network' && '🏬 Grande rede'}
                        {tag === 'standard_operation' && '⚙️ Padrão'}
                        {tag === 'medium_network' && '🏪 Médio'}
                        {tag === 'stable_operations' && '✅ Estável'}
                        {tag === 'low_error_rate' && '✨ Baixo erro'}
                        {tag === 'small_stores' && '🏠 Pequeno'}
                        {tag === 'seasonal_business' && '🎄 Sazonalidade'}
                        {tag === 'retail_network' && '🛍️ Varejo'}
                        {tag === 'high_variance' && '📈 Variável'}
                        {tag === 'high_risk_locations' && '⚠️ Alto risco'}
                        {tag === 'uneven_performance' && '⚔️ Desigual'}
                        {tag === 'limited_budget' && '💰 Orçamento'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedId === template.id && (
                <div className="ml-4">
                  <span className="text-2xl">✓</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-900 dark:text-blue-200">
          💡 <strong>Dica:</strong> Templates são baseados em análise de dados. Customize conforme necessário.
        </p>
      </div>
    </div>
  )
}
