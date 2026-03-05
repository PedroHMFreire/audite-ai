export function SkeletonLoader() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="card flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 animate-pulse" />
            <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2 animate-pulse" />
          </div>
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-16 animate-pulse" />
        </div>
      ))}
    </div>
  )
}
