export function SubscriptionLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Card skeleton */}
      <div className="bg-white dark:bg-slate-800/70 dark:backdrop-blur-xl rounded-xl p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:border-white/10 animate-pulse border border-slate-100">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700/80 rounded-2xl" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-slate-100 dark:bg-slate-700/80 rounded-full" />
              <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700/80 rounded-full" />
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="h-6 w-16 bg-slate-100 dark:bg-slate-700/80 rounded" />
            <div className="h-3 w-12 bg-slate-100 dark:bg-slate-700/80 rounded" />
          </div>
        </div>
        <div className="h-12 bg-slate-50 dark:bg-slate-700/50 rounded-2xl mb-6" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-11 bg-slate-100 dark:bg-slate-700/80 rounded-full" />
          <div className="h-11 bg-slate-100 dark:bg-slate-700/80 rounded-full" />
        </div>
      </div>

      {/* Card skeleton 2 */}
      <div className="bg-white dark:bg-slate-800/70 dark:backdrop-blur-xl rounded-xl p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:border-white/10 animate-pulse border border-slate-100">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700/80 rounded-2xl" />
            <div className="space-y-2">
              <div className="h-5 w-24 bg-slate-100 dark:bg-slate-700/80 rounded-full" />
              <div className="h-3 w-16 bg-slate-100 dark:bg-slate-700/80 rounded-full" />
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="h-6 w-20 bg-slate-100 dark:bg-slate-700/80 rounded" />
            <div className="h-3 w-12 bg-slate-100 dark:bg-slate-700/80 rounded" />
          </div>
        </div>
        <div className="h-12 bg-slate-50 dark:bg-slate-700/50 rounded-2xl mb-6" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-11 bg-slate-100 dark:bg-slate-700/80 rounded-full" />
          <div className="h-11 bg-slate-100 dark:bg-slate-700/80 rounded-full" />
        </div>
      </div>
    </div>
  );
}
