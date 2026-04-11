import type { Device } from '@/services/deviceService';
import { formatDate } from '@/utils/formatdate';

interface DeviceCardProps {
  device: Device;
  onToggleStatus: (device: Device) => void;
  onDelete: (device: Device) => void;
  pendingId: number | null;
}

function formatPrice(price: number, currency: string): string {
  const normalized = currency?.toUpperCase() ?? 'CNY';
  if (normalized === 'CNY') {
    return `¥${price.toFixed(2)}`;
  }
  return `$${price.toFixed(2)}`;
}

export function DeviceCard({
  device,
  onToggleStatus,
  onDelete,
  pendingId,
}: DeviceCardProps) {
  const isPending = pendingId === device.id;
  const isActive = device.status === 'active';

  return (
    <article className="bg-white dark:bg-slate-800/70 dark:backdrop-blur-xl squircle p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:border-white/10 dark:shadow-xl dark:shadow-slate-900/50 border border-slate-100">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Logo placeholder */}
          <div className="w-14 h-14 bg-white dark:bg-slate-700/80 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden border border-slate-100 dark:border-slate-600/50">
            <span className="text-2xl font-bold text-slate-400 dark:text-blue-400">
              {device.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              {device.name}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              {isActive ? '使用中' : '已退役'} •{' '}
              {formatDate(device.purchase_date, 'YYYY-MM-DD')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-xl text-[#00288e] dark:text-blue-400">
            {formatPrice(device.price, device.currency)}
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider font-bold">
            {device.currency}
          </p>
        </div>
      </div>

      {/* Notes Banner */}
      {device.notes && (
        <div className="flex items-center gap-2 py-3 px-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl mb-6">
          <svg
            className="w-4 h-4 text-[#00288e] dark:text-blue-400 scale-75"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-slate-500 dark:text-slate-400 text-sm font-medium truncate">
            {device.notes}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onToggleStatus(device)}
          className="py-3 px-4 rounded-full bg-[#00288e] dark:bg-blue-600 text-white text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? '处理中...' : isActive ? '标记退役' : '恢复使用'}
        </button>
        <button
          type="button"
          onClick={() => onDelete(device)}
          className="py-3 px-4 rounded-full bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 text-sm font-bold border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all"
        >
          删除设备
        </button>
      </div>
    </article>
  );
}
