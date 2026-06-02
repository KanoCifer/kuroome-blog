export function DeviceEmptyState() {
  return (
    <div className="border-border bg-secondary rounded-xl border border-dashed p-8 text-center">
      <div className="bg-secondary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
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
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      </div>
      <p className="text-foreground mb-1 font-semibold">暂无设备</p>
      <p className="text-muted-foreground text-sm">
        点击上方按钮添加您的第一个设备
      </p>
    </div>
  );
}
