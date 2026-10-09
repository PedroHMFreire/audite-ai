import jsPDF from 'jspdf'
import type { Result } from './db'
import { MOTIVO_LABELS } from './db'
import type { ReportData } from './reportExport'

/** Relatório da contagem em PDF (A4): resumo, depois faltas, sobras e certos. */
export function generateReportPDF(d: ReportData): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const right = pageWidth - margin
  const lineHeight = 13

  const xCode = margin
  const wCode = 100
  const xName = xCode + wCode + 8
  const wName = 170
  const xSys = xName + wName + 8
  const xCnt = xSys + 48
  const xDiff = xCnt + 48
  const xJust = xDiff + 44
  const wJust = right - xJust

  const nome = (r: Result) => r.nome_produto || d.names?.get(r.codigo) || ''
  const motivo = (codigo: string) => {
    const j = d.justifications?.get(codigo)
    if (!j) return ''
    const label = MOTIVO_LABELS[j.motivo]
    return j.observacao ? `${label}: ${j.observacao}` : label
  }
  const by = (s: Result['status']) => d.results.filter((r) => r.status === s)
  const units = (rows: Result[]) => rows.reduce((a, r) => a + Math.abs((r.manual_qtd || 0) - (r.saldo_qtd || 0)), 0)

  // Cabeçalho
  let y = margin + 8
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(22)
  doc.text('Relatório de contagem', margin, y)
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(110)
  doc.text('Audite', right, y, { align: 'right' })
  y += 22
  doc.setFontSize(11).setTextColor(22)
  doc.text(d.countName || 'Contagem', margin, y)
  y += 15
  doc.setFontSize(10).setTextColor(110)
  doc.text([d.storeName, d.date].filter(Boolean).join('  ·  '), margin, y)
  y += 22

  // Resumo
  const faltas = by('falta')
  const sobras = by('excesso')
  const certos = by('regular')
  const boxes: [string, string][] = [
    ['Produtos conferidos', String(d.results.length)],
    ['Certos', String(certos.length)],
    ['Faltas', `${faltas.length} (${units(faltas)} peças)`],
    ['Sobras', `${sobras.length} (${units(sobras)} peças)`],
  ]
  const boxW = (right - margin) / boxes.length
  doc.setDrawColor(220)
  doc.line(margin, y, right, y)
  boxes.forEach(([label, value], i) => {
    const x = margin + i * boxW
    doc.setFontSize(8).setTextColor(110).text(label.toUpperCase(), x, y + 16)
    doc.setFontSize(12).setTextColor(22).text(value, x, y + 33)
  })
  y += 46
  doc.line(margin, y, right, y)
  y += 26

  function tableHeader(title: string, withMotivo: boolean) {
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(22)
    doc.text(title, margin, y)
    y += 16
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(110)
    doc.text('CÓDIGO', xCode, y)
    doc.text('PRODUTO', xName, y)
    doc.text('SISTEMA', xSys, y)
    doc.text('CONTADO', xCnt, y)
    doc.text('DIF.', xDiff, y)
    if (withMotivo) doc.text('MOTIVO', xJust, y)
    y += 6
    doc.setDrawColor(200)
    doc.line(margin, y, right, y)
    y += 13
  }

  function clip(text: string, width: number, maxLines: number): string[] {
    const lines: string[] = doc.splitTextToSize(text, width)
    if (lines.length <= maxLines) return lines
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = String(kept[maxLines - 1]).replace(/.{0,2}$/, '…')
    return kept
  }

  const sections: [string, Result[], boolean][] = [
    [`Faltas (${faltas.length})`, faltas, true],
    [`Sobras (${sobras.length})`, sobras, true],
    [`Certos (${certos.length})`, certos, false],
  ]

  for (const [title, rows, withMotivo] of sections) {
    if (rows.length === 0) continue
    if (y + 70 > pageHeight - margin) { doc.addPage(); y = margin }
    tableHeader(title, withMotivo)

    for (const r of rows) {
      doc.setFontSize(9)
      const nameLines = clip(nome(r) || '—', wName, 2)
      const codeLines = clip(String(r.codigo), wCode, 2)
      const justLines = withMotivo ? clip(motivo(r.codigo), wJust, 3) : []
      const rowHeight = lineHeight * Math.max(1, nameLines.length, codeLines.length, justLines.length)

      if (y + rowHeight > pageHeight - margin) {
        doc.addPage()
        y = margin
        tableHeader(`${title} — continuação`, withMotivo)
        doc.setFontSize(9)
      }

      const diff = (r.manual_qtd || 0) - (r.saldo_qtd || 0)
      doc.setTextColor(22)
      doc.text(codeLines, xCode, y)
      doc.text(nameLines, xName, y)
      doc.text(String(r.saldo_qtd ?? 0), xSys, y)
      doc.text(String(r.manual_qtd ?? 0), xCnt, y)
      doc.text(diff === 0 ? '0' : diff > 0 ? `+${diff}` : String(diff), xDiff, y)
      if (justLines.length) { doc.setTextColor(90); doc.text(justLines, xJust, y) }

      y += rowHeight + 3
      doc.setDrawColor(238)
      doc.line(margin, y - 9, right, y - 9)
    }
    y += 18
  }

  // Rodapé com numeração
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8).setTextColor(150)
    doc.text(`Página ${i} de ${pages}`, right, pageHeight - 20, { align: 'right' })
  }

  return doc.output('blob')
}
