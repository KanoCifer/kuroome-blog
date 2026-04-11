export function DeviceLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Card skeleton */}
      <div className="animate-pulse rounded-xl border border-slate-100 bg-white p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:border-white/10 dark:bg-slate-800/70 dark:backdrop-blur-xl">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-700/80" />
            <div className="space-y-2">
              <div className="h-5 w-32 rounded-full bg-slate-100 dark:bg-slate-700/80" />
              <div className="h-3 w-20 rounded-full bg-slate-100 dark:bg-slate-700/80" />
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="h-6 w-16 rounded bg-slate-100 dark:bg-slate-700/80" />
            <div className="h-3 w-12 rounded bg-slate-100 dark:bg-slate-700/80" />
          </div>
        </div>
        <div className="mb-6 h-12 rounded-2xl bg-slate-50 dark:bg-slate-700/50" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-11 rounded-full bg-slate-100 dark:bg-slate-700/80" />
          <div className="h-11 rounded-full bg-slate-100 dark:bg-slate-700/80" />
        </div>
      </div>

      {/* Card skeleton 2 */}
      <div className="animate-pulse rounded-xl border border-slate-100 bg-white p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:border-white/10 dark:bg-slate-800/70 dark:backdrop-blur-xl">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-700/80" />
            <div className="space-y-2">
              <div className="h-5 w-24 rounded-full bg-slate-100 dark:bg-slate-700/80" />
              <div className="h-3 w-16 rounded-full bg-slate-100 dark:bg-slate-700/80" />
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="h-6 w-20 rounded bg-slate-100 dark:bg-slate-700/80" />
            <div className="h-3 w-12 rounded bg-slate-100 dark:bg-slate-700/80" />
          </div>
        </div>
        <div className="mb-6 h-12 rounded-2xl bg-slate-50 dark:bg-slate-700/50" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-11 rounded-full bg-slate-100 dark:bg-slate-700/80" />
          <div className="h-11 rounded-full bg-slate-100 dark:bg-slate-700/80" />
        </div>
      </div>
    </div>
  );
}
