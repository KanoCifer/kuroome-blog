export function DeviceLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Card skeleton */}
      <div className="animate-pulse rounded-xl border border-border bg-card p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-secondary" />
            <div className="space-y-2">
              <div className="h-5 w-32 rounded-full bg-secondary" />
              <div className="h-3 w-20 rounded-full bg-secondary" />
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="h-6 w-16 rounded bg-secondary" />
            <div className="h-3 w-12 rounded bg-secondary" />
          </div>
        </div>
        <div className="mb-6 h-12 rounded-2xl bg-secondary" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-11 rounded-full bg-secondary" />
          <div className="h-11 rounded-full bg-secondary" />
        </div>
      </div>

      {/* Card skeleton 2 */}
      <div className="animate-pulse rounded-xl border border-border bg-card p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-secondary" />
            <div className="space-y-2">
              <div className="h-5 w-24 rounded-full bg-secondary" />
              <div className="h-3 w-16 rounded-full bg-secondary" />
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="h-6 w-20 rounded bg-secondary" />
            <div className="h-3 w-12 rounded bg-secondary" />
          </div>
        </div>
        <div className="mb-6 h-12 rounded-2xl bg-secondary" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-11 rounded-full bg-secondary" />
          <div className="h-11 rounded-full bg-secondary" />
        </div>
      </div>
    </div>
  );
}
