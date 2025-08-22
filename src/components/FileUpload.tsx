import * as XLSX from 'xlsx'

type Item = { codigo: string; nome: string; saldo: number }

export default function FileUpload({ onParsed }: { onParsed: (rows: Item[]) => void }) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<any>(ws, { header: 1 })
      // Expect headers: codigo | nome | saldo
      const rows: Item[] = []
      for (let i = 1; i < json.length; i++) {
        const row = json[i]
        if (!row || row.length < 3) continue
        const codigo = String(row[0] ?? '').trim()
        const nome = String(row[1] ?? '').trim()
        const saldo = parseInt(String(row[2] ?? '0').replace(/\D/g, ''), 10) || 0
        if (codigo) rows.push({ codigo, nome, saldo })
      }
      onParsed(rows)
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <label className="block">
      <span className="text-sm">Planilha (.xlsx ou .csv com colunas: código | nome | saldo)</span>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="mt-2 block w-full text-sm file:btn file:py-2 file:px-3 file:mr-3 file:border-0 file:rounded-xl"/>
    </label>
  )
}
