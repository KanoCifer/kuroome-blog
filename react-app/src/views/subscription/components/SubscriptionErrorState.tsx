interface SubscriptionErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function SubscriptionErrorState({
  message,
  onRetry,
}: SubscriptionErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-red-200 bg-red-50/60 p-6 text-center dark:border-red-800/50 dark:bg-red-900/20">
      <p className="text-base font-semibold text-red-600 dark:text-red-400">
        加载失败
      </p>
      <p className="mt-1 text-sm text-red-500 dark:text-red-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-11 rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
      >
        重试
      </button>
    </div>
  );
}
