import type { Device } from '@/services/deviceService';
import { formatDate } from '@/utils/formatdate';
import { AnimatePresence, motion } from 'framer-motion';

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
    <AnimatePresence>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="squircle border border-slate-100 bg-white p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:border-white/10 dark:bg-slate-800/70 dark:shadow-xl dark:shadow-slate-900/50 dark:backdrop-blur-xl"
      >
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Logo placeholder */}
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-inner dark:border-slate-600/50 dark:bg-slate-700/80">
              <span className="text-2xl font-bold text-slate-400 dark:text-blue-400">
                {device.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {device.name}
              </h3>
              {isActive ? (
                <div className="flex items-center gap-2">
                  <p className="rounded-full bg-green-100 px-2 py-0.5 text-sm font-medium text-green-600 dark:bg-green-700/20 dark:text-emerald-400">
                    使用中
                  </p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    • {formatDate(device.purchase_date, 'YYYY-MM-DD')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="rounded-full bg-red-100 px-2 py-0.5 text-sm font-medium text-red-500 dark:bg-red-700/20 dark:text-red-400">
                    已退役
                  </p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    • {formatDate(device.purchase_date, 'YYYY-MM-DD')}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-[#00288e] dark:text-blue-400">
              {formatPrice(device.price, device.currency)}
            </p>
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              {device.currency}
            </p>
          </div>
        </div>

        {/* Notes Banner */}
        {device.notes && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-700/50">
            <svg
              className="h-4 w-4 scale-75 text-[#00288e] dark:text-blue-400"
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
            <span className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
              {device.notes}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => onToggleStatus(device)}
            className="rounded-full bg-[#00288e] px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600"
          >
            {isPending ? '处理中...' : isActive ? '标记退役' : '恢复使用'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(device)}
            className="rounded-full border border-red-200 bg-red-300/50 px-4 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 active:scale-95 dark:border-red-800 dark:bg-red-700/30 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            删除设备
          </button>
        </div>
      </motion.article>
    </AnimatePresence>
  );
}
