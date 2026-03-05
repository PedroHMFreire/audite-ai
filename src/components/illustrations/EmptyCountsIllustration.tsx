export function EmptyCountsIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clipboard/Form Background */}
      <rect x="40" y="30" width="120" height="100" rx="8" fill="currentColor" opacity="0.05" />
      <rect x="50" y="40" width="100" height="80" rx="4" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      
      {/* Lines (form fields) */}
      <line x1="60" y1="55" x2="140" y2="55" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <line x1="60" y1="70" x2="130" y2="70" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <line x1="60" y1="85" x2="120" y2="85" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <line x1="60" y1="100" x2="110" y2="100" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      
      {/* Plus icon */}
      <circle cx="100" cy="130" r="15" fill="currentColor" opacity="0.1" />
      <line x1="100" y1="125" x2="100" y2="135" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <line x1="95" y1="130" x2="105" y2="130" stroke="currentColor" strokeWidth="2" opacity="0.4" />
    </svg>
  )
}
