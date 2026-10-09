/**
 * Tema claro/escuro. A preferência fica no aparelho; "system" acompanha o
 * sistema operacional. Quem pinta de fato é o atributo `data-theme` em <html>
 * (ver as variáveis em styles.css). `public/theme.js` faz a primeira aplicação
 * antes de o app carregar.
 */
import { useSyncExternalStore } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'audite-theme'
const listeners = new Set<() => void>()

const systemDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

export function getThemePref(): ThemePref {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

function apply() {
  const pref = getThemePref()
  const dark = pref === 'dark' || (pref === 'system' && systemDark())
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0C0D10' : '#F7F8FA')
  listeners.forEach((l) => l())
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch { /* sem armazenamento: vale só nesta visita */ }
  apply()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark'

/** Preferência salva e o tema que está de fato na tela. */
export function useTheme() {
  const pref = useSyncExternalStore(subscribe, getThemePref, () => 'system' as ThemePref)
  const dark = useSyncExternalStore(subscribe, isDark, () => false)
  return { pref, dark }
}

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply)
  apply()
}
