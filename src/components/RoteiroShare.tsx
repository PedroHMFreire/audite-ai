import { useEffect, useMemo, useState } from 'react'
import { Copy, Download, MessageCircle } from 'lucide-react'
import type { ScheduleConfig } from '@/lib/db'
import { loadBoard, type Board } from '@/lib/team'
import { FREQUENCIES, roteiroMessage, whatsappNumber } from '@/lib/roteiro'
import { parseLocalDate } from '@/lib/scheduleDates'
import { downloadBlob, fileSlug } from '@/lib/reportExport'
import { useAuth } from '@/contexts'
import { useToast } from '@/components/Toast'

const formatDate = (iso: string) => parseLocalDate(iso).toLocaleDateString('pt-BR')

/**
 * Emissão do roteiro: o PDF para o gerente (com uma folha por vendedor) e a
 * mensagem de cada vendedor, pronta para o WhatsApp.
 */
export default function RoteiroShare({ config, onClose }: { config: ScheduleConfig; onClose: () => void }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [busy, setBusy] = useState(false)
  const storeName = (user?.user_metadata?.store_name as string | undefined)?.trim() || null

  useEffect(() => {
    let alive = true
    loadBoard()
      .then((b) => { if (alive) setBoard(b) })
      .catch((err) => addToast({ type: 'error', message: 'Não foi possível carregar o roteiro', description: err instanceof Error ? err.message : undefined }))
    return () => { alive = false }
  }, [addToast])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const items = useMemo(() => (board?.items || []).filter((i) => i.config_id === config.id), [board, config.id])

  const perSeller = useMemo(() => (board?.sellers || []).map((seller) => {
    const mine = items.filter((i) => i.sellerIds.length === 0 || i.sellerIds.includes(seller.id))
    return {
      seller,
      total: mine.length,
      text: roteiroMessage({
        sellerName: seller.name,
        storeName,
        instructions: config.instructions,
        items: mine.map((i) => ({ date: i.scheduled_date, category: i.category.name, partners: i.sellerNames.filter((n) => n !== seller.name) })),
      }),
    }
  }).filter((s) => s.total > 0), [board, items, storeName, config.instructions])

  async function downloadPdf() {
    setBusy(true)
    try {
      const { generateRoteiroPDF } = await import('@/lib/roteiroPdf')
      const period = items.length ? `${formatDate(items[0].scheduled_date)} a ${formatDate(items[items.length - 1].scheduled_date)}` : ''
      const blob = generateRoteiroPDF({
        storeName,
        name: config.name,
        summary: [config.frequency ? FREQUENCIES[config.frequency].label : null, period, `${items.length} contagens`].filter(Boolean).join('  ·  '),
        instructions: config.instructions,
        items: items.map((i) => ({ date: i.scheduled_date, category: i.category.name, sellerIds: i.sellerIds, sellerNames: i.sellerNames })),
        sellers: board?.sellers || [],
      })
      downloadBlob(blob, `roteiro-${fileSlug(config.name)}.pdf`)
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível gerar o PDF', description: err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      addToast({ type: 'success', message: 'Roteiro copiado' })
    } catch {
      addToast({ type: 'error', message: 'Não foi possível copiar' })
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-black/50 p-4 animate-fade-in sm:items-center" onClick={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="emitir-titulo" onClick={(e) => e.stopPropagation()}
        className="card my-8 max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto animate-scale-in">
        <div>
          <h3 id="emitir-titulo" className="text-lg font-semibold">Emitir roteiro</h3>
          <p className="mt-1 text-sm text-zinc-500">{config.name}{items.length > 0 && ` · ${items.length} contagens`}</p>
        </div>

        {!board ? (
          <div className="skeleton h-32" aria-busy="true" />
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500">Este roteiro não tem contagens programadas.</p>
        ) : (
          <>
            <section className="space-y-2">
              <h4 className="eyebrow">Para o gerente</h4>
              <p className="text-sm text-zinc-600">
                PDF com todas as contagens, os responsáveis e as orientações{board.sellers.length > 0 && ', mais uma folha para cada vendedor'}.
              </p>
              <button type="button" className="btn" onClick={downloadPdf} disabled={busy}>
                <Download className="h-4 w-4" aria-hidden="true" /> {busy ? 'Gerando…' : 'Baixar PDF'}
              </button>
            </section>

            {perSeller.length > 0 && (
              <section className="space-y-2">
                <h4 className="eyebrow">Para cada vendedor</h4>
                <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
                  {perSeller.map(({ seller, total, text }) => {
                    const number = whatsappNumber(seller.phone)
                    return (
                      <li key={seller.id} className="flex items-center gap-2 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{seller.name}</p>
                          <p className="text-xs text-zinc-500">{total} {total === 1 ? 'contagem' : 'contagens'}</p>
                        </div>
                        {number && (
                          <a className="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer"
                            href={`https://wa.me/${number}?text=${encodeURIComponent(text)}`}>
                            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
                          </a>
                        )}
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => copy(text)} aria-label={`Copiar roteiro de ${seller.name}`}>
                          <Copy className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Copiar</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </>
        )}

        <div className="flex justify-end">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
