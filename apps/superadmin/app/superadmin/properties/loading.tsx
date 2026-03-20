// Skeleton loading UI shown while properties page fetches data
export default function PropertiesLoading() {
  return (
    <div className="flex-1 flex flex-col gap-4 px-6 pt-6 pb-0 animate-pulse">
      {/* Filter bar */}
      <div className="shrink-0 flex items-center justify-between gap-4">
        <div className="h-9 w-72 bg-bg-secondary border border-border-default rounded-lg" />
        <div className="flex items-center gap-2">
          {[80, 80, 60, 64, 60].map((w, i) => (
            <div
              key={i}
              className="h-9 bg-bg-secondary border border-border-default rounded-md"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>

      {/* Layout controls */}
      <div className="shrink-0 flex justify-end gap-2">
        <div className="h-8 w-20 bg-bg-secondary border border-border-default rounded-full" />
        <div className="h-8 w-20 bg-bg-secondary border border-border-default rounded-full" />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-bg-secondary border border-border-default rounded-lg overflow-hidden flex flex-col">
        {/* Header row */}
        <div className="shrink-0 bg-bg-tertiary border-b border-border-default px-4 py-3 flex items-center gap-4">
          {[72, 90, 200, 72, 380, 92, 72, 110, 64, 100, 92, 92, 168].map((w, i) => (
            <div
              key={i}
              className="h-3 bg-bg-primary rounded"
              style={{ width: w, flexShrink: 0 }}
            />
          ))}
        </div>

        {/* Data rows */}
        <div className="flex-1 divide-y divide-border-default">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              {[72, 90, 200, 72, 380, 92, 72, 110, 64, 100, 92, 92, 168].map((w, j) => (
                <div
                  key={j}
                  className="h-4 bg-bg-tertiary rounded"
                  style={{ width: w, flexShrink: 0, opacity: 1 - i * 0.06 }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="shrink-0 px-4 py-3 border-t border-border-default flex items-center justify-between">
          <div className="h-4 w-32 bg-bg-tertiary rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-16 bg-bg-tertiary border border-border-default rounded" />
            <div className="h-8 w-16 bg-bg-tertiary rounded" />
            <div className="h-8 w-16 bg-bg-tertiary border border-border-default rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
