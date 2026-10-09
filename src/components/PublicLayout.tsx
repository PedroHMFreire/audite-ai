import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import Footer from './Footer'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '@/contexts'

/** Moldura das páginas públicas: landing, termos, privacidade. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-paper/90 backdrop-blur">
        <div className="container-safe flex h-14 items-center justify-between">
          <Link to="/" aria-label="Audite — página inicial"><Logo /></Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Acesso">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-sm">Abrir o Audite</Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-quiet btn-sm">Entrar</Link>
                <Link to="/cadastro" className="btn btn-sm">Teste grátis</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <PublicLayout>
      <article className="container-safe max-w-3xl py-12 sm:py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-zinc-500">Última atualização: {updated}</p>
        <div className="legal mt-10 space-y-8 text-[15px] leading-relaxed text-zinc-700">{children}</div>
      </article>
    </PublicLayout>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  )
}
