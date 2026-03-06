export function EmptyScheduleIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Calendar */}
      <rect x="40" y="40" width="120" height="80" rx="6" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2" />
      
      {/* Days of week headers */}
      <line x1="50" y1="60" x2="170" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      
      {/* Calendar grid */}
      <g opacity="0.2">
        {/* Vertical lines */}
        <line x1="74" y1="60" x2="74" y2="110" stroke="currentColor" strokeWidth="0.5" />
        <line x1="98" y1="60" x2="98" y2="110" stroke="currentColor" strokeWidth="0.5" />
        <line x1="122" y1="60" x2="122" y2="110" stroke="currentColor" strokeWidth="0.5" />
        <line x1="146" y1="60" x2="146" y2="110" stroke="currentColor" strokeWidth="0.5" />
        
        {/* Horizontal lines */}
        <line x1="50" y1="75" x2="170" y2="75" stroke="currentColor" strokeWidth="0.5" />
        <line x1="50" y1="90" x2="170" y2="90" stroke="currentColor" strokeWidth="0.5" />
      </g>

      {/* Question mark in center */}
      <circle cx="100" cy="125" r="14" fill="currentColor" opacity="0.1" />
      <text x="100" y="132" textAnchor="middle" fontSize="16" fill="currentColor" opacity="0.4" fontWeight="bold">
        ?
      </text>
    </svg>
  )
}
