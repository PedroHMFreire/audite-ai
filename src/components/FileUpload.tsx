import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { readSpreadsheet, toPlanRows, type PlanRow } from '@/lib/spreadsheet'

export default function FileUpload({ onParsed }: { onParsed: (rows: PlanRow[]) => void | Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reenviar o mesmo arquivo depois de corrigir
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const rows = toPlanRows(await readSpreadsheet(file))
      if (rows.length === 0) {
        setError('Não encontramos produtos no arquivo. As colunas devem ser, nesta ordem: código, nome e saldo.')
        return
      }
      await onParsed(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler a planilha.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept=".xlsx,.csv" onChange={handleFile} className="sr-only" id="planilha-estoque" />
      <label
        htmlFor="planilha-estoque"
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-100 ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        <Upload className="h-5 w-5 text-zinc-500" aria-hidden="true" />
        <span className="text-sm font-medium">{busy ? 'Lendo planilha…' : 'Escolher planilha do estoque'}</span>
        <span className="text-xs text-zinc-500">Excel (.xlsx) ou CSV, com as colunas código, nome e saldo</span>
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
