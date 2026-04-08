export function SubscriptionLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-gray-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-2/3 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
            <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-slate-700" />
          </div>
          <div className="mt-4 h-16 rounded-xl bg-gray-100 dark:bg-slate-800" />
          <div className="mt-3 flex gap-2">
            <div className="h-11 flex-1 rounded-xl bg-gray-200 dark:bg-slate-700" />
            <div className="h-11 flex-1 rounded-xl bg-gray-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}
