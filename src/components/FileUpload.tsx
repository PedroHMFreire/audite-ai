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
        onParsed(parseRows(parseCsv(text)))
        return
      }

      const arrayBuffer = await file.arrayBuffer()
      const { Workbook } = await import('exceljs')
      const workbook = new Workbook()
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

  function parseCsv(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let field = ''
    let inQuotes = false
    const delimiter = detectDelimiter(text)

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const next = text[i + 1]

      if (char === '"' && inQuotes && next === '"') {
        field += '"'
        i++
        continue
      }

      if (char === '"') {
        inQuotes = !inQuotes
        continue
      }

      if (char === delimiter && !inQuotes) {
        row.push(field.trim())
        field = ''
        continue
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') i++
        row.push(field.trim())
        if (row.some(Boolean)) rows.push(row)
        row = []
        field = ''
        continue
      }

      field += char
    }

    row.push(field.trim())
    if (row.some(Boolean)) rows.push(row)
    return rows
  }

  function detectDelimiter(text: string) {
    const firstLine = text.split(/\r?\n/, 1)[0] || ''
    return firstLine.split(';').length > firstLine.split(',').length ? ';' : ','
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
