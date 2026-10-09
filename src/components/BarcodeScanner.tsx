import { Flashlight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { createScanGate } from '@/lib/scanGate'

/**
 * Bipe em sequência pela câmera: cada leitura entra na lista sozinha, sem
 * tocar em nada. Dois motores de leitura:
 *  - `BarcodeDetector` nativo (Android/Chrome): leve e rápido.
 *  - ZXing (`@zxing/browser`) como fallback universal — inclui iOS Safari,
 *    que não tem a API nativa.
 */

export type ScanRead = {
  key: number
  codigo: string
  nome: string | null
  /** total já contado desse código */
  total: number
  /** ok = na planilha · extra = fora dela · none = ainda sem planilha para comparar */
  tone: 'ok' | 'extra' | 'none'
}

type Props = {
  onDetected: (code: string) => void
  onClose: () => void
  /** leituras desta sessão, da mais recente para a mais antiga */
  reads: ScanRead[]
  /** quantas peças foram bipadas nesta sessão (a lista pode vir cortada) */
  readCount: number
  onUndo?: () => void
  /** segura a leitura enquanto a tela espera uma resposta do usuário */
  paused?: boolean
}

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar', 'qr_code']

const TONE_DOT: Record<ScanRead['tone'], string> = {
  ok: 'bg-emerald-400',
  extra: 'bg-amber-400',
  none: 'bg-white/40'
}

export default function BarcodeScanner({ onDetected, onClose, reads, readCount, onUndo, paused = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number | null>(null)
  const zxingControlsRef = useRef<IScannerControls | null>(null)
  const gateRef = useRef(createScanGate())
  // Em refs: a câmera não pode reiniciar a cada render de quem usa o leitor.
  const onDetectedRef = useRef(onDetected)
  const pausedRef = useRef(paused)
  onDetectedRef.current = onDetected
  pausedRef.current = paused

  const [supported, setSupported] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)

  const handleRaw = useCallback((raw: string) => {
    // Pausado, o código ainda é marcado como visto: ao voltar, a etiqueta que
    // continua na frente da câmera não é lida de novo.
    const code = gateRef.current.accept(raw, performance.now())
    if (code && !pausedRef.current) onDetectedRef.current(code)
  }, [])

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    try { zxingControlsRef.current?.stop() } catch { /* ok */ }
    zxingControlsRef.current = null
    const stream = videoRef.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const detectTorch = useCallback(() => {
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0]
    const caps = (track?.getCapabilities?.() ?? {}) as any
    setTorchAvailable(!!caps.torch)
  }, [])

  const toggleTorch = useCallback(async () => {
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0]
    if (!track) return
    try {
      const next = !torchOn
      await track.applyConstraints({ advanced: [{ torch: next } as any] })
      setTorchOn(next)
    } catch { /* sem torch */ }
  }, [torchOn])

  useEffect(() => {
    const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
    if (!hasCamera) {
      setSupported(false)
      return
    }
    setSupported(true)
    const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window

    let cancelled = false

    // Um balanço leva horas: a tela não pode apagar no meio.
    let wakeLock: { release: () => Promise<void> } | null = null
    ;(navigator as any).wakeLock?.request('screen')
      .then((lock: { release: () => Promise<void> }) => { if (cancelled) void lock.release().catch(() => {}); else wakeLock = lock })
      .catch(() => { /* sem suporte ou negado */ })

    async function startNative() {
      const Detector = (window as any).BarcodeDetector
      const detector = new Detector({ formats: NATIVE_FORMATS })
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false
      })
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      detectTorch()
      const tick = async () => {
        if (cancelled || !videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes && codes.length) handleRaw(codes[0].rawValue)
        } catch { /* frame sem código */ }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    async function startZxing() {
      const reader = new BrowserMultiFormatReader()
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current!,
        result => { if (result) handleRaw(result.getText()) }
      )
      if (cancelled) { controls.stop(); return }
      zxingControlsRef.current = controls
      // a stream já está ligada ao <video>; checa torch após iniciar
      window.setTimeout(detectTorch, 400)
    }

    ;(async () => {
      try {
        if (hasNative) await startNative()
        else await startZxing()
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.name === 'NotAllowedError' ? 'Permissão de câmera negada' : 'Não foi possível abrir a câmera')
        }
      }
    })()

    return () => {
      cancelled = true
      void wakeLock?.release().catch(() => {})
      stop()
    }
  }, [handleRaw, detectTorch, stop])

  const handleClose = useCallback(() => { stop(); onClose() }, [stop, onClose])

  return (
    <div className="light-palette fixed inset-0 z-[60] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label="Bipar com a câmera">
      <div className="relative h-[40%] min-h-[11rem] shrink-0 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />

        {supported && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-28 w-72 max-w-[80vw]">
              <span className="absolute -left-0.5 -top-0.5 h-8 w-8 border-l-4 border-t-4 border-white/90 rounded-tl-lg" />
              <span className="absolute -right-0.5 -top-0.5 h-8 w-8 border-r-4 border-t-4 border-white/90 rounded-tr-lg" />
              <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 border-b-4 border-l-4 border-white/90 rounded-bl-lg" />
              <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 border-b-4 border-r-4 border-white/90 rounded-br-lg" />
              <span className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-red-500/90 shadow-[0_0_10px_1px_rgba(239,68,68,0.6)]" />
            </div>
          </div>
        )}

        {supported === false && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="text-white/90">
              <p className="font-semibold mb-1">Câmera indisponível</p>
              <p className="text-sm text-white/70">Use o campo de digitação para inserir os códigos.</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="text-white/90">
              <p className="font-semibold mb-1">{error}</p>
              <p className="text-sm text-white/70">Verifique as permissões e tente novamente.</p>
            </div>
          </div>
        )}
      </div>

      {/* Lista do que foi bipado nesta sessão */}
      <div className="flex min-h-0 flex-1 flex-col bg-zinc-950 text-white">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <p className="text-sm text-white/70">
            <span className="tabular text-2xl font-semibold text-white">{readCount}</span>
            {readCount === 1 ? ' peça bipada' : ' peças bipadas'}
          </p>
          {onUndo && (
            <button type="button" onClick={onUndo} className="min-h-10 rounded-lg px-3 text-sm text-white/80 underline decoration-white/30 underline-offset-4 active:bg-white/10">
              Desfazer último
            </button>
          )}
        </div>
        {reads.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-white/60">
            Aponte para o código de barras. Cada leitura entra na lista sozinha, sem tocar em nada.
          </p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-white/10 overflow-auto">
            {reads.map((read, i) => (
              <li key={read.key} className={`flex items-center gap-3 px-4 py-2.5 ${i === 0 ? 'bg-white/10' : ''}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[read.tone]}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {read.nome || <span className="font-mono">{read.codigo}</span>}
                  </div>
                  <div className="truncate text-xs text-white/60">
                    {read.nome && <span className="font-mono">{read.codigo}</span>}
                    {read.nome && read.tone === 'extra' && ' · '}
                    {read.tone === 'extra' && 'Fora da planilha'}
                  </div>
                </div>
                <span className="tabular shrink-0 text-sm text-white/70">{read.total} un</span>
              </li>
            ))}
            {readCount > reads.length && (
              <li className="px-4 py-2 text-center text-xs text-white/50">+{readCount - reads.length} leituras anteriores</li>
            )}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-black">
        <button onClick={handleClose} className="rounded-xl px-5 py-3 text-base font-medium bg-white text-zinc-900 active:scale-95 transition">
          Concluir
        </button>
        <p className="text-xs text-white/60 text-center flex-1">
          {paused ? 'Leitura em pausa' : supported && !error ? 'Lendo sem parar' : ''}
        </p>
        {torchAvailable && (
          <button onClick={toggleTorch} aria-label={torchOn ? "Desligar lanterna" : "Ligar lanterna"} aria-pressed={torchOn} className={`rounded-xl px-4 py-3 text-base active:scale-95 transition ${torchOn ? 'bg-white text-zinc-900' : 'bg-white/15 text-white'}`}>
            <Flashlight className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
