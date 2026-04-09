interface SubscriptionHeaderProps {
  totalCount: number;
  activeCount: number;
  monthlyEstimate: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function SubscriptionHeader({
  isRefreshing,
  onRefresh,
}: SubscriptionHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200/60 bg-white/90 px-4 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 ml-12">
            <h1 className="text-2xl mt-2 font-family-dongfang font-bold text-gray-900 dark:text-white">
              SubTracker | 订阅管理
            </h1>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="min-h-11 rounded-2xl bg-blue-900 px-6 font-family-dongfang text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700"
          >
            {isRefreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>
    </header>
  );
}
