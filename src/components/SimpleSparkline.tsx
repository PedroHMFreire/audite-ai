export function SimpleSparkline({ 
  data, 
  color = 'blue'
}: { 
  data: number[]
  color?: 'green' | 'orange' | 'red' | 'blue'
}) {
  if (data.length === 0) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const colorMap = {
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
    blue: 'text-blue-500'
  }

  return (
    <svg
      viewBox={`0 0 ${data.length * 10} 40`}
      className={`w-full h-10 ${colorMap[color]}`}
      preserveAspectRatio="none"
    >
      <polyline
        points={data
          .map((value, i) => {
            const y = 40 - ((value - min) / range) * 40
            return `${i * 10},${y}`
          })
          .join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
