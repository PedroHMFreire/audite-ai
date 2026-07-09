import jsPDF from 'jspdf'
import type { Result, DivergenceJustification } from './db'
import { MOTIVO_LABELS } from './db'

export function generateReportPDF(opts: {
  logoDataUrl?: string // PNG/JPEG dataURL
  countName: string
  storeName?: string
  date: string
  results: Result[]
  justifications?: Map<string, DivergenceJustification>
}): Blob {
  const { logoDataUrl, countName, storeName, date, results, justifications } = opts
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  function justificativaLabel(codigo: string): string {
    const j = justifications?.get(codigo)
    if (!j) return 'Pendente'
    const label = MOTIVO_LABELS[j.motivo]
    return j.observacao ? `${label} — ${j.observacao}` : label
  }

  // Layout
  const marginLeft = 40
  const marginRight = 40
  const pageWidth = doc.internal.pageSize.getWidth()
  const usableRight = pageWidth - marginRight

  // Colunas (Nome mais largo; Justificativa some espaço da coluna Nome)
  const xCode   = marginLeft
  const wCode   = 90
  const xName   = xCode + wCode + 10
  const wName   = 170
  const xManual = xName + wName + 10
  const wManual = 45
  const xSaldo  = xManual + wManual + 10
  const wSaldo  = 45
  const xJust   = xSaldo + wSaldo + 10
  const wJust   = usableRight - xJust

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

  function printTableHeader(title: string, showJust: boolean) {
    doc.setFontSize(14)
    doc.text(title, marginLeft, pageY)
    pageY += 12
    doc.setFontSize(10)
    doc.text('Código', xCode, pageY)
    doc.text('Nome',   xName, pageY)
    doc.text('Manual', xManual, pageY)
    doc.text('Saldo',  xSaldo, pageY)
    if (showJust) doc.text('Justificativa', xJust, pageY)
    pageY += 10
    doc.setDrawColor(200)
    doc.line(marginLeft, pageY, usableRight, pageY)
    pageY += 10
  }

  function addPageIfNeeded(minSpace: number, headerTitle: string, showJust: boolean) {
    const pageHeight = doc.internal.pageSize.getHeight()
    if (pageY + minSpace > pageHeight - 40) {
      doc.addPage()
      pageY = 40
      printTableHeader(headerTitle, showJust)
    }
  }

  for (const sec of sections) {
    const showJust = sec.key !== 'regular'

    // Cabeçalho da seção
    addPageIfNeeded(60, sec.title, showJust)
    printTableHeader(sec.title, showJust)

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

      // Quebra da justificativa em até 3 linhas (só para excesso/falta)
      let justLines: string[] = []
      if (showJust) {
        const justSplit = doc.splitTextToSize(justificativaLabel(codigo), wJust)
        justLines = justSplit.slice(0, 3)
        if (justSplit.length > 3) {
          const last = justLines[2]
          const clipped = doc.splitTextToSize(last + '…', wJust)[0]
          justLines[2] = clipped.endsWith('…') ? clipped : (clipped + '…')
        }
      }

      const rowHeight = lineHeight * Math.max(1, nameLines.length, justLines.length) + 4
      addPageIfNeeded(rowHeight + 6, sec.title, showJust)

      // Valores
      doc.setFontSize(10)
      doc.text(codigo, xCode, pageY)
      doc.text(manual, xManual, pageY)
      doc.text(saldo,  xSaldo, pageY)
      for (let i = 0; i < nameLines.length; i++) {
        doc.text(String(nameLines[i]), xName, pageY + (i * lineHeight), { maxWidth: wName })
      }
      for (let i = 0; i < justLines.length; i++) {
        doc.text(String(justLines[i]), xJust, pageY + (i * lineHeight), { maxWidth: wJust })
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
