interface SubscriptionHeaderProps {
  totalCount: number;
  activeCount: number;
  monthlyEstimate: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function SubscriptionHeader({
  totalCount,
  activeCount,
  monthlyEstimate,
  isRefreshing,
  onRefresh,
}: SubscriptionHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200/60 bg-white/90 px-4 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 ml-12">
            <p className="text-xs font-semibold tracking-wide text-indigo-500 uppercase">
              Subscription
            </p>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              订阅管理
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              查看下次扣费时间与状态，快速暂停或恢复订阅。
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {isRefreshing ? '刷新中...' : '刷新'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl bg-gray-100 px-3 py-2 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
            <p className="text-[11px] tracking-wide uppercase">总订阅</p>
            <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
              {totalCount}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <p className="text-[11px] tracking-wide uppercase">进行中</p>
            <p className="mt-1 text-base font-semibold">{activeCount}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 px-3 py-2 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            <p className="text-[11px] tracking-wide uppercase">月度估算</p>
            <p className="mt-1 text-base font-semibold">
              ${monthlyEstimate.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
