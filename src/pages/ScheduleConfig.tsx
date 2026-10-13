import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useToast } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import RoteiroShare from '@/components/RoteiroShare'
import ScheduleCalendar from '@/components/ScheduleCalendar'
import ScheduleTabs from '@/components/ScheduleTabs'
import {
  getCategories,
  getScheduleConfigs,
  generateScheduleFromConfig,
  updateScheduleConfig,
  deleteScheduleConfigCompletely,
  type Category,
  type ScheduleConfig
} from '@/lib/db'
import { createRoteiro, generateRoteiro, getSellers, type Seller } from '@/lib/team'
import { FREQUENCIES, planCycles, type Frequency } from '@/lib/roteiro'
import { parseLocalDate, toLocalISODate } from '@/lib/scheduleDates'

const WEEKDAYS = [
  { num: 1, short: 'Seg' },
  { num: 2, short: 'Ter' },
  { num: 3, short: 'Qua' },
  { num: 4, short: 'Qui' },
  { num: 5, short: 'Sex' },
  { num: 6, short: 'Sáb' },
  { num: 7, short: 'Dom' }
]
const dayShort = (n: number) => WEEKDAYS.find(d => d.num === n)?.short ?? ''
const formatDate = (iso: string) => parseLocalDate(iso).toLocaleDateString('pt-BR')

const DEFAULT_INSTRUCTIONS =
  'Conte todas as peças da categoria, inclusive as do estoque e do provador. ' +
  'Bipe peça por peça, sem pular etiquetas. ' +
  'Finalize a contagem no mesmo dia e avise o gerente sobre faltas e sobras.'

const DEFAULT_CYCLES: Record<Frequency, number> = { weekly: 4, biweekly: 4, monthly: 3 }

function nextMonday(): string {
  const date = new Date()
  date.setDate(date.getDate() + ((1 + 7 - date.getDay()) % 7 || 7))
  return toLocalISODate(date)
}

export default function ScheduleConfig() {
  const { addToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [configs, setConfigs] = useState<ScheduleConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [calendarRefresh, setCalendarRefresh] = useState(0)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [sharing, setSharing] = useState<ScheduleConfig | null>(null)
  const [editingConfig, setEditingConfig] = useState<ScheduleConfig | null>(null)
  const [deletingConfig, setDeletingConfig] = useState<ScheduleConfig | null>(null)
  const [regenConfig, setRegenConfig] = useState<ScheduleConfig | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    frequency: 'weekly' as Frequency,
    start_date: nextMonday(),
    cycles: DEFAULT_CYCLES.weekly,
    work_days: [1, 2, 3, 4, 5, 6],
    instructions: DEFAULT_INSTRUCTIONS
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [categoriesData, configsData, sellersData] = await Promise.all([getCategories(), getScheduleConfigs(), getSellers()])
      setCategories(categoriesData)
      setConfigs(configsData)
      setSellers(sellersData)
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao carregar dados', description: err instanceof Error ? err.message : '' })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { loadData() }, [loadData])

  const toggleWorkDay = useCallback((day: number) => {
    setFormData(prev => ({
      ...prev,
      work_days: prev.work_days.includes(day) ? prev.work_days.filter(d => d !== day) : [...prev.work_days, day].sort()
    }))
  }, [])

  const handleCreateAndGenerate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) { addToast({ type: 'warning', message: 'Dê um nome ao roteiro' }); return }
    if (formData.work_days.length === 0) { addToast({ type: 'warning', message: 'Selecione ao menos um dia' }); return }
    setGenerating(true)
    try {
      const { config, total } = await createRoteiro({ ...formData, name: formData.name.trim() })
      addToast({ type: 'success', message: 'Roteiro criado', description: `${total} contagens programadas` })
      setFormData(prev => ({ ...prev, name: '' }))
      setShowCreateForm(false)
      await loadData()
      setCalendarRefresh(p => p + 1)
      // O roteiro nasce pronto para ser entregue ao gerente e aos vendedores.
      setSharing(config)
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao gerar roteiro', description: err instanceof Error ? err.message : '' })
    } finally {
      setGenerating(false)
    }
  }, [formData, addToast, loadData])

  const confirmRegenerate = useCallback(async () => {
    const cfg = regenConfig
    setRegenConfig(null)
    if (!cfg) return
    try {
      setGenerating(true)
      if (cfg.frequency) await generateRoteiro(cfg)
      else await generateScheduleFromConfig(cfg.id)
      addToast({ type: 'success', message: 'Roteiro refeito' })
      await loadData()
      setCalendarRefresh(p => p + 1)
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao refazer', description: err instanceof Error ? err.message : '' })
    } finally {
      setGenerating(false)
    }
  }, [regenConfig, addToast, loadData])

  const handleSaveEdit = useCallback(async (updated: { name: string; instructions: string }) => {
    if (!editingConfig) return
    try {
      await updateScheduleConfig(editingConfig.id, updated)
      addToast({ type: 'success', message: 'Roteiro atualizado' })
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
      addToast({ type: 'success', message: 'Roteiro excluído' })
      setDeletingConfig(null)
      await loadData()
      setCalendarRefresh(p => p + 1)
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao excluir', description: err instanceof Error ? err.message : '' })
    } finally {
      setDeleting(false)
    }
  }, [deletingConfig, addToast, loadData])

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-sm text-muted">Carregando cronograma…</div>
  }

  const freq = FREQUENCIES[formData.frequency]
  const preview = planCycles({
    categoryIds: categories.map(c => c.id),
    frequency: formData.frequency,
    startDate: formData.start_date,
    cycles: formData.cycles,
    workDays: formData.work_days
  })
  const active = configs[0]

  return (
    <div className="space-y-6">
      <ScheduleTabs />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Cronograma</h1>
          <p className="page-subtitle">Contagens cíclicas: cada categoria contada em rodízio, com responsável definido.</p>
        </div>
        {categories.length > 0 && (
          <div className="flex flex-shrink-0 gap-2">
            {active && (
              <button className="btn btn-secondary" onClick={() => setSharing(active)}>
                <FileText className="h-4 w-4" aria-hidden="true" /> Emitir roteiro
              </button>
            )}
            <button className="btn" onClick={() => setShowCreateForm(true)}>Gerar roteiro</button>
          </div>
        )}
      </div>

      {categories.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center">
          <p className="font-medium">Comece cadastrando as categorias</p>
          <p className="mt-1 text-sm text-zinc-500">Vestidos, calças, acessórios… Depois é só dizer quem cuida de cada uma e gerar o roteiro.</p>
          <Link to="/categorias" className="btn mt-5">Cadastrar categorias</Link>
        </div>
      )}

      {categories.length > 0 && sellers.length === 0 && (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          Para direcionar cada contagem a um vendedor, <Link to="/equipe" className="link">cadastre a equipe</Link>. Sem equipe, o roteiro vale para a loja toda.
        </p>
      )}

      {/* Calendário — visão principal */}
      <ScheduleCalendar refreshTrigger={calendarRefresh} />

      {/* Roteiros (gestão) — recolhido, pois é ocasional */}
      {configs.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold select-none">
            Roteiros <span className="text-muted">({configs.length})</span>
          </summary>
          <div className="mt-3 space-y-3">
            {configs.map(config => (
              <div key={config.id} className="rounded-xl border border-zinc-100 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium truncate">{config.name}</h4>
                      {config.is_active && <span className="badge badge-success">Ativo</span>}
                    </div>
                    <div className="text-sm text-muted mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                      <span>{config.frequency ? FREQUENCIES[config.frequency].label : `${config.sectors_per_week}/semana · ${config.total_weeks} sem.`}</span>
                      <span>{formatDate(config.start_date)}{config.end_date && ` – ${formatDate(config.end_date)}`}</span>
                      <span>{config.work_days.map(dayShort).join(', ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button className="rounded-lg px-3 min-h-9 text-sm text-zinc-600 hover:bg-zinc-100 transition" onClick={() => setSharing(config)}>Emitir</button>
                    <button className="rounded-lg px-3 min-h-9 text-sm text-zinc-600 hover:bg-zinc-100 transition" onClick={() => setRegenConfig(config)} disabled={generating}>Refazer</button>
                    <button className="rounded-lg px-3 min-h-9 text-sm text-zinc-600 hover:bg-zinc-100 transition" onClick={() => setEditingConfig(config)}>Editar</button>
                    <button className="rounded-lg px-3 min-h-9 text-sm text-danger hover:bg-danger/10 transition" onClick={() => setDeletingConfig(config)}>Excluir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Modal: gerar roteiro */}
      {showCreateForm && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 overflow-y-auto" onClick={() => setShowCreateForm(false)}>
          <form onSubmit={handleCreateAndGenerate} onClick={e => e.stopPropagation()}
            className="card w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Gerar roteiro de contagens</h3>
              <button type="button" onClick={() => setShowCreateForm(false)} aria-label="Fechar" className="text-zinc-500 hover:text-zinc-600 text-lg leading-none">✕</button>
            </div>

            <div>
              <label htmlFor="roteiro-nome" className="label">Nome</label>
              <input id="roteiro-nome" className="input" value={formData.name} placeholder="Ex.: Ciclo de outubro" autoFocus
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
            </div>

            <fieldset>
              <legend className="label">Cada categoria é contada</legend>
              <div className="grid grid-cols-3 gap-1.5" role="radiogroup">
                {(Object.keys(FREQUENCIES) as Frequency[]).map(key => {
                  const on = formData.frequency === key
                  return (
                    <button key={key} type="button" role="radio" aria-checked={on}
                      onClick={() => setFormData(p => ({ ...p, frequency: key, cycles: DEFAULT_CYCLES[key] }))}
                      className={`min-h-10 px-2 rounded-lg text-sm font-medium transition-colors ${
                        on ? 'bg-ink text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}>{FREQUENCIES[key].label}</button>
                  )
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="roteiro-inicio" className="label">Início</label>
                <input id="roteiro-inicio" type="date" className="input" value={formData.start_date}
                  onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} required />
              </div>
              <div>
                <label htmlFor="roteiro-ciclos" className="label">Duração ({freq.cycle === 'mês' ? 'meses' : `${freq.cycle}s`})</label>
                <input id="roteiro-ciclos" type="number" className="input" min={1} max={freq.maxCycles} value={formData.cycles}
                  onChange={e => setFormData(p => ({ ...p, cycles: Math.max(1, Math.min(freq.maxCycles, parseInt(e.target.value) || 1)) }))} />
              </div>
            </div>

            <div>
              <span className="label">Dias de contagem</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map(({ num, short }) => {
                  const on = formData.work_days.includes(num)
                  return (
                    <button key={num} type="button" aria-pressed={on} onClick={() => toggleWorkDay(num)}
                      className={`min-w-11 min-h-10 px-2 rounded-lg text-sm font-medium transition-colors ${
                        on ? 'bg-ink text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}>{short}</button>
                  )
                })}
              </div>
            </div>

            <div>
              <label htmlFor="roteiro-orientacoes" className="label">Orientações para a equipe</label>
              <textarea id="roteiro-orientacoes" className="input resize-none" rows={4} maxLength={2000} value={formData.instructions}
                onChange={e => setFormData(p => ({ ...p, instructions: e.target.value }))} />
              <p className="mt-1 text-xs text-zinc-500">Saem no documento do gerente, na folha de cada vendedor e no aviso do início.</p>
            </div>

            <p className="text-sm text-muted border-t border-zinc-100 pt-3">
              <span className="text-zinc-900 font-medium">{preview.length}</span> contagens
              <span className="mx-1">·</span>{categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}, {freq.every}
              {preview.length > 0 && <><span className="mx-1">·</span>até {formatDate(preview[preview.length - 1].date)}</>}
            </p>
            {configs.length > 0 && (
              <p className="text-xs text-zinc-500">
                As contagens ainda não feitas do roteiro atual, do início deste em diante, saem do calendário.
              </p>
            )}

            <button type="submit" className="btn w-full" disabled={generating || preview.length === 0}>
              {generating ? 'Gerando…' : 'Gerar roteiro'}
            </button>
          </form>
        </div>
      )}

      {sharing && <RoteiroShare config={sharing} onClose={() => setSharing(null)} />}

      {/* Modal: editar */}
      {editingConfig && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setEditingConfig(null)}>
          <form
            className="card w-full max-w-md space-y-4"
            onClick={e => e.stopPropagation()}
            onSubmit={e => { e.preventDefault(); const f = new FormData(e.target as HTMLFormElement); handleSaveEdit({ name: f.get('name') as string, instructions: f.get('instructions') as string }) }}
          >
            <h3 className="text-sm font-semibold">Editar roteiro</h3>
            <div>
              <label htmlFor="editar-nome" className="label">Nome</label>
              <input id="editar-nome" name="name" className="input" defaultValue={editingConfig.name} required />
            </div>
            <div>
              <label htmlFor="editar-orientacoes" className="label">Orientações para a equipe</label>
              <textarea id="editar-orientacoes" name="instructions" className="input resize-none" rows={4} maxLength={2000} defaultValue={editingConfig.instructions || ''} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingConfig(null)}>Cancelar</button>
              <button type="submit" className="btn">Salvar</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={!!regenConfig}
        title="Refazer o roteiro?"
        description={regenConfig ? `As contagens de "${regenConfig.name}" são programadas de novo com as categorias e os responsáveis de agora. O andamento já registrado neste roteiro é zerado.` : ''}
        confirmLabel="Refazer"
        onConfirm={confirmRegenerate}
        onCancel={() => setRegenConfig(null)}
      />

      <ConfirmDialog
        open={!!deletingConfig}
        title="Excluir roteiro?"
        description={deletingConfig ? `"${deletingConfig.name}" e todas as contagens programadas serão removidos. Esta ação não pode ser desfeita.` : ''}
        confirmLabel={deleting ? 'Excluindo…' : 'Excluir'}
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeletingConfig(null)}
      />
    </div>
  )
}
