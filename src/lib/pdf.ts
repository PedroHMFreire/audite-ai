import jsPDF from 'jspdf'
import type { Result } from './db'

export function generateReportPDF(opts: {
  logoDataUrl?: string // PNG/JPEG dataURL
  countName: string
  storeName?: string
  date: string
  results: Result[]
}): Blob {
  const { logoDataUrl, countName, storeName, date, results } = opts
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  // Layout
  const marginLeft = 40
  const marginRight = 40
  const pageWidth = doc.internal.pageSize.getWidth()
  const usableRight = pageWidth - marginRight

  // Colunas (Nome mais largo)
  const xCode   = marginLeft
  const wCode   = 90
  const xName   = xCode + wCode + 10
  const wName   = 300
  const xManual = xName + wName + 10
  const wManual = 50
  const xSaldo  = xManual + wManual + 10
  const wSaldo  = 50

  // ===== Cabeçalho =====
  let y = 40
  if (logoDataUrl && /^data:image\/(png|jpeg);base64,/.test(logoDataUrl)) {
    try { doc.addImage(logoDataUrl, 'PNG', marginLeft, y, 120, 40) } catch {}
  }

  doc.setFontSize(18)
  doc.text('Relatório de Auditoria - AUDITE.AI', marginLeft, y + 70)

  doc.setFontSize(12)
  const lineStep = 20
  let headerBottom = y + 90
  doc.text(`Contagem: ${countName}`, marginLeft, headerBottom)
  headerBottom += lineStep

  // sempre mostramos Loja (pode ser "—")
  doc.text(`Loja: ${storeName ?? '—'}`, marginLeft, headerBottom)
  headerBottom += lineStep

  doc.text(`Data: ${date}`, marginLeft, headerBottom)
  headerBottom += lineStep

  // Empurra a tabela para baixo (correção do overlap)
  let pageY = headerBottom + 10
  const lineHeight = 14

  // ===== Tabela =====
  const sections: { title: string; key: 'regular'|'excesso'|'falta' }[] = [
    { title: 'Produtos Regulares', key: 'regular' },
    { title: 'Produtos em Excesso', key: 'excesso' },
    { title: 'Produtos em Falta', key: 'falta' },
  ]

  function printTableHeader(title: string) {
    doc.setFontSize(14)
    doc.text(title, marginLeft, pageY)
    pageY += 12
    doc.setFontSize(10)
    doc.text('Código', xCode, pageY)
    doc.text('Nome',   xName, pageY)
    doc.text('Manual', xManual, pageY)
    doc.text('Saldo',  xSaldo, pageY)
    pageY += 10
    doc.setDrawColor(200)
    doc.line(marginLeft, pageY, usableRight, pageY)
    pageY += 10
  }

  function addPageIfNeeded(minSpace: number, headerTitle: string) {
    const pageHeight = doc.internal.pageSize.getHeight()
    if (pageY + minSpace > pageHeight - 40) {
      doc.addPage()
      pageY = 40
      printTableHeader(headerTitle)
    }
  }

  for (const sec of sections) {
    // Cabeçalho da seção
    addPageIfNeeded(60, sec.title)
    printTableHeader(sec.title)

    const rows = results.filter(r => r.status === sec.key)
    for (const r of rows) {
      const codigo = r.codigo || '-'
      const nome   = r.nome_produto || '-'
      const manual = String(r.manual_qtd ?? 0)
      const saldo  = String(r.saldo_qtd ?? 0)

      // Quebra do nome em até 2 linhas
      const split = doc.splitTextToSize(nome, wName)
      let nameLines = split.slice(0, 2)
      if (split.length > 2) {
        const last = nameLines[1]
        const clipped = doc.splitTextToSize(last + '…', wName)[0]
        nameLines[1] = clipped.endsWith('…') ? clipped : (clipped + '…')
      }

      const rowHeight = lineHeight * Math.max(1, nameLines.length) + 4
      addPageIfNeeded(rowHeight + 6, sec.title)

      // Valores
      doc.setFontSize(10)
      doc.text(codigo, xCode, pageY)
      doc.text(manual, xManual, pageY)
      doc.text(saldo,  xSaldo, pageY)
      for (let i = 0; i < nameLines.length; i++) {
        doc.text(String(nameLines[i]), xName, pageY + (i * lineHeight), { maxWidth: wName })
      }

      pageY += rowHeight
      doc.setDrawColor(245)
      doc.line(marginLeft, pageY, usableRight, pageY)
      pageY += 6
    }

    pageY += 12
  }

  return doc.output('blob')
}
