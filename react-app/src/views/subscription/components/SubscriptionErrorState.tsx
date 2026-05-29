interface SubscriptionErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function SubscriptionErrorState({
  message,
  onRetry,
}: SubscriptionErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-destructive/30 bg-destructive/10 p-6 text-center">
      <p className="text-base font-semibold text-destructive">
        加载失败
      </p>
      <p className="mt-1 text-sm text-destructive/80">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-11 rounded-xl bg-destructive px-4 text-sm font-medium text-white transition hover:bg-destructive/90"
      >
        重试
      </button>
    </div>
  );
}
