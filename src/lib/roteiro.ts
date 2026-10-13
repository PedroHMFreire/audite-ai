/**
 * Roteiro de contagens cíclicas: distribuição das categorias pelos dias,
 * situação de cada contagem e o cumprimento por vendedor.
 *
 * Tudo aqui é cálculo puro, sem banco nem navegador. As datas são tratadas
 * como 'AAAA-MM-DD' de calendário (contas em UTC), então o fuso do aparelho
 * não desloca nada.
 */

export type Frequency = 'weekly' | 'biweekly' | 'monthly'

export const FREQUENCIES: Record<Frequency, { label: string; every: string; cycle: string; weeks: number; maxCycles: number }> = {
  weekly: { label: 'Semanal', every: 'toda semana', cycle: 'semana', weeks: 1, maxCycles: 26 },
  biweekly: { label: 'Quinzenal', every: 'a cada 15 dias', cycle: 'quinzena', weeks: 2, maxCycles: 26 },
  monthly: { label: 'Mensal', every: 'todo mês', cycle: 'mês', weeks: 4, maxCycles: 12 },
}

const DAY = 86_400_000

function toUTC(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** 1 = segunda … 7 = domingo. */
export function isoWeekDay(iso: string): number {
  return new Date(toUTC(iso)).getUTCDay() || 7
}

/** Mesmo dia `months` meses depois; dia 31 num mês de 30 vira o último dia. */
function addMonths(iso: string, months: number): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate()
  return Date.UTC(y, m - 1 + months, Math.min(d, lastDay))
}

function cycleStart(startDate: string, frequency: Frequency, cycle: number): number {
  if (frequency === 'monthly') return addMonths(startDate, cycle)
  return toUTC(startDate) + cycle * FREQUENCIES[frequency].weeks * 7 * DAY
}

export type PlannedCount = {
  categoryId: string
  date: string
  /** Ciclo a que pertence, começando em 1. */
  cycle: number
  /** Semana contada a partir da semana da data de início, começando em 1. */
  weekNumber: number
  dayOfWeek: number
}

/**
 * Monta o roteiro: em cada ciclo (semana, quinzena ou mês) toda categoria é
 * contada uma vez, e as contagens ficam espalhadas pelos dias de trabalho do
 * ciclo. A ordem das categorias se repete, então o intervalo entre duas
 * contagens da mesma categoria é sempre o mesmo.
 */
export function planCycles(opts: {
  categoryIds: string[]
  frequency: Frequency
  startDate: string
  cycles: number
  workDays: number[]
}): PlannedCount[] {
  const { categoryIds, frequency, startDate, cycles, workDays } = opts
  if (categoryIds.length === 0 || workDays.length === 0) return []

  const start = toUTC(startDate)
  const firstMonday = start - (isoWeekDay(startDate) - 1) * DAY
  const plan: PlannedCount[] = []

  for (let c = 0; c < cycles; c++) {
    const from = cycleStart(startDate, frequency, c)
    const to = cycleStart(startDate, frequency, c + 1)
    const dates: string[] = []
    for (let t = from; t < to; t += DAY) {
      const iso = fromUTC(t)
      if (workDays.includes(isoWeekDay(iso))) dates.push(iso)
    }
    if (dates.length === 0) continue

    categoryIds.forEach((categoryId, i) => {
      const date = dates[Math.floor((i * dates.length) / categoryIds.length)]
      plan.push({
        categoryId,
        date,
        cycle: c + 1,
        weekNumber: Math.floor((toUTC(date) - firstMonday) / (7 * DAY)) + 1,
        dayOfWeek: isoWeekDay(date),
      })
    })
  }
  return plan
}

/**
 * Valores para as colunas antigas do cronograma (categorias por semana e
 * total de semanas), que o banco ainda exige dentro de 1–10 e 1–52.
 */
export function legacyShape(frequency: Frequency, cycles: number, categoryCount: number) {
  const weeks = FREQUENCIES[frequency].weeks
  return {
    sectors_per_week: Math.min(10, Math.max(1, Math.ceil(categoryCount / weeks))),
    total_weeks: Math.min(52, Math.max(1, cycles * weeks)),
  }
}

// ===== Situação e cumprimento =====

export type TrackedItem = {
  scheduled_date: string
  status: string
  /** Feita: marcada como concluída ou com contagem finalizada. */
  done: boolean
  /** Dia em que foi feita ('AAAA-MM-DD'), quando se sabe. */
  doneOn: string | null
  /** Responsáveis; vazio = toda a equipe. */
  sellerIds: string[]
}

export type ItemState = 'feita' | 'pulada' | 'atrasada' | 'hoje' | 'pendente'

export function itemState(item: Pick<TrackedItem, 'scheduled_date' | 'status' | 'done'>, today: string): ItemState {
  if (item.done) return 'feita'
  if (item.status === 'skipped') return 'pulada'
  if (item.scheduled_date < today) return 'atrasada'
  if (item.scheduled_date === today) return 'hoje'
  return 'pendente'
}

export const STATE_LABEL: Record<ItemState, string> = {
  feita: 'Feita',
  pulada: 'Pulada',
  atrasada: 'Atrasada',
  hoje: 'Hoje',
  pendente: 'A fazer',
}

export type Progress = {
  total: number
  done: number
  /** Feitas depois do dia programado. */
  doneLate: number
  late: number
  pending: number
  skipped: number
  /** Feitas ÷ (feitas + atrasadas), de 0 a 100; null quando ainda nada venceu. */
  rate: number | null
}

export function progressOf(items: TrackedItem[], today: string): Progress {
  const p: Progress = { total: items.length, done: 0, doneLate: 0, late: 0, pending: 0, skipped: 0, rate: null }
  for (const item of items) {
    const state = itemState(item, today)
    if (state === 'feita') {
      p.done++
      if (item.doneOn && item.doneOn > item.scheduled_date) p.doneLate++
    } else if (state === 'pulada') p.skipped++
    else if (state === 'atrasada') p.late++
    else p.pending++
  }
  const due = p.done + p.late
  p.rate = due === 0 ? null : Math.round((p.done / due) * 100)
  return p
}

/** Chave da linha "Toda a equipe" no acompanhamento. */
export const TEAM = 'equipe'

/**
 * Cumprimento por responsável. Uma contagem de dois vendedores entra na conta
 * dos dois; as sem responsável definido ficam em "Toda a equipe".
 */
export function progressBySeller<T extends TrackedItem>(items: T[], today: string): Map<string, Progress> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    for (const key of item.sellerIds.length ? item.sellerIds : [TEAM]) {
      const list = groups.get(key) || []
      list.push(item)
      groups.set(key, list)
    }
  }
  return new Map([...groups].map(([key, list]) => [key, progressOf(list, today)]))
}

/** "Ana", "Ana e Bia", "Ana, Bia e Caio"; vazio = "Toda a equipe". */
export function namesLabel(names: string[]): string {
  if (names.length === 0) return 'Toda a equipe'
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

const WEEKDAY_SHORT = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

/** '2026-10-14' → 'qua 14/10'. */
export function shortDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${WEEKDAY_SHORT[isoWeekDay(iso) - 1]} ${d}/${m}`
}

/** Texto do roteiro de um vendedor, para colar no WhatsApp. */
export function roteiroMessage(opts: {
  sellerName: string
  storeName?: string | null
  instructions?: string | null
  items: { date: string; category: string; partners: string[] }[]
}): string {
  const lines = [`Olá, ${opts.sellerName}! Este é o seu roteiro de contagens${opts.storeName ? ` da ${opts.storeName}` : ''}:`, '']
  for (const item of opts.items) {
    const withWhom = item.partners.length ? ` (com ${namesLabel(item.partners)})` : ''
    lines.push(`• ${shortDate(item.date)} — ${item.category}${withWhom}`)
  }
  if (opts.instructions?.trim()) lines.push('', 'Orientações:', opts.instructions.trim())
  return lines.join('\n')
}

/** Só dígitos, com o 55 do Brasil na frente; null se não parece um telefone. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.length <= 11 ? `55${digits}` : digits
}
