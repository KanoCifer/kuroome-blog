export function SubscriptionEmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/80 p-6 text-center dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-base font-semibold text-gray-900 dark:text-white">
        暂无订阅
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        当前没有可管理的订阅项目，请先新增订阅。
      </p>
    </div>
  );
}
