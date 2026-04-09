export function SubscriptionEmptyState() {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-8 border border-dashed border-slate-200 dark:border-slate-700 text-center">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
        <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <p className="font-semibold text-slate-900 dark:text-slate-200 mb-1">
        暂无订阅
      </p>
      <p className="text-sm text-slate-500">
        点击上方按钮添加您的第一个订阅
      </p>
    </div>
  );
}
