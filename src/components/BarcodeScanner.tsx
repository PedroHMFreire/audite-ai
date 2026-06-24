import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'

/**
 * Leitor de código de barras pela câmera, com dois motores:
 *  - `BarcodeDetector` nativo (Android/Chrome): leve e rápido.
 *  - ZXing (`@zxing/browser`) como fallback universal — inclui iOS Safari,
 *    que não tem a API nativa.
 * Modo contínuo com cooldown para não duplicar a mesma leitura.
 */

type Props = {
  onDetected: (code: string) => void
  onClose: () => void
  /** códigos do plano — usados para colorir a confirmação (verde = no plano) */
  planCodes?: Set<string>
}

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar', 'qr_code']

export default function BarcodeScanner({ onDetected, onClose, planCodes }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number | null>(null)
  const zxingControlsRef = useRef<IScannerControls | null>(null)
  const lastRef = useRef<{ code: string; t: number }>({ code: '', t: 0 })

  const [supported, setSupported] = useState<boolean | null>(null)
  const [engine, setEngine] = useState<'native' | 'zxing' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastHit, setLastHit] = useState<{ code: string; known: boolean } | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)

  // Trata uma leitura bruta com cooldown e dispara onDetected.
  const handleRaw = useCallback((raw: string) => {
    const code = String(raw || '').trim()
    if (!code) return
    const now = performance.now()
    if (code === lastRef.current.code && now - lastRef.current.t < 1200) return
    lastRef.current = { code, t: now }
    const known = planCodes ? planCodes.has(code) : true
    setLastHit({ code, known })
    onDetected(code)
  }, [onDetected, planCodes])

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
    setEngine(hasNative ? 'native' : 'zxing')

    let cancelled = false

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

    return () => { cancelled = true; stop() }
  }, [handleRaw, detectTorch, stop])

  const handleClose = useCallback(() => { stop(); onClose() }, [stop, onClose])

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />

        {supported && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-44 w-72 max-w-[80vw]">
              <span className="absolute -left-0.5 -top-0.5 h-8 w-8 border-l-4 border-t-4 border-white/90 rounded-tl-lg" />
              <span className="absolute -right-0.5 -top-0.5 h-8 w-8 border-r-4 border-t-4 border-white/90 rounded-tr-lg" />
              <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 border-b-4 border-l-4 border-white/90 rounded-bl-lg" />
              <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 border-b-4 border-r-4 border-white/90 rounded-br-lg" />
              <span className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-primary-500/80 shadow-[0_0_12px_2px_rgba(255,107,53,0.7)]" />
            </div>
          </div>
        )}

        {supported === false && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="text-white/90">
              <div className="text-4xl mb-3">📷</div>
              <p className="font-semibold mb-1">Câmera indisponível</p>
              <p className="text-sm text-white/70">Use o campo de digitação para inserir os códigos.</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="text-white/90">
              <div className="text-4xl mb-3">🚫</div>
              <p className="font-semibold mb-1">{error}</p>
              <p className="text-sm text-white/70">Verifique as permissões e tente novamente.</p>
            </div>
          </div>
        )}

        {lastHit && (
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className={`mx-auto max-w-sm rounded-xl px-4 py-3 backdrop-blur-md border text-center font-mono text-lg font-semibold ${
              lastHit.known ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-50' : 'bg-amber-500/20 border-amber-400/60 text-amber-50'
            }`}>
              {lastHit.code}
              <div className="font-sans text-xs font-normal mt-0.5 opacity-80">
                {lastHit.known ? '✓ na planilha — registrado' : '⚠ fora da planilha — registrado como excesso'}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-black">
        <button onClick={handleClose} className="rounded-xl px-5 py-3 text-base font-medium bg-white text-zinc-900 active:scale-95 transition">
          Concluir
        </button>
        <p className="text-xs text-white/60 text-center flex-1">
          {supported && !error ? (engine === 'zxing' ? 'Aponte para o código' : 'Aponte para o código de barras') : ''}
        </p>
        {torchAvailable && (
          <button onClick={toggleTorch} aria-label="Lanterna" className={`rounded-xl px-4 py-3 text-base active:scale-95 transition ${torchOn ? 'bg-primary-500 text-white' : 'bg-white/15 text-white'}`}>
            🔦
          </button>
        )}
      </div>
    </div>
  )
}
