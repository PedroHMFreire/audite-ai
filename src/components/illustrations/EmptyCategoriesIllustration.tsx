export function EmptyCategoriesIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tags/Labels */}
      <g>
        {/* Tag 1 */}
        <path
          d="M 50 60 L 65 50 L 80 60 L 75 75 L 60 75 Z"
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
        
        {/* Tag 2 */}
        <path
          d="M 120 50 L 135 40 L 150 50 L 145 65 L 130 65 Z"
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
        
        {/* Tag 3 */}
        <path
          d="M 70 90 L 85 80 L 100 90 L 95 105 L 80 105 Z"
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
        
        {/* Tag 4 */}
        <path
          d="M 110 100 L 125 90 L 140 100 L 135 115 L 120 115 Z"
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
      </g>

      {/* Plus icon in center */}
      <circle cx="100" cy="130" r="12" fill="currentColor" fillOpacity="0.1" />
      <line x1="100" y1="126" x2="100" y2="134" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="96" y1="130" x2="104" y2="130" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
    </svg>
  )
}
