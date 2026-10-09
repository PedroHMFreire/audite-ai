// Bipe pela câmera: quando uma leitura conta como peça nova.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createScanGate } from '../src/lib/scanGate.ts'

test('etiqueta parada na frente da câmera conta uma vez só', () => {
  const gate = createScanGate(700)
  assert.equal(gate.accept('7891', 0), '7891')
  for (let t = 30; t <= 5000; t += 30) assert.equal(gate.accept('7891', t), null, `t=${t}`)
})

test('mesmo código conta de novo depois de sair do quadro', () => {
  const gate = createScanGate(700)
  assert.equal(gate.accept('7891', 0), '7891')
  assert.equal(gate.accept('7891', 300), null)
  assert.equal(gate.accept('7891', 999), null, 'sumiu por menos de 700 ms')
  assert.equal(gate.accept('7891', 1700), '7891', 'sumiu por 701 ms')
})

test('código diferente conta na hora; dois códigos no quadro não se multiplicam', () => {
  const gate = createScanGate(700)
  assert.equal(gate.accept('A', 0), 'A')
  assert.equal(gate.accept('B', 30), 'B')
  for (let t = 60; t <= 3000; t += 30) assert.equal(gate.accept(t % 60 ? 'A' : 'B', t), null, `t=${t}`)
})

test('ignora leitura vazia e apara espaços', () => {
  const gate = createScanGate(700)
  assert.equal(gate.accept('   ', 0), null)
  assert.equal(gate.accept(' 400 ', 10), '400')
  assert.equal(gate.accept('400', 20), null)
})
