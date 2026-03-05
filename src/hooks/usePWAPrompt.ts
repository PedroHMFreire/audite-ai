import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UsePWAPromptReturn {
  canInstall: boolean
  showPrompt: boolean
  isIOS: boolean
  isStandalone: boolean
  handleInstall: () => Promise<void>
  handleDismiss: () => void
}

const DISMISSED_KEY = 'pwa-prompt-dismissed'

export function usePWAPrompt(): UsePWAPromptReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Detect iOS
    const iosPlatforms = ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod']
    const isIOSDevice = iosPlatforms.some(
      (platform) => navigator.platform.includes(platform)
    ) || navigator.userAgent.includes('Mac OS X')
    setIsIOS(isIOSDevice)

    // Detect if already installed (standalone mode)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true
    setIsStandalone(isStandaloneMode)

    // Don't show prompt if already standalone
    if (isStandaloneMode) return

    // Check if user already dismissed
    const wasDismissed = localStorage.getItem(DISMISSED_KEY)
    if (wasDismissed) return

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promiseEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promiseEvent)
      
      // Show our custom prompt after 2 seconds
      setTimeout(() => {
        setShowPrompt(true)
      }, 2000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install')
        setShowPrompt(false)
        localStorage.setItem(DISMISSED_KEY, 'true')
      } else {
        console.log('[PWA] User dismissed install')
      }
    } catch (error) {
      console.error('[PWA] Install error:', error)
    }

    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShowPrompt(false)
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDeferredPrompt(null)
  }, [])

  return {
    canInstall: !!deferredPrompt,
    showPrompt,
    isIOS,
    isStandalone,
    handleInstall,
    handleDismiss
  }
}
