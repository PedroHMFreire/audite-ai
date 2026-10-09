/**
 * Decide quando uma leitura da câmera vale como um bipe novo.
 *
 * A câmera lê o mesmo código dezenas de vezes por segundo enquanto a etiqueta
 * está na frente dela. Um bipe só conta de novo depois que o código some do
 * quadro por `absentMs` — assim segurar o celular parado numa etiqueta não
 * soma peças, e passar por duas etiquetas iguais em sequência soma as duas.
 */
export type ScanGate = {
  /** Devolve o código se for um bipe novo; `null` se for a mesma etiqueta ainda no quadro. */
  accept: (raw: string, now: number) => string | null
}

export function createScanGate(absentMs = 700): ScanGate {
  const lastSeen = new Map<string, number>()
  return {
    accept(raw, now) {
      const code = String(raw || '').trim()
      if (!code) return null
      const seenAt = lastSeen.get(code)
      lastSeen.set(code, now)
      return seenAt !== undefined && now - seenAt < absentMs ? null : code
    }
  }
}
