/**
 * Leitura das planilhas enviadas pelo lojista (estoque e catálogo).
 * Aceita .xlsx e .csv. Tudo roda no navegador; o arquivo não é enviado
 * a servidor nenhum, só as linhas já lidas.
 */

export type PlanRow = { codigo: string; nome: string; saldo: number }
export type CatalogRow = { codigo: string; nome: string }

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_ROWS = 50_000

export class SpreadsheetError extends Error {}

/** Lê o arquivo e devolve as linhas como texto, sem interpretar colunas. */
export async function readSpreadsheet(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.xlsx') && !name.endsWith('.csv')) {
    throw new SpreadsheetError('Formato não aceito. Envie um arquivo .xlsx ou .csv.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new SpreadsheetError('Arquivo muito grande. O limite é 10 MB.')
  }

  let rows: string[][]
  if (name.endsWith('.csv')) {
    rows = parseCsv(await file.text())
  } else {
    try {
      const { Workbook } = await import('exceljs')
      const workbook = new Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const sheet = workbook.worksheets[0]
      rows = []
      sheet?.eachRow((row) => {
        const cells: string[] = []
        // cell.text resolve fórmulas, texto formatado e números sem virar "[object Object]"
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cells[col - 1] = String(cell.text ?? '').trim()
        })
        rows.push(Array.from(cells, (c) => c ?? ''))
      })
    } catch {
      throw new SpreadsheetError('Não foi possível ler a planilha. Confira se o arquivo é um Excel (.xlsx) válido.')
    }
  }

  rows = rows.filter((r) => r.some((c) => c !== ''))
  if (rows.length > MAX_ROWS + 1) {
    throw new SpreadsheetError(`A planilha tem linhas demais. O limite é ${MAX_ROWS.toLocaleString('pt-BR')} produtos.`)
  }
  return rows
}

export function parseCsv(text: string): string[][] {
  // Remove o BOM que o Excel coloca em CSVs UTF-8.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const delimiter = detectDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && inQuotes && next === '"') { field += '"'; i++; continue }
    if (char === '"') { inQuotes = !inQuotes; continue }
    if (char === delimiter && !inQuotes) { row.push(field.trim()); field = ''; continue }
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

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const count = (d: string) => firstLine.split(d).length
  if (count('\t') > count(';') && count('\t') > count(',')) return '\t'
  return count(';') > count(',') ? ';' : ','
}

/**
 * Interpreta uma quantidade nos formatos que os sistemas de loja exportam:
 * "3", "3,00", "3.00", "1.234", "1.234,00", "-2". Devolve um inteiro.
 */
export function parseQuantity(raw: string): number {
  let s = String(raw ?? '').replace(/\s/g, '')
  if (!s) return 0
  const negative = s.startsWith('-') || /^\(.*\)$/.test(s)
  s = s.replace(/[^\d.,]/g, '')
  if (!s) return 0

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let normalized: string
  if (lastComma !== -1 && lastDot !== -1) {
    // Os dois aparecem: o último é o separador decimal.
    const decimal = lastComma > lastDot ? ',' : '.'
    const thousands = decimal === ',' ? '.' : ','
    normalized = s.split(thousands).join('').replace(decimal, '.')
  } else if (lastComma !== -1) {
    // Só vírgula: decimal no padrão brasileiro ("3,00"); milhar se vier "1,234".
    normalized = /^\d{1,3}(,\d{3})+$/.test(s) ? s.split(',').join('') : s.replace(',', '.')
  } else if (lastDot !== -1) {
    // Só ponto: milhar no padrão brasileiro ("1.234"); senão decimal ("3.00").
    normalized = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.split('.').join('') : s
  } else {
    normalized = s
  }

  const n = Math.round(Number(normalized))
  if (!Number.isFinite(n)) return 0
  return negative ? -n : n
}

const HEADER_WORDS = /c[oó]d|sku|refer|ean|barras|produto|descri|nome|item|saldo|estoque|qtd|quant/i

/** A primeira linha é cabeçalho quando parece texto de título, não um produto. */
function looksLikeHeader(row: string[], quantityCol: number | null): boolean {
  if (!row.length) return false
  const first = row[0] || ''
  if (quantityCol !== null) {
    const q = row[quantityCol] || ''
    if (q && /\d/.test(q) && !/[a-zA-ZÀ-ÿ]/.test(q)) return false
    return true
  }
  return HEADER_WORDS.test(first) || HEADER_WORDS.test(row[1] || '')
}

/** Planilha de estoque: código | nome | saldo. */
export function toPlanRows(rows: string[][]): PlanRow[] {
  const start = rows.length && looksLikeHeader(rows[0], 2) ? 1 : 0
  const byCode = new Map<string, PlanRow>()
  for (let i = start; i < rows.length; i++) {
    const row = rows[i]
    const codigo = (row[0] || '').trim()
    if (!codigo) continue
    const nome = (row[1] || '').trim()
    const saldo = Math.max(0, parseQuantity(row[2] || '0'))
    // Código repetido na planilha: soma os saldos (mesma peça em mais de uma linha).
    const prev = byCode.get(codigo)
    if (prev) prev.saldo += saldo
    else byCode.set(codigo, { codigo, nome, saldo })
  }
  return [...byCode.values()]
}

/** Catálogo: código | nome. */
export function toCatalogRows(rows: string[][]): CatalogRow[] {
  const start = rows.length && looksLikeHeader(rows[0], null) ? 1 : 0
  const out: CatalogRow[] = []
  for (let i = start; i < rows.length; i++) {
    const codigo = (rows[i][0] || '').trim()
    if (codigo) out.push({ codigo, nome: (rows[i][1] || '').trim() })
  }
  return out
}
