/**
 * Feedback tátil e sonoro para a contagem.
 *
 * Num estoque, o vendedor conta de cabeça baixa nas prateleiras — a confirmação
 * por som/vibração dá segurança sem precisar olhar a tela a cada item.
 */

let audioCtx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return null
      audioCtx = new AC()
    }
    // iOS suspende o contexto até um gesto do usuário; retomar é barato.
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

function beep(frequency: number, durationMs: number, volume = 0.06) {
  const ac = ctx()
  if (!ac) return
  try {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.value = volume
    osc.connect(gain)
    gain.connect(ac.destination)
    const now = ac.currentTime
    osc.start(now)
    // pequeno fade-out para não estalar
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
    osc.stop(now + durationMs / 1000)
  } catch {
    /* silencioso */
  }
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  } catch {
    /* silencioso */
  }
}

/** Item registrado com sucesso: bipe curto e agudo + tap. */
export function feedbackSuccess() {
  beep(880, 90)
  vibrate(20)
}

/** Código fora da planilha: dois bipes graves + vibração de alerta. */
export function feedbackWarning() {
  beep(440, 110)
  window.setTimeout(() => beep(360, 130), 120)
  vibrate([30, 40, 30])
}

/** Erro / falha ao registrar: bipe grave longo. */
export function feedbackError() {
  beep(220, 220)
  vibrate([60, 50, 60])
}

/** "Desfazer" / remoção: bipe neutro curto. */
export function feedbackNeutral() {
  beep(620, 70)
  vibrate(15)
}
