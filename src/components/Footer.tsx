import { Link } from 'react-router-dom'
import { COMPANY_NAME, SUPPORT_EMAIL } from '@/lib/plan'

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200">
      <div className="container-safe flex flex-col gap-3 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {COMPANY_NAME}</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Rodapé">
          <Link to="/termos" className="hover:text-ink">Termos de uso</Link>
          <Link to="/privacidade" className="hover:text-ink">Privacidade</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink">{SUPPORT_EMAIL}</a>
        </nav>
      </div>
    </footer>
  )
}
