export default function Logo({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex select-none items-center gap-2 text-ink ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        <rect width="24" height="24" rx="6" fill="currentColor" />
        <path d="M7 12.5l3.2 3.2L17 8.8" stroke="#FAFAF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display leading-none tracking-tight" style={{ fontSize: size * 1.05 }}>
        Audite
      </span>
    </span>
  )
}
