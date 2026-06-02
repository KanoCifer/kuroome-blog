export function SubscriptionEmptyState() {
  return (
    <div className="border-border bg-secondary rounded-xl border border-dashed p-8 text-center">
      <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
        <svg
          className="text-muted-foreground h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <p className="text-foreground mb-1 font-semibold">暂无订阅</p>
      <p className="text-muted-foreground text-sm">
        点击上方按钮添加您的第一个订阅
      </p>
    </div>
  );
}
