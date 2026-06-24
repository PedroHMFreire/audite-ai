import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
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

const WEEKDAYS = [
  { num: 1, short: 'Seg', full: 'Segunda' },
  { num: 2, short: 'Ter', full: 'Terça' },
  { num: 3, short: 'Qua', full: 'Quarta' },
  { num: 4, short: 'Qui', full: 'Quinta' },
  { num: 5, short: 'Sex', full: 'Sexta' },
  { num: 6, short: 'Sáb', full: 'Sábado' },
  { num: 7, short: 'Dom', full: 'Domingo' }
]
const dayFull = (n: number) => WEEKDAYS.find(d => d.num === n)?.full ?? ''
const dayShort = (n: number) => WEEKDAYS.find(d => d.num === n)?.short ?? ''

export default function ScheduleConfig() {
  const { addToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [configs, setConfigs] = useState<ScheduleConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [calendarRefresh, setCalendarRefresh] = useState(0)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ScheduleConfig | null>(null)
  const [deletingConfig, setDeletingConfig] = useState<ScheduleConfig | null>(null)
  const [regenConfig, setRegenConfig] = useState<ScheduleConfig | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sectors_per_week: 4,
    start_date: '',
    total_weeks: 4,
    work_days: [1, 2, 3, 4, 5]
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [categoriesData, configsData] = await Promise.all([getCategories(), getScheduleConfigs()])
      setCategories(categoriesData)
      setConfigs(configsData)
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao carregar dados', description: err instanceof Error ? err.message : '' })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    loadData()
    const today = new Date()
    const nextMonday = new Date(today)
    const daysUntilMonday = (1 + 7 - today.getDay()) % 7 || 7
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    setFormData(prev => ({ ...prev, start_date: nextMonday.toISOString().split('T')[0] }))
  }, [loadData])

  const toggleWorkDay = useCallback((day: number) => {
    setFormData(prev => ({
      ...prev,
      work_days: prev.work_days.includes(day) ? prev.work_days.filter(d => d !== day) : [...prev.work_days, day].sort()
    }))
  }, [])

  const validateForm = useCallback(() => {
    if (!formData.name.trim()) { addToast({ type: 'warning', message: 'Dê um nome ao cronograma' }); return false }
    if (categories.length === 0) { addToast({ type: 'warning', message: 'Cadastre categorias antes', description: 'O cronograma distribui as categorias ao longo das semanas' }); return false }
    if (categories.length < formData.sectors_per_week) { addToast({ type: 'warning', message: 'Categorias insuficientes', description: `Você tem ${categories.length} e precisa de ${formData.sectors_per_week}` }); return false }
    if (formData.work_days.length === 0) { addToast({ type: 'warning', message: 'Selecione ao menos um dia' }); return false }
    if (formData.sectors_per_week > formData.work_days.length) { addToast({ type: 'warning', message: 'Setores por semana acima dos dias úteis', description: `${formData.work_days.length} dia(s) para ${formData.sectors_per_week} setores` }); return false }
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
      const config = await createScheduleConfig({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        sectors_per_week: formData.sectors_per_week,
        start_date: formData.start_date,
        total_weeks: formData.total_weeks,
        work_days: formData.work_days,
        is_active: true
      })
      await generateScheduleFromConfig(config.id)
      addToast({ type: 'success', message: 'Cronograma gerado!', description: `${formData.total_weeks} semanas programadas` })
      setFormData(prev => ({ name: '', description: '', sectors_per_week: 4, start_date: prev.start_date, total_weeks: 4, work_days: [1, 2, 3, 4, 5] }))
      setSelectedTemplate(null)
      setShowCreateForm(false)
      await loadData()
      setCalendarRefresh(p => p + 1)
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao gerar cronograma', description: err instanceof Error ? err.message : '' })
    } finally {
      setGenerating(false)
    }
  }, [formData, validateForm, addToast, loadData])

  const confirmRegenerate = useCallback(async () => {
    const cfg = regenConfig
    setRegenConfig(null)
    if (!cfg) return
    try {
      setGenerating(true)
      await generateScheduleFromConfig(cfg.id)
      addToast({ type: 'success', message: 'Cronograma regenerado' })
      setCalendarRefresh(p => p + 1)
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao regenerar', description: err instanceof Error ? err.message : '' })
    } finally {
      setGenerating(false)
    }
  }, [regenConfig, addToast])

  const handleSaveEdit = useCallback(async (updated: { name: string; description: string }) => {
    if (!editingConfig) return
    try {
      await updateScheduleConfig(editingConfig.id, { name: updated.name, description: updated.description })
      addToast({ type: 'success', message: 'Cronograma atualizado' })
      setEditingConfig(null)
      await loadData()
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao atualizar', description: err instanceof Error ? err.message : '' })
    }
  }, [editingConfig, addToast, loadData])

  const confirmDelete = useCallback(async () => {
    if (!deletingConfig) return
    try {
      setDeleting(true)
      await deleteScheduleConfigCompletely(deletingConfig.id)
      addToast({ type: 'success', message: 'Cronograma excluído' })
      setDeletingConfig(null)
      await loadData()
      setCalendarRefresh(p => p + 1)
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao excluir', description: err instanceof Error ? err.message : '' })
    } finally {
      setDeleting(false)
    }
  }, [deletingConfig, addToast, loadData])

  const totalCounts = formData.sectors_per_week * formData.total_weeks

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-sm text-muted">Carregando cronograma…</div>
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho + ação */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Cronograma de contagens</h1>
          <p className="text-sm text-muted">Acompanhe o ciclo e gere um novo cronograma quando precisar.</p>
        </div>
        <button className="btn flex-shrink-0 min-h-11" onClick={() => setShowCreateForm(true)}>+ Novo cronograma</button>
      </div>

      {/* Dashboard / análises — destaque */}
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2"><SchedulePredictiveWidget /></div>
        <AnomalyAlerts />
      </div>

      {/* Calendário — visão principal */}
      <ScheduleCalendar refreshTrigger={calendarRefresh} />

      {/* Cronogramas (gestão) — recolhido, pois é ocasional */}
      {configs.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold select-none">
            Cronogramas <span className="text-muted">({configs.length})</span>
          </summary>
          <div className="mt-3 space-y-3">
            {configs.map(config => (
              <div key={config.id} className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium truncate">{config.name}</h4>
                      {config.is_active && <span className="badge badge-success">Ativo</span>}
                    </div>
                    <div className="text-sm text-muted mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                      <span>{config.sectors_per_week}/semana · {config.total_weeks} sem.</span>
                      <span>{new Date(config.start_date).toLocaleDateString()}{config.end_date && ` – ${new Date(config.end_date).toLocaleDateString()}`}</span>
                      <span>{config.work_days.map(dayShort).join(', ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button className="rounded-lg px-3 min-h-9 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" onClick={() => setRegenConfig(config)} disabled={generating}>Regenerar</button>
                    <button className="rounded-lg px-3 min-h-9 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" onClick={() => setEditingConfig(config)}>Editar</button>
                    <button className="rounded-lg px-3 min-h-9 text-sm text-danger hover:bg-danger/10 transition" onClick={() => setDeletingConfig(config)}>Excluir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Modal: criar cronograma */}
      {showCreateForm && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 overflow-y-auto" onClick={() => setShowCreateForm(false)}>
          <form onSubmit={handleCreateAndGenerate} onClick={e => e.stopPropagation()}
            className="card w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Novo cronograma</h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none">✕</button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input className="input" value={formData.name} placeholder="Ex.: Cronograma Junho" autoFocus
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Início</label>
              <input type="date" className="input" value={formData.start_date}
                onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Setores/semana</label>
                <input type="number" className="input" min={1} max={Math.min(10, categories.length || 10)} value={formData.sectors_per_week}
                  onChange={e => setFormData(p => ({ ...p, sectors_per_week: Math.min(Math.min(10, categories.length || 10), Math.max(1, parseInt(e.target.value) || 1)) }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Semanas</label>
                <input type="number" className="input" min={1} max={52} value={formData.total_weeks}
                  onChange={e => setFormData(p => ({ ...p, total_weeks: Math.max(1, Math.min(52, parseInt(e.target.value) || 1)) }))} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Dias da semana</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map(({ num, short }) => {
                  const on = formData.work_days.includes(num)
                  return (
                    <button key={num} type="button" onClick={() => toggleWorkDay(num)}
                      className={`min-w-11 min-h-10 px-2 rounded-lg text-sm font-medium transition-colors ${
                        on ? 'bg-primary-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}>{short}</button>
                  )
                })}
              </div>
            </div>

            <p className="text-sm text-muted border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <span className="text-zinc-900 dark:text-white font-medium">{totalCounts}</span> contagens
              <span className="mx-1">·</span>{formData.sectors_per_week}/semana × {formData.total_weeks} sem.
              {formData.work_days.length > 0 && <><span className="mx-1">·</span>{formData.work_days.map(dayFull).join(', ')}</>}
            </p>

            <div className="flex flex-col gap-2">
              <button type="submit" className="btn w-full min-h-11" disabled={generating || categories.length === 0}>
                {generating ? 'Gerando…' : 'Gerar cronograma'}
              </button>
              <button type="button" onClick={() => setShowTemplateSelector(true)} className="btn-ghost w-full min-h-11 text-sm" disabled={generating}>
                Usar um modelo pronto
              </button>
            </div>

            {categories.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Nenhuma categoria cadastrada. <a href="/categorias" className="link">Cadastre categorias</a> para começar.
              </p>
            )}
          </form>
        </div>
      )}

      {/* Modal: seletor de template (acima do form) */}
      {showTemplateSelector && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 overflow-y-auto" onClick={() => setShowTemplateSelector(false)}>
          <div className="card w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Escolher um modelo</h3>
              <button onClick={() => setShowTemplateSelector(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none">✕</button>
            </div>
            <TemplateSelect onSelect={handleTemplateSelect} selectedId={selectedTemplate?.id} loading={generating} />
          </div>
        </div>
      )}

      {/* Modal: editar */}
      {editingConfig && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setEditingConfig(null)}>
          <form
            className="card w-full max-w-md space-y-4"
            onClick={e => e.stopPropagation()}
            onSubmit={e => { e.preventDefault(); const f = new FormData(e.target as HTMLFormElement); handleSaveEdit({ name: f.get('name') as string, description: f.get('description') as string }) }}
          >
            <h3 className="text-sm font-semibold">Editar cronograma</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input name="name" className="input" defaultValue={editingConfig.name} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <textarea name="description" className="input resize-none" rows={3} defaultValue={editingConfig.description || ''} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" className="btn-ghost min-h-11 sm:min-h-10 text-sm" onClick={() => setEditingConfig(null)}>Cancelar</button>
              <button type="submit" className="btn min-h-11 sm:min-h-10">Salvar</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={!!regenConfig}
        title="Regenerar cronograma?"
        description={regenConfig ? `Isso substitui o cronograma atual de "${regenConfig.name}" por um novo sorteio das categorias.` : ''}
        confirmLabel="Regenerar"
        onConfirm={confirmRegenerate}
        onCancel={() => setRegenConfig(null)}
      />

      <ConfirmDialog
        open={!!deletingConfig}
        title="Excluir cronograma?"
        description={deletingConfig ? `"${deletingConfig.name}" e todos os itens programados serão removidos. Esta ação não pode ser desfeita.` : ''}
        confirmLabel={deleting ? 'Excluindo…' : 'Excluir'}
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeletingConfig(null)}
      />
    </div>
  )
}
