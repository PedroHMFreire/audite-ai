// Roteiro de contagens cíclicas: distribuição, situação e cumprimento.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  planCycles, legacyShape, itemState, progressOf, progressBySeller, namesLabel, roteiroMessage, whatsappNumber, TEAM,
} from '../src/lib/roteiro.ts'

const cats = ['a', 'b', 'c', 'd']
const weekdays = [1, 2, 3, 4, 5]

test('semanal: toda categoria uma vez por semana, espalhada nos dias de trabalho', () => {
  // Segunda, 12/10/2026
  const plan = planCycles({ categoryIds: cats, frequency: 'weekly', startDate: '2026-10-12', cycles: 2, workDays: weekdays })
  assert.equal(plan.length, 8)
  assert.deepEqual(plan.slice(0, 4).map((p) => p.date), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'])
  assert.deepEqual(plan.slice(4).map((p) => p.date), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'])
  for (const p of plan) {
    assert.equal(new Date(p.date + 'T12:00:00Z').getUTCDay() || 7, p.dayOfWeek)
    assert.ok(weekdays.includes(p.dayOfWeek))
  }
  assert.deepEqual(plan.map((p) => p.weekNumber), [1, 1, 1, 1, 2, 2, 2, 2])
  // Cada categoria aparece uma vez em cada ciclo, sempre com 7 dias de intervalo.
  for (const id of cats) {
    const mine = plan.filter((p) => p.categoryId === id)
    assert.deepEqual(mine.map((p) => p.cycle), [1, 2])
    assert.equal((Date.parse(mine[1].date) - Date.parse(mine[0].date)) / 86_400_000, 7)
  }
})

test('quinzenal: poucas categorias ficam espaçadas dentro dos 15 dias', () => {
  const plan = planCycles({ categoryIds: ['a', 'b'], frequency: 'biweekly', startDate: '2026-10-12', cycles: 1, workDays: weekdays })
  assert.deepEqual(plan.map((p) => p.date), ['2026-10-12', '2026-10-19'])
  assert.deepEqual(plan.map((p) => p.weekNumber), [1, 2])
})

test('mensal: segue o mês do calendário e não passa do último dia', () => {
  const plan = planCycles({ categoryIds: ['a'], frequency: 'monthly', startDate: '2027-01-31', cycles: 3, workDays: [1, 2, 3, 4, 5, 6, 7] })
  assert.deepEqual(plan.map((p) => p.date), ['2027-01-31', '2027-02-28', '2027-03-31'])
})

test('mais categorias que dias: divide sem deixar nenhuma de fora', () => {
  const ids = Array.from({ length: 7 }, (_, i) => `c${i}`)
  const plan = planCycles({ categoryIds: ids, frequency: 'weekly', startDate: '2026-10-12', cycles: 1, workDays: [1, 3] })
  assert.equal(plan.length, 7)
  assert.deepEqual([...new Set(plan.map((p) => p.date))], ['2026-10-12', '2026-10-14'])
})

test('início no meio da semana: o ciclo começa na data escolhida', () => {
  // Quinta, 15/10/2026
  const plan = planCycles({ categoryIds: cats, frequency: 'weekly', startDate: '2026-10-15', cycles: 1, workDays: weekdays })
  assert.ok(plan.every((p) => p.date >= '2026-10-15' && p.date < '2026-10-22'))
  assert.deepEqual(plan.map((p) => p.weekNumber), [1, 1, 2, 2])
})

test('sem categorias ou sem dias não gera nada', () => {
  assert.deepEqual(planCycles({ categoryIds: [], frequency: 'weekly', startDate: '2026-10-12', cycles: 4, workDays: weekdays }), [])
  assert.deepEqual(planCycles({ categoryIds: cats, frequency: 'weekly', startDate: '2026-10-12', cycles: 4, workDays: [] }), [])
})

test('colunas antigas ficam dentro do que o banco aceita', () => {
  assert.deepEqual(legacyShape('weekly', 4, 4), { sectors_per_week: 4, total_weeks: 4 })
  assert.deepEqual(legacyShape('monthly', 12, 3), { sectors_per_week: 1, total_weeks: 48 })
  assert.deepEqual(legacyShape('biweekly', 26, 40), { sectors_per_week: 10, total_weeks: 52 })
})

const item = (scheduled_date, extra = {}) => ({ scheduled_date, status: 'pending', done: false, doneOn: null, sellerIds: [], ...extra })

test('situação de cada contagem', () => {
  const today = '2026-10-14'
  assert.equal(itemState(item('2026-10-13'), today), 'atrasada')
  assert.equal(itemState(item('2026-10-14'), today), 'hoje')
  assert.equal(itemState(item('2026-10-15'), today), 'pendente')
  assert.equal(itemState(item('2026-10-13', { status: 'skipped' }), today), 'pulada')
  assert.equal(itemState(item('2026-10-13', { done: true }), today), 'feita')
})

test('cumprimento: só conta o que já venceu; pulada não pesa', () => {
  const today = '2026-10-14'
  const p = progressOf([
    item('2026-10-12', { done: true, doneOn: '2026-10-12' }),
    item('2026-10-12', { done: true, doneOn: '2026-10-13' }),
    item('2026-10-13'),
    item('2026-10-13', { status: 'skipped' }),
    item('2026-10-20'),
  ], today)
  assert.deepEqual(p, { total: 5, done: 2, doneLate: 1, late: 1, pending: 1, skipped: 1, rate: 67 })
  assert.equal(progressOf([item('2026-10-20')], today).rate, null)
})

test('cumprimento por vendedor: contagem em dupla vale para os dois', () => {
  const today = '2026-10-14'
  const by = progressBySeller([
    item('2026-10-12', { done: true, sellerIds: ['ana', 'bia'] }),
    item('2026-10-13', { sellerIds: ['ana'] }),
    item('2026-10-13', { done: true }),
  ], today)
  assert.equal(by.get('ana').total, 2)
  assert.equal(by.get('ana').rate, 50)
  assert.equal(by.get('bia').rate, 100)
  assert.equal(by.get(TEAM).done, 1)
})

test('nomes e mensagem do vendedor', () => {
  assert.equal(namesLabel([]), 'Toda a equipe')
  assert.equal(namesLabel(['Ana', 'Bia', 'Caio']), 'Ana, Bia e Caio')
  const text = roteiroMessage({
    sellerName: 'Ana', storeName: 'Loja A', instructions: ' Conte antes de abrir. ',
    items: [{ date: '2026-10-14', category: 'Vestidos', partners: ['Bia'] }, { date: '2026-10-21', category: 'Saias', partners: [] }],
  })
  assert.equal(text, [
    'Olá, Ana! Este é o seu roteiro de contagens da Loja A:', '',
    '• qua 14/10 — Vestidos (com Bia)', '• qua 21/10 — Saias', '',
    'Orientações:', 'Conte antes de abrir.',
  ].join('\n'))
})

test('telefone para o WhatsApp', () => {
  assert.equal(whatsappNumber('(11) 98765-4321'), '5511987654321')
  assert.equal(whatsappNumber('+55 11 98765-4321'), '5511987654321')
  assert.equal(whatsappNumber('1234'), null)
  assert.equal(whatsappNumber(null), null)
})
