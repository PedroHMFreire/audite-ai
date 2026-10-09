import { useEffect, useRef, useState } from 'react'
import { Plus, ScanBarcode } from 'lucide-react'

/**
 * Barra de inserção de itens da contagem, fixa no rodapé.
 * - "Bipar com a câmera" é a ação principal: abre o bipe em sequência.
 * - Campo manual sem autocorreção: códigos não devem ser "corrigidos".
 * - Alvos de toque amplos, para usar no estoque com uma mão.
 */
export default function ManualEntry({
  onAdd,
  onScan
}: {
  onAdd: (codigo: string, qty?: number) => void
  onScan: () => void
}) {
  const [code, setCode] = useState('')
  const [qty, setQty] = useState<number | ''>('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // No computador o foco vai direto ao campo (leitor USB digita como teclado).
    // No celular não, para o teclado não cobrir a tela ao abrir a contagem.
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus()
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const c = code.trim()
    if (!c) return
    const q = Math.max(1, Number(qty) || 1)
    onAdd(c, q)
    setCode('')
    setQty('')
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={onScan} className="btn btn-lg w-full">
        <ScanBarcode className="h-5 w-5" aria-hidden="true" />
        Bipar com a câmera
      </button>

      <form onSubmit={submit} className="flex items-stretch gap-2">
        <input
          ref={inputRef}
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="ou digite o código"
          className="input min-h-12 min-w-0 flex-1 font-mono"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-label="Código do produto"
        />
        <input
          value={qty}
          onChange={e => {
            const value = e.target.value.replace(/\D/g, '')
            if (value === '') return setQty('')
            setQty(Math.min(999999, Math.max(1, Number(value))))
          }}
          placeholder="Qtd"
          inputMode="numeric"
          className="input min-h-12 w-16 flex-shrink-0 px-1 text-center"
          aria-label="Quantidade"
        />
        <button className="btn btn-secondary min-h-12 flex-shrink-0 px-3" type="submit" aria-label="Adicionar">
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
