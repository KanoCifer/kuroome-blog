export function DeviceEmptyState() {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-8 border border-dashed border-slate-200 dark:border-slate-700 text-center">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-slate-400 dark:text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      </div>
      <p className="font-semibold text-slate-900 dark:text-slate-200 mb-1">
        暂无设备
      </p>
      <p className="text-sm text-slate-500">
        点击上方按钮添加您的第一个设备
      </p>
    </div>
  );
}
