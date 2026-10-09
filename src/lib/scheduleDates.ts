/**
 * Datas do cronograma, sempre no fuso do aparelho.
 *
 * `new Date('2026-10-12')` é meia-noite em UTC, o que no Brasil cai no dia
 * anterior; e `toISOString()` converte de volta para UTC. Misturar os dois
 * deslocava o cronograma inteiro. Aqui tudo é feito com data local.
 */

/** 'AAAA-MM-DD' → Date ao meio-dia local (imune a horário de verão). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

/** Date → 'AAAA-MM-DD' no fuso local. */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Data do dia da semana pedido (1 = segunda … 7 = domingo) na semana que
 * fica `weekOffset` semanas depois da semana de `startDate`.
 */
export function dateForWeekDay(startDate: Date, weekOffset: number, dayOfWeek: number): Date {
  const target = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0)
  target.setDate(target.getDate() + weekOffset * 7)
  const current = target.getDay() // 0 = domingo
  const toMonday = current === 0 ? -6 : 1 - current
  target.setDate(target.getDate() + toMonday + (dayOfWeek - 1))
  return target
}
