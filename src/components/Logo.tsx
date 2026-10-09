/**
 * Marca do Audite: a letra A atravessada pelo feixe do leitor de código de
 * barras. O símbolo tem cores fixas (fundo azul da marca, traço branco); o
 * nome acompanha o tema.
 */
export function LogoMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="24" height="24" rx="6.5" fill="#2B50FF" />
      <path d="M7.4 17.6 12 6.4l4.6 11.2" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.6 13.7h14.8" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export default function Logo({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex select-none items-center gap-2 text-ink ${className}`}>
      <LogoMark size={size} />
      <span className="font-display font-bold leading-none tracking-tight" style={{ fontSize: size * 0.88 }}>
        audite<span className="text-brand-text">.ai</span>
      </span>
    </span>
  )
}
