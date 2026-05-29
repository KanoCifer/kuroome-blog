export function DeviceEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
        <svg
          className="h-8 w-8 text-muted-foreground"
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
      <p className="mb-1 font-semibold text-foreground">
        暂无设备
      </p>
      <p className="text-sm text-muted-foreground">点击上方按钮添加您的第一个设备</p>
    </div>
  );
}
