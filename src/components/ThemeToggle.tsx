import React from 'react'
import { useEffect, useState } from 'react'

type Mode = 'light' | 'dark' | 'system'

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('system')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Mode) || 'system'
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const compute = (s: Mode) => s === 'dark' || (s === 'system' && mql.matches)

    setMode(saved)
    const dark = compute(saved)
    setIsDark(dark)
    document.documentElement.classList[dark ? 'add' : 'remove']('dark')

    // Atualiza se o sistema mudar (quando em "system")
    const onChange = () => {
      if ((localStorage.getItem('theme') as Mode) === 'system') {
        const darkNow = mql.matches
        setIsDark(darkNow)
        document.documentElement.classList[darkNow ? 'add' : 'remove']('dark')
      }
    }
    mql.addEventListener?.('change', onChange)
    // fallback para browsers antigos
    // @ts-ignore
    mql.addListener?.(onChange)

    return () => {
      mql.removeEventListener?.('change', onChange)
      // @ts-ignore
      mql.removeListener?.(onChange)
    }
  }, [])

  function toggle() {
    // alterna dark <-> light (mantendo simples)
    const next: Mode = isDark ? 'light' : 'dark'
    setMode(next)
    localStorage.setItem('theme', next)
    setIsDark(next === 'dark')
    document.documentElement.classList[next === 'dark' ? 'add' : 'remove']('dark')
  }

  return (
    <button onClick={toggle} className="badge" aria-label="Alternar tema">
      {isDark ? '🌙' : '☀️'} <span className="hidden sm:inline">{isDark ? 'Escuro' : 'Claro'}</span>
    </button>
  )
}
