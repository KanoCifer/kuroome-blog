interface SubscriptionErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function SubscriptionErrorState({
  message,
  onRetry,
}: SubscriptionErrorStateProps) {
  return (
    <div className="border-destructive/30 bg-destructive/10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center">
      <p className="text-destructive text-base font-semibold">加载失败</p>
      <p className="text-destructive/80 mt-1 text-sm">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-destructive hover:bg-destructive/90 mt-4 min-h-11 rounded-xl px-4 text-sm font-medium text-white transition"
      >
        重试
      </button>
    </div>
  );
}
