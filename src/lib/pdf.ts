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

  // Colunas (ampliamos o "Nome")
  const xCode   = marginLeft
  const wCode   = 90
  const xName   = xCode + wCode + 10
  const wName   = 300  // <<< mais largo
  const xManual = xName + wName + 10
  const wManual = 50
  const xSaldo  = xManual + wManual + 10
  const wSaldo  = 50

  let y = 40

  // Cabeçalho
  if (logoDataUrl && /^data:image\/(png|jpeg);base64,/.test(logoDataUrl)) {
    try { doc.addImage(logoDataUrl, 'PNG', marginLeft, y, 120, 40) } catch {}
  }
  doc.setFontSize(18)
  doc.text('Relatório de Auditoria - AUDITE.AI', marginLeft, y + 70)
  doc.setFontSize(12)
  doc.text(`Contagem: ${countName}`, marginLeft, y + 90)
  if (storeName) doc.text(`Loja: ${storeName}`, marginLeft, y + 110)
  doc.text(`Data: ${date}`, marginLeft, y + 130)

  let pageY = 170
  const lineHeight = 14

  const sections: { title: string; key: 'regular'|'excesso'|'falta' }[] = [
    { title: 'Produtos Regulares', key: 'regular' },
    { title: 'Produtos em Excesso', key: 'excesso' },
    { title: 'Produtos em Falta', key: 'falta' },
  ]

  function addPageIfNeeded(minSpace: number, printHeader: () => void) {
    const pageHeight = doc.internal.pageSize.getHeight()
    if (pageY + minSpace > pageHeight - 40) {
      doc.addPage()
      pageY = 40
      printHeader()
    }
  }

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

  for (const sec of sections) {
    // Cabeçalho da seção (com quebra automática)
    addPageIfNeeded(60, () => printTableHeader(sec.title))
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
        // adiciona reticências na segunda linha
        const last = nameLines[1]
        // garante “…” no fim (sem passar do width)
        const clipped = doc.splitTextToSize(last + '…', wName)[0]
        nameLines[1] = clipped.endsWith('…') ? clipped : (clipped + '…')
      }

      const rowHeight = lineHeight * Math.max(1, nameLines.length) + 4
      addPageIfNeeded(rowHeight + 6, () => {
        // reimprime o cabeçalho da tabela na nova página
        printTableHeader(sec.title)
      })

      // Primeira linha da linha (top-alinhado)
      doc.setFontSize(10)
      doc.text(codigo, xCode, pageY)
      doc.text(manual, xManual, pageY)
      doc.text(saldo,  xSaldo, pageY)

      // Nome (pode ter 1 ou 2 linhas)
      for (let i = 0; i < nameLines.length; i++) {
        const yLine = pageY + (i * lineHeight)
        doc.text(String(nameLines[i]), xName, yLine, { maxWidth: wName })
      }

      pageY += rowHeight
      // linha divisória
      doc.setDrawColor(245)
      doc.line(marginLeft, pageY, usableRight, pageY)
      pageY += 6
    }

    pageY += 12
  }

  return doc.output('blob')
}
