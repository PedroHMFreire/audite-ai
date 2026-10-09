// Leitura das planilhas do lojista.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, parseQuantity, toCatalogRows, toPlanRows } from '../src/lib/spreadsheet.ts'
import { dateForWeekDay, parseLocalDate, toLocalISODate } from '../src/lib/scheduleDates.ts'

test('quantidades nos formatos que os sistemas exportam', () => {
  const cases = { '3': 3, '3,00': 3, '3.00': 3, '1.234': 1234, '1.234,00': 1234, '1,234.00': 1234, ' 12 ': 12, '': 0, 'abc': 0, '2,5': 3, '-4': -4, '10 un': 10 }
  for (const [input, expected] of Object.entries(cases)) assert.equal(parseQuantity(input), expected, `"${input}"`)
})

test('CSV com ponto e vírgula, aspas, BOM e quebras do Windows', () => {
  const rows = parseCsv('﻿codigo;nome;saldo\r\n"A-1";"Vestido ""midi""; linho";3\r\n\r\nB2;Calça;1,00\r\n')
  assert.deepEqual(rows, [['codigo', 'nome', 'saldo'], ['A-1', 'Vestido "midi"; linho', '3'], ['B2', 'Calça', '1,00']])
})

test('CSV com vírgula e com tabulação', () => {
  assert.deepEqual(parseCsv('a,b,c\n1,2,3'), [['a', 'b', 'c'], ['1', '2', '3']])
  assert.deepEqual(parseCsv('a\tb\tc\n1\t2\t3'), [['a', 'b', 'c'], ['1', '2', '3']])
})

test('planilha de estoque: pula cabeçalho, soma códigos repetidos, ignora linhas sem código', () => {
  const rows = toPlanRows([
    ['Código', 'Produto', 'Saldo'],
    ['7891', 'Vestido', '3,00'],
    ['', 'sem código', '9'],
    ['7891', 'Vestido', '2'],
    ['VEST.001/P', 'Blusa', '1.000'],
    ['X', 'Negativo vira zero', '-2'],
  ])
  assert.deepEqual(rows, [
    { codigo: '7891', nome: 'Vestido', saldo: 5 },
    { codigo: 'VEST.001/P', nome: 'Blusa', saldo: 1000 },
    { codigo: 'X', nome: 'Negativo vira zero', saldo: 0 },
  ])
})

test('planilha sem cabeçalho não perde a primeira linha', () => {
  assert.deepEqual(toPlanRows([['7891', 'Vestido', '3'], ['7892', 'Saia', '0']]).length, 2)
})

test('planilha com menos de três colunas ainda é lida (saldo zero)', () => {
  assert.deepEqual(toPlanRows([['7891', 'Vestido']]), [{ codigo: '7891', nome: 'Vestido', saldo: 0 }])
})

test('catálogo: detecta cabeçalho', () => {
  assert.deepEqual(toCatalogRows([['codigo', 'nome'], ['1', 'A']]), [{ codigo: '1', nome: 'A' }])
  assert.deepEqual(toCatalogRows([['1', 'A'], ['2', '']]), [{ codigo: '1', nome: 'A' }, { codigo: '2', nome: '' }])
})

test('datas do cronograma não escorregam de dia no fuso do Brasil', () => {
  // Segunda, 12/10/2026
  const start = parseLocalDate('2026-10-12')
  assert.equal(toLocalISODate(start), '2026-10-12')
  assert.equal(toLocalISODate(dateForWeekDay(start, 0, 1)), '2026-10-12') // segunda da mesma semana
  assert.equal(toLocalISODate(dateForWeekDay(start, 0, 5)), '2026-10-16') // sexta
  assert.equal(toLocalISODate(dateForWeekDay(start, 0, 7)), '2026-10-18') // domingo
  assert.equal(toLocalISODate(dateForWeekDay(start, 2, 3)), '2026-10-28') // quarta, duas semanas depois
  // Início numa quinta: a semana é a que contém a data
  assert.equal(toLocalISODate(dateForWeekDay(parseLocalDate('2026-10-15'), 0, 1)), '2026-10-12')
  // Início num domingo pertence à semana que termina nele
  assert.equal(toLocalISODate(dateForWeekDay(parseLocalDate('2026-10-18'), 0, 1)), '2026-10-12')
})
