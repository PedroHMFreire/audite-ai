import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getCountById, getResultsByCount, getPlanItems, listManualEntries } from '@/lib/db'
import type { Result } from '@/lib/db'
import { generateReportPDF } from '@/lib/pdf'

type PlanRow = { codigo: string; nome: string; saldo: number }
type Entry = { id: string; count_id: string; codigo: string; qty: number; created_at: string }

export default function Report() {
  const { id } = useParams()
  const [count, setCount] = useState<any>(null)
  const [rows, setRows] = useState<Result[]>([])
  const [plan, setPlan] = useState<PlanRow[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [logoPng, setLogoPng] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    getCountById(id).then(setCount)
    getResultsByCount(id).then(setRows)
    getPlanItems(id).then(setPlan)
    listManualEntries(id).then(setEntries)

    // Tenta converter logo.svg -> PNG (para o jsPDF)
    ;(async () => {
      try {
        const res = await fetch('/logo.svg')
        const svgText = await res.text()
        const png = await svgToPng(svgText, 240, 80)
        setLogoPng(png)
      } catch {
        setLogoPng(undefined)
      }
    })()
  }, [id])

  const catTotals = {
    regular: rows.filter(r=>r.status==='regular').length,
    excesso: rows.filter(r=>r.status==='excesso').length,
    falta: rows.filter(r=>r.status==='falta').length,
  }

  // >>> NOVO: totais de códigos e itens
  const totals = useMemo(() => {
    const planCodes = plan.length
    const planItems = plan.reduce((acc, p) => acc + (Number(p.saldo) || 0), 0)

    const insertedItems = entries.reduce((acc, e) => acc + (Number(e.qty) || 1), 0)
    const insertedCodes = new Set(entries.map(e => e.codigo)).size

    return { planCodes, planItems, insertedCodes, insertedItems }
  }, [plan, entries])

  function exportPDF() {
    try {
      const blob = generateReportPDF({
        logoDataUrl: logoPng,
        countName: count?.nome || '',
        storeName: '—',
        date: new Date(count?.created_at || Date.now()).toLocaleString(),
        results: rows
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-${(count?.nome || 'contagem').replace(/\s+/g,'-').toLowerCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(()=>URL.revokeObjectURL(url), 5000)
    } catch (e) {
      alert('Não foi possível gerar o PDF: ' + (e as any)?.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Relatório</h1>
        <div className="text-sm text-zinc-500">Contagem: {count?.nome}</div>
      </div>

      {/* NOVO: Resumo Planilha x Inseridos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs text-zinc-500">Planilha • Códigos</div>
          <div className="text-2xl font-semibold">{totals.planCodes}</div>
        </div>
        <div className="card">
          <div className="text-xs text-zinc-500">Planilha • Itens</div>
          <div className="text-2xl font-semibold">{totals.planItems}</div>
        </div>
        <div className="card">
          <div className="text-xs text-zinc-500">Inseridos • Códigos</div>
          <div className="text-2xl font-semibold">{totals.insertedCodes}</div>
        </div>
        <div className="card">
          <div className="text-xs text-zinc-500">Inseridos • Itens</div>
          <div className="text-2xl font-semibold">{totals.insertedItems}</div>
        </div>
      </div>

      {/* Totais por categoria (mantidos) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card"><div className="text-xs text-zinc-500">Regulares</div><div className="text-2xl font-semibold">{catTotals.regular}</div></div>
        <div className="card"><div className="text-xs text-zinc-500">Excesso</div><div className="text-2xl font-semibold">{catTotals.excesso}</div></div>
        <div className="card"><div className="text-xs text-zinc-500">Falta</div><div className="text-2xl font-semibold">{catTotals.falta}</div></div>
      </div>

      <div className="card">
        <div className="text-sm mb-3">Produtos regulares</div>
        <SimpleTable rows={rows.filter(r=>r.status==='regular')} />
      </div>
      <div className="card">
        <div className="text-sm mb-3">Produtos em excesso</div>
        <SimpleTable rows={rows.filter(r=>r.status==='excesso')} />
      </div>
      <div className="card">
        <div className="text-sm mb-3">Produtos em falta</div>
        <SimpleTable rows={rows.filter(r=>r.status==='falta')} />
      </div>

      <div>
        <button className="btn" onClick={exportPDF}>Exportar PDF</button>
      </div>
    </div>
  )
}

function SimpleTable({ rows }: { rows: Result[] }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="text-left border-b border-zinc-100 dark:border-zinc-800">
          <tr>
            <th className="py-2 pr-4">Código</th>
            <th className="py-2 pr-4">Nome</th>
            <th className="py-2 pr-4">Manual</th>
            <th className="py-2 pr-4">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-zinc-50 dark:border-zinc-900">
              <td className="py-2 pr-4">{r.codigo}</td>
              <td className="py-2 pr-4">{r.nome_produto || '—'}</td>
              <td className="py-2 pr-4">{r.manual_qtd}</td>
              <td className="py-2 pr-4">{r.saldo_qtd}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td className="py-2 text-zinc-500" colSpan={4}>Sem itens</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// Converte SVG (string) para PNG dataURL para uso no jsPDF
async function svgToPng(svgText: string, width = 240, height = 80): Promise<string> {
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.src = url
  await new Promise<void>(res => { img.onload = () => res() })
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)
  URL.revokeObjectURL(url)
  return canvas.toDataURL('image/png')
}
