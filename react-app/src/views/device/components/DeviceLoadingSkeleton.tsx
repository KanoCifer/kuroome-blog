export function DeviceLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Card skeleton */}
      <div className="border-border bg-background animate-pulse rounded-xl border p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-secondary h-14 w-14 rounded-2xl" />
            <div className="space-y-2">
              <div className="bg-secondary h-5 w-32 rounded-full" />
              <div className="bg-secondary h-3 w-20 rounded-full" />
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="bg-secondary h-6 w-16 rounded" />
            <div className="bg-secondary h-3 w-12 rounded" />
          </div>
        </div>
        <div className="bg-secondary mb-6 h-12 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary h-11 rounded-full" />
          <div className="bg-secondary h-11 rounded-full" />
        </div>
      </div>

      {/* Card skeleton 2 */}
      <div className="border-border bg-background animate-pulse rounded-xl border p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-secondary h-14 w-14 rounded-2xl" />
            <div className="space-y-2">
              <div className="bg-secondary h-5 w-24 rounded-full" />
              <div className="bg-secondary h-3 w-16 rounded-full" />
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="bg-secondary h-6 w-20 rounded" />
            <div className="bg-secondary h-3 w-12 rounded" />
          </div>
        </div>
        <div className="bg-secondary mb-6 h-12 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary h-11 rounded-full" />
          <div className="bg-secondary h-11 rounded-full" />
        </div>
      </div>
    </div>
  );
}
