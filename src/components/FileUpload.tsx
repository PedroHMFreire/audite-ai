import ExcelJS from 'exceljs'

type Item = { codigo: string; nome: string; saldo: number }

export default function FileUpload({ onParsed }: { onParsed: (rows: Item[]) => void }) {
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.csv')) {
      alert('Formato invalido. Envie um arquivo .xlsx ou .csv')
      return
    }

    try {
      if (fileName.endsWith('.csv')) {
        const text = await file.text()
        onParsed(parseRows(text.split(/\r?\n/).map((line) => line.split(','))))
        return
      }

      const arrayBuffer = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(arrayBuffer)

      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        onParsed([])
        return
      }

      const rawRows: string[][] = []
      worksheet.eachRow((row) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : []
        rawRows.push(values.map((value) => String(value ?? '').trim()))
      })

      onParsed(parseRows(rawRows))
    } catch {
      alert('Nao foi possivel processar a planilha. Verifique o formato do arquivo.')
    }
  }

  function parseRows(rawRows: string[][]): Item[] {
    const rows: Item[] = []
    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i]
      if (!row || row.length < 3) continue
      const codigo = String(row[0] ?? '').trim()
      const nome = String(row[1] ?? '').trim()
      const saldo = parseInt(String(row[2] ?? '0').replace(/[^\d-]/g, ''), 10) || 0
      if (codigo) rows.push({ codigo, nome, saldo })
    }
    return rows
  }

  return (
    <label className="block">
      <div className="space-y-1">
        <span className="text-sm font-medium">Carregar planilha</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 block">Formato: .xlsx ou .csv (código | nome | saldo)</span>
      </div>
      <input type="file" accept=".xlsx,.csv" onChange={handleFile} className="mt-3 block w-full text-sm file:btn file:py-2 file:px-3 file:mr-3 file:border-0 file:rounded-xl" />
    </label>
  )
}
