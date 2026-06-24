import { useEffect, useRef, useState } from 'react'

/**
 * Barra de inserção de itens da contagem.
 * - Botão grande de "Escanear" (câmera) como ação primária.
 * - Campo manual com teclado sem autocorreção (códigos não devem ser "corrigidos").
 * - Alvos de toque amplos para uso no estoque, com uma mão.
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
    inputRef.current?.focus()
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
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={onScan}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold min-h-14 text-base active:scale-[.99] transition shadow-sm"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M7 12h10" />
        </svg>
        Escanear código
      </button>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-[11px] uppercase tracking-wide text-zinc-400">ou digite</span>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form onSubmit={submit} className="flex items-stretch gap-2">
        <input
          ref={inputRef}
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Código do produto"
          className="input flex-1 min-h-12 font-mono"
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
            const value = e.target.value
            if (value === '') return setQty('')
            const n = Number(value)
            if (Number.isFinite(n)) setQty(Math.max(1, n))
          }}
          placeholder="Qtd"
          inputMode="numeric"
          className="input w-16 min-h-12 text-center"
          aria-label="Quantidade"
        />
        <button className="btn min-h-12 px-5" type="submit" aria-label="Adicionar item">
          +
        </button>
      </form>
    </div>
  )
}
