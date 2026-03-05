import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '@/components/Toast'
import ScheduleCalendar from '@/components/ScheduleCalendar'
import SchedulePredictiveWidget from '@/components/SchedulePredictiveWidget'
import TemplateSelect from '@/components/TemplateSelect'
import AnomalyAlerts from '@/components/AnomalyAlerts'
import {
  getCategories,
  getScheduleConfigs,
  createScheduleConfig,
  generateScheduleFromConfig,
  updateScheduleConfig,
  deleteScheduleConfigCompletely,
  type Category,
  type ScheduleConfig
} from '@/lib/db'
import { type ScheduleTemplate } from '@/lib/scheduleTemplates'

const WEEKDAY_LABELS = {
  1: 'Segunda',
  2: 'Terça', 
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
  7: 'Domingo'
}

export default function ScheduleConfig() {
  const { addToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [configs, setConfigs] = useState<ScheduleConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [calendarRefresh, setCalendarRefresh] = useState(0) // Para forçar refresh do calendário
  
  // Estados para edição e exclusão
  const [editingConfig, setEditingConfig] = useState<ScheduleConfig | null>(null)
  const [deletingConfig, setDeletingConfig] = useState<ScheduleConfig | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Estados para templates
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sectors_per_week: 4,
    start_date: '',
    total_weeks: 4,
    work_days: [1, 2, 3, 4, 5] // seg-sex por padrão
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [categoriesData, configsData] = await Promise.all([
        getCategories(),
        getScheduleConfigs()
      ])
      setCategories(categoriesData)
      setConfigs(configsData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados'
      addToast({
        type: 'error',
        message: 'Erro ao carregar dados',
        description: message
      })
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    loadData()
    
    // Define data padrão como próxima segunda-feira
    const today = new Date()
    const nextMonday = new Date(today)
    const daysUntilMonday = (1 + 7 - today.getDay()) % 7 || 7
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    
    setFormData(prev => ({
      ...prev,
      start_date: nextMonday.toISOString().split('T')[0]
    }))
  }, [loadData])

  const handleWorkDayToggle = useCallback((day: number) => {
    setFormData(prev => ({
      ...prev,
      work_days: prev.work_days.includes(day)
        ? prev.work_days.filter(d => d !== day)
        : [...prev.work_days, day].sort()
    }))
  }, [])

  const validateForm = useCallback(() => {
    if (!formData.name.trim()) {
      addToast({
        type: 'warning',
        message: 'Nome é obrigatório'
      })
      return false
    }

    if (categories.length === 0) {
      addToast({
        type: 'warning',
        message: 'Nenhuma categoria encontrada',
        description: 'Cadastre pelo menos uma categoria antes de criar o cronograma'
      })
      return false
    }

    if (categories.length < formData.sectors_per_week) {
      addToast({
        type: 'warning',
        message: 'Categorias insuficientes',
        description: `Você tem ${categories.length} categoria(s), mas precisa de pelo menos ${formData.sectors_per_week} para gerar o cronograma`
      })
      return false
    }

    if (formData.work_days.length === 0) {
      addToast({
        type: 'warning',
        message: 'Selecione pelo menos um dia útil'
      })
      return false
    }

    if (formData.sectors_per_week > formData.work_days.length) {
      addToast({
        type: 'warning',
        message: 'Setores por semana excede dias úteis',
        description: `Você selecionou ${formData.work_days.length} dia(s) útil(is), mas quer ${formData.sectors_per_week} setores por semana`
      })
      return false
    }

    return true
  }, [formData, categories, addToast])

  const handleTemplateSelect = useCallback((config: Partial<ScheduleConfig>, template: ScheduleTemplate) => {
    setFormData({
      name: config.name || '',
      description: config.description || '',
      sectors_per_week: config.sectors_per_week || 4,
      start_date: config.start_date || formData.start_date,
      total_weeks: config.total_weeks || 4,
      work_days: config.work_days || [1, 2, 3, 4, 5]
    })
    setSelectedTemplate(template)
    setShowTemplateSelector(false)
  }, [formData.start_date])

  const handleCreateAndGenerate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setGenerating(true)
    try {
      // 1. Criar configuração
      const config = await createScheduleConfig({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        sectors_per_week: formData.sectors_per_week,
        start_date: formData.start_date,
        total_weeks: formData.total_weeks,
        work_days: formData.work_days,
        is_active: true
      })

      addToast({
        type: 'success',
        message: 'Configuração criada!',
        duration: 2000
      })

      // 2. Gerar cronograma automaticamente
      await generateScheduleFromConfig(config.id)

      addToast({
        type: 'success',
        message: 'Cronograma gerado com sucesso!',
        description: `${formData.total_weeks} semanas programadas`
      })

      // 3. Reset form e reload
      setFormData({
        name: '',
        description: '',
        sectors_per_week: 4,
        start_date: formData.start_date, // mantém a data
        total_weeks: 4,
        work_days: [1, 2, 3, 4, 5]
      })

      await loadData()
      setCalendarRefresh(prev => prev + 1) // Força refresh do calendário
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar cronograma'
      addToast({
        type: 'error',
        message: 'Erro ao criar cronograma',
        description: message
      })
      console.error('Erro ao criar cronograma:', err)
    } finally {
      setGenerating(false)
    }
  }, [formData, validateForm, addToast, loadData])

  const handleRegenerateSchedule = useCallback(async (configId: string) => {
    if (!confirm('Tem certeza? Isso irá substituir o cronograma atual desta configuração.')) {
      return
    }

    try {
      setGenerating(true)
      await generateScheduleFromConfig(configId)
      
      addToast({
        type: 'success',
        message: 'Cronograma regenerado!',
        duration: 3000
      })
      
      setCalendarRefresh(prev => prev + 1) // Força refresh do calendário
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao regenerar cronograma'
      addToast({
        type: 'error',
        message: 'Erro ao regenerar cronograma',
        description: message
      })
      console.error('Erro ao regenerar:', err)
    } finally {
      setGenerating(false)
    }
  }, [addToast])

  const handleEditConfig = useCallback((config: ScheduleConfig) => {
    setEditingConfig(config)
  }, [])

  const handleSaveEdit = useCallback(async (updatedData: { name: string; description: string }) => {
    if (!editingConfig) return

    try {
      await updateScheduleConfig(editingConfig.id, {
        name: updatedData.name,
        description: updatedData.description
      })

      addToast({
        type: 'success',
        message: 'Configuração atualizada!',
        duration: 2000
      })

      setEditingConfig(null)
      await loadData()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar configuração'
      addToast({
        type: 'error',
        message: 'Erro ao atualizar',
        description: message
      })
      console.error('Erro ao editar:', err)
    }
  }, [editingConfig, addToast, loadData])

  const handleDeleteConfig = useCallback((config: ScheduleConfig) => {
    setDeletingConfig(config)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deletingConfig) return

    try {
      setDeleting(true)
      await deleteScheduleConfigCompletely(deletingConfig.id)

      addToast({
        type: 'success',
        message: 'Configuração excluída!',
        description: 'Cronograma e todos os itens foram removidos',
        duration: 3000
      })

      setDeletingConfig(null)
      await loadData()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir configuração'
      addToast({
        type: 'error',
        message: 'Erro ao excluir',
        description: message
      })
      console.error('Erro ao excluir:', err)
    } finally {
      setDeleting(false)
    }
  }, [deletingConfig, addToast, loadData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Carregando configurações...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cronograma de Contagens</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Configure e gere cronogramas automáticos para suas contagens cíclicas
          </p>
        </div>
      </div>

      {/* PHASE 1: Dashboard Preditivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SchedulePredictiveWidget />
        </div>
        <div>
          <AnomalyAlerts />
        </div>
      </div>

      {/* Seletor de Templates */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Selecionar Template</h2>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>
            <TemplateSelect 
              onSelect={handleTemplateSelect}
              selectedId={selectedTemplate?.id}
              loading={generating}
            />
          </div>
        </div>
      )}

      {/* Categories Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Categorias Disponíveis</h3>
          <span className="text-sm text-zinc-500">
            {categories.length} categoria{categories.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {categories.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-zinc-500 dark:text-zinc-400 mb-2">
              📂 Nenhuma categoria encontrada
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <a href="/categorias" className="link">Cadastre categorias</a> antes de criar cronogramas
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <div
                key={category.id}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm"
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create New Schedule Form */}
      <div className="card">
        <form onSubmit={handleCreateAndGenerate} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Novo Cronograma</h3>
            {selectedTemplate && (
              <span className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-1">
                📋 {selectedTemplate.name}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Cronograma *</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Cronograma Novembro 2025"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Data de Início *</label>
              <input
                type="date"
                className="input"
                value={formData.start_date}
                onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea
              className="input"
              rows={2}
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição opcional do cronograma..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Setores por Semana
                <span className="text-xs text-zinc-500 ml-1">(máx: {categories.length})</span>
              </label>
              <input
                type="number"
                className="input"
                min="1"
                max={Math.min(10, categories.length)}
                value={formData.sectors_per_week}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  sectors_per_week: e.target.value === '' ? 1 : Math.min(Math.min(10, categories.length), Math.max(1, parseInt(e.target.value) || 1)) 
                }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Duração (semanas)</label>
              <input
                type="number"
                className="input"
                min="1"
                max="52"
                value={formData.total_weeks}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  total_weeks: e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value) || 1) 
                }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Dias Úteis</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(WEEKDAY_LABELS).map(([day, label]) => {
                const dayNum = parseInt(day)
                const isSelected = formData.work_days.includes(dayNum)
                return (
                  <button
                    key={day}
                    type="button"
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    onClick={() => handleWorkDayToggle(dayNum)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {formData.work_days.length} dia{formData.work_days.length !== 1 ? 's' : ''} selecionado{formData.work_days.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">📊 Preview:</div>
            <div className="text-sm space-y-1">
              <div><strong>{formData.sectors_per_week}</strong> setores por semana</div>
              <div><strong>{formData.total_weeks}</strong> semanas = <strong>{formData.sectors_per_week * formData.total_weeks}</strong> contagens totais</div>
              <div>Dias: {formData.work_days.map(d => WEEKDAY_LABELS[d as keyof typeof WEEKDAY_LABELS]).join(', ')}</div>
              {formData.start_date && (
                <div>Início: {new Date(formData.start_date).toLocaleDateString()}</div>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            className="btn w-full" 
            disabled={generating || categories.length === 0}
          >
            {generating ? '🎲 Gerando Cronograma...' : '🎲 Criar e Gerar Cronograma'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-zinc-900 text-zinc-500">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTemplateSelector(true)}
            className="btn-secondary w-full"
            disabled={generating}
          >
            ✨ Usar Template Inteligente
          </button>
        </form>
      </div>

      {/* Existing Configurations */}
      <div className="space-y-3">
        <h3 className="font-medium">Configurações Existentes</h3>
        
        {configs.length === 0 ? (
          <div className="card text-center py-6">
            <div className="text-zinc-500 dark:text-zinc-400">
              📅 Nenhuma configuração encontrada
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Crie sua primeira configuração acima
            </p>
          </div>
        ) : (
          configs.map(config => (
            <div key={config.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{config.name}</h4>
                    {config.is_active && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                        Ativo
                      </span>
                    )}
                    {config.generated_at && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                        Gerado
                      </span>
                    )}
                  </div>
                  
                  {config.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                      {config.description}
                    </p>
                  )}
                  
                  <div className="text-sm text-zinc-500 space-y-1">
                    <div>
                      📊 {config.sectors_per_week} setores/semana • {config.total_weeks} semanas
                    </div>
                    <div>
                      📅 {new Date(config.start_date).toLocaleDateString()} 
                      {config.end_date && ` → ${new Date(config.end_date).toLocaleDateString()}`}
                    </div>
                    <div>
                      🗓️ {config.work_days.map(d => WEEKDAY_LABELS[d as keyof typeof WEEKDAY_LABELS]).join(', ')}
                    </div>
                    {config.generated_at && (
                      <div>
                        ⚡ Gerado em {new Date(config.generated_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 sm:flex-col sm:ml-4">
                  <button
                    className="badge flex-1 sm:flex-none"
                    onClick={() => handleRegenerateSchedule(config.id)}
                    disabled={generating}
                  >
                    🔄 Regenerar
                  </button>
                  <button
                    className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 flex-1 sm:flex-none"
                    onClick={() => handleEditConfig(config)}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    className="badge bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 flex-1 sm:flex-none"
                    onClick={() => handleDeleteConfig(config)}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Edição */}
      {editingConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Editar Configuração</h3>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              handleSaveEdit({
                name: formData.get('name') as string,
                description: formData.get('description') as string
              })
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <input
                    type="text"
                    name="name"
                    className="input"
                    defaultValue={editingConfig.name}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <textarea
                    name="description"
                    className="input resize-none"
                    rows={3}
                    defaultValue={editingConfig.description || ''}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setEditingConfig(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">
              ⚠️ Confirmar Exclusão
            </h3>
            
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Tem certeza que deseja excluir a configuração <strong>"{deletingConfig.name}"</strong>?
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Atenção:</strong> Esta ação irá remover permanentemente:
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 ml-4">
                <li>• A configuração do cronograma</li>
                <li>• Todos os itens programados</li>
                <li>• Esta ação não pode ser desfeita</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setDeletingConfig(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Excluindo...' : 'Excluir Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendário Integrado */}
      <ScheduleCalendar refreshTrigger={calendarRefresh} />
    </div>
  )
}