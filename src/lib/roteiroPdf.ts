import jsPDF from 'jspdf'
import { namesLabel, shortDate } from './roteiro'

export type RoteiroDoc = {
  storeName?: string | null
  name: string
  /** Ex.: "Semanal · 12/10/2026 a 06/11/2026". */
  summary: string
  instructions?: string | null
  items: { date: string; category: string; sellerIds: string[]; sellerNames: string[] }[]
  sellers: { id: string; name: string }[]
}

/**
 * Roteiro de contagens em PDF (A4). A primeira parte é a visão do gerente,
 * com todas as contagens e seus responsáveis; depois vem uma folha para cada
 * vendedor, só com as contagens dele, para entregar em mãos.
 */
export function generateRoteiroPDF(d: RoteiroDoc): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const right = pageWidth - margin
  const lineHeight = 13

  const xDate = margin
  const xCat = margin + 80
  const wCat = 190
  const xWho = xCat + wCat + 10
  const xBox = right - 12
  const wWho = xBox - xWho - 14
  let y = margin

  function heading(title: string, subtitle: string, summary: string) {
    y = margin + 8
    doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(22)
    doc.text(title, margin, y)
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(110)
    doc.text('Audite', right, y, { align: 'right' })
    y += 20
    doc.setFontSize(11).setTextColor(22)
    doc.text(subtitle, margin, y)
    y += 15
    doc.setFontSize(10).setTextColor(110)
    doc.text(summary, margin, y)
    y += 24
  }

  function instructions() {
    const text = d.instructions?.trim()
    if (!text) return
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(22)
    doc.text('Orientações', margin, y)
    y += 14
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(60)
    const lines: string[] = doc.splitTextToSize(text, right - margin)
    for (const line of lines) {
      if (y > pageHeight - margin) { doc.addPage(); y = margin }
      doc.text(line, margin, y)
      y += lineHeight
    }
    y += 12
  }

  function tableHeader(whoLabel: string) {
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(110)
    doc.text('DATA', xDate, y)
    doc.text('CATEGORIA', xCat, y)
    doc.text(whoLabel, xWho, y)
    doc.text('FEITO', xBox + 10, y, { align: 'right' })
    y += 6
    doc.setDrawColor(200)
    doc.line(margin, y, right, y)
    y += 15
  }

  function table(rows: { date: string; category: string; who: string }[], whoLabel: string) {
    tableHeader(whoLabel)
    for (const row of rows) {
      doc.setFontSize(10)
      const catLines: string[] = doc.splitTextToSize(row.category, wCat)
      const whoLines: string[] = doc.splitTextToSize(row.who, wWho)
      const rowHeight = lineHeight * Math.max(catLines.length, whoLines.length)
      if (y + rowHeight > pageHeight - margin - 20) {
        doc.addPage()
        y = margin
        tableHeader(whoLabel)
        doc.setFontSize(10)
      }
      doc.setTextColor(22)
      doc.text(shortDate(row.date), xDate, y)
      doc.text(catLines, xCat, y)
      doc.setTextColor(70)
      doc.text(whoLines, xWho, y)
      doc.setDrawColor(120)
      doc.rect(xBox, y - 9, 10, 10)
      y += rowHeight + 4
      doc.setDrawColor(238)
      doc.line(margin, y - 8, right, y - 8)
      y += 3
    }
  }

  // Visão geral, para o gerente
  heading('Roteiro de contagens', [d.storeName, d.name].filter(Boolean).join('  ·  '), d.summary)
  instructions()
  table(d.items.map((i) => ({ date: i.date, category: i.category, who: namesLabel(i.sellerNames) })), 'RESPONSÁVEL')

  // Uma folha por vendedor: as dele e as de toda a equipe
  for (const seller of d.sellers) {
    const mine = d.items.filter((i) => i.sellerIds.length === 0 || i.sellerIds.includes(seller.id))
    if (mine.length === 0) continue
    doc.addPage()
    heading(`Roteiro de ${seller.name}`, [d.storeName, d.name].filter(Boolean).join('  ·  '), `${mine.length} ${mine.length === 1 ? 'contagem' : 'contagens'}`)
    instructions()
    table(mine.map((i) => ({
      date: i.date,
      category: i.category,
      who: i.sellerIds.length === 0 ? 'Toda a equipe' : namesLabel(i.sellerNames.filter((n) => n !== seller.name)).replace('Toda a equipe', 'Sozinho(a)'),
    })), 'COM QUEM')
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8).setTextColor(150)
    doc.text(`Página ${i} de ${pages}`, right, pageHeight - 20, { align: 'right' })
  }

  return doc.output('blob')
}
