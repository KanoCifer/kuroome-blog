interface DeviceErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function DeviceErrorState({ message, onRetry }: DeviceErrorStateProps) {
  return (
    <div className="border-destructive/30 bg-destructive/10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center">
      <p className="text-destructive text-base font-semibold">加载失败</p>
      <p className="text-destructive mt-1 text-sm">{message}</p>
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
