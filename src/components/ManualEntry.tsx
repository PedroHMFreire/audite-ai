import { useEffect, useRef, useState } from 'react'

export default function ManualEntry({ onAdd }: { onAdd: (codigo: string, qty?: number) => void }) {
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
    const q = Number(qty) || 1
    onAdd(c, q)
    setCode('')
    setQty('')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-3 gap-2 items-center">
      <input
        ref={inputRef}
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="Código"
        className="input col-span-2"
      />
      <input
        value={qty}
        onChange={e => setQty(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
        placeholder="Qtd (opcional)"
        inputMode="numeric"
        className="input"
      />
      <button className="btn col-span-3" type="submit">Adicionar</button>
    </form>
  )
}
