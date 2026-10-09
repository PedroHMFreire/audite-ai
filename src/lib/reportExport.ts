import type { DivergenceJustification, Result } from './db'
import { MOTIVO_LABELS } from './db'

export type ReportData = {
  countName: string
  storeName?: string | null
  date: string
  results: Result[]
  names?: Map<string, string>
  justifications?: Map<string, DivergenceJustification>
}

const STATUS_LABEL: Record<Result['status'], string> = { falta: 'Falta', excesso: 'Sobra', regular: 'Certo' }
const ORDER: Result['status'][] = ['falta', 'excesso', 'regular']

function justificativa(d: ReportData, codigo: string): string {
  const j = d.justifications?.get(codigo)
  if (!j) return ''
  const label = MOTIVO_LABELS[j.motivo]
  return j.observacao ? `${label}: ${j.observacao}` : label
}

export function fileSlug(name: string): string {
  return (name || 'contagem')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'contagem'
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** Relatório em Excel: uma aba de resumo e uma com todos os produtos. */
export async function generateReportXlsx(d: ReportData): Promise<Blob> {
  const { Workbook } = await import('exceljs')
  const wb = new Workbook()
  wb.creator = 'Audite'
  wb.created = new Date()

  const count = (s: Result['status']) => d.results.filter((r) => r.status === s).length
  const units = (s: Result['status']) =>
    d.results.filter((r) => r.status === s).reduce((a, r) => a + Math.abs((r.manual_qtd || 0) - (r.saldo_qtd || 0)), 0)

  const resumo = wb.addWorksheet('Resumo')
  resumo.columns = [{ width: 28 }, { width: 36 }]
  resumo.addRows([
    ['Contagem', d.countName],
    ...(d.storeName ? [['Loja', d.storeName]] : []),
    ['Data', d.date],
    [],
    ['Produtos conferidos', d.results.length],
    ['Certos', count('regular')],
    ['Com falta', count('falta')],
    ['Peças faltando', units('falta')],
    ['Com sobra', count('excesso')],
    ['Peças sobrando', units('excesso')],
  ])
  resumo.getColumn(1).font = { bold: true }
  resumo.getColumn(2).alignment = { horizontal: 'left' }

  const sheet = wb.addWorksheet('Produtos', { views: [{ state: 'frozen', ySplit: 1 }] })
  sheet.columns = [
    { header: 'Situação', key: 'situacao', width: 12 },
    { header: 'Código', key: 'codigo', width: 22 },
    { header: 'Produto', key: 'nome', width: 44 },
    { header: 'Sistema', key: 'sistema', width: 10 },
    { header: 'Contado', key: 'contado', width: 10 },
    { header: 'Diferença', key: 'diferenca', width: 11 },
    { header: 'Motivo', key: 'motivo', width: 40 },
  ]
  sheet.getRow(1).font = { bold: true }
  sheet.autoFilter = { from: 'A1', to: 'G1' }

  const sorted = [...d.results].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.codigo.localeCompare(b.codigo)
  )
  for (const r of sorted) {
    sheet.addRow({
      situacao: STATUS_LABEL[r.status],
      // Como texto, para o Excel não transformar código de barras em notação científica.
      codigo: String(r.codigo),
      nome: r.nome_produto || d.names?.get(r.codigo) || '',
      sistema: r.saldo_qtd || 0,
      contado: r.manual_qtd || 0,
      diferenca: (r.manual_qtd || 0) - (r.saldo_qtd || 0),
      motivo: r.status === 'regular' ? '' : justificativa(d, r.codigo),
    })
  }
  sheet.getColumn('codigo').numFmt = '@'

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
