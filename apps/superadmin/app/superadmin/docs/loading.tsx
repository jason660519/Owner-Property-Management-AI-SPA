export default function DocsLoading() {
  return (
    <div className="p-6 space-y-4">
      {/* Title skeleton */}
      <div className="h-8 w-48 bg-bg-tertiary rounded-md animate-pulse" />
      <div className="h-4 w-96 bg-bg-tertiary rounded-md animate-pulse" />
      
      {/* Content skeleton */}
      <div className="flex gap-4 mt-6 h-[calc(100vh-16rem)]">
        {/* Sidebar skeleton */}
        <div className="w-72 bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3">
          <div className="h-9 bg-bg-tertiary rounded-lg animate-pulse" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 bg-bg-tertiary rounded animate-pulse" />
              <div
                className="h-4 bg-bg-tertiary rounded animate-pulse"
                style={{ width: `${60 + ((i * 37) % 80)}px` }}
              />
            </div>
          ))}
        </div>
        {/* Content skeleton */}
        <div className="flex-1 bg-bg-secondary border border-border-default rounded-xl p-8 space-y-4">
          <div className="h-6 w-64 bg-bg-tertiary rounded animate-pulse" />
          <div className="h-4 w-full bg-bg-tertiary rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-bg-tertiary rounded animate-pulse" />
          <div className="h-4 w-4/6 bg-bg-tertiary rounded animate-pulse" />
          <div className="h-32 w-full bg-bg-tertiary rounded animate-pulse mt-4" />
        </div>
      </div>
    </div>
  );
}
