import type { Device } from '@/services/deviceService';
import { formatDate } from '@/utils/formatdate';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { DailyCost } from './DailyCost';
import { MilestoneConfigForm } from './MilestoneConfigForm';

interface DeviceCardProps {
  device: Device;
  onToggleStatus: (device: Device) => void;
  onDelete: (device: Device) => void;
  onConfigSuccess?: (device: Device) => void;
  pendingId: number | null;
}

function formatPrice(price: number, currency: string): string {
  const normalized = currency?.toUpperCase() ?? 'CNY';
  if (normalized === 'CNY') {
    return `¥${price.toFixed(2)}`;
  }
  return `$${price.toFixed(2)}`;
}

const calcSpendPerDay = (device: Device): number => {
  const daysInUse = Math.max(
    1,
    dayjs().diff(dayjs(device.purchase_date), 'day'),
  );
  return device.price / daysInUse;
};

export function DeviceCard({
  device,
  onToggleStatus,
  onDelete,
  onConfigSuccess,
  pendingId,
}: DeviceCardProps) {
  const isPending = pendingId === device.id;
  const isActive = device.status === 'active';
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isDailyCostOpen, setIsDailyCostOpen] = useState(false);

  return (
    <AnimatePresence>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        onClick={() => setIsDailyCostOpen(true)}
        className="squircle border-border bg-card border p-6 shadow-lg"
      >
        {/* 分析图表 */}
        <DailyCost
          data={device}
          isOpen={isDailyCostOpen}
          onClose={() => setIsDailyCostOpen(false)}
        />

        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Logo placeholder */}
            <div className="border-border bg-card flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border shadow-inner">
              <span className="text-primary text-2xl font-bold">
                {device.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-foreground text-lg font-bold">
                {device.name}
              </h3>
              {isActive ? (
                <p className="bg-success/10 text-success w-fit rounded-full px-2 py-0.5 text-center text-sm font-medium">
                  使用中
                </p>
              ) : (
                <p className="bg-destructive/10 text-destructive w-fit rounded-full px-2 py-0.5 text-center text-sm font-medium">
                  已退役
                </p>
              )}
              <span className="text-muted-foreground text-xs">
                {formatDate(device.purchase_date, 'YYYY-MM-DD')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-primary text-xl font-bold">
              {formatPrice(device.price, device.currency)}
            </p>
            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              {device.currency}
            </p>
            <p className="font-family-dongfang text-muted-foreground mt-2 text-xs font-bold">
              {`日均 ${formatPrice(calcSpendPerDay(device), device.currency)}/天`}
            </p>
          </div>
        </div>

        {/* Notes Banner */}
        {device.notes && (
          <div className="bg-secondary mb-6 flex items-center gap-2 rounded-2xl px-4 py-3">
            <svg
              className="text-primary h-4 w-4 scale-75"
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
            <span className="text-muted-foreground truncate text-sm font-medium">
              {device.notes}
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(device);
            }}
            className="bg-primary text-primary-foreground rounded-full px-4 py-3 text-sm font-bold shadow-md transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? '处理中...' : isActive ? '标记退役' : '恢复使用'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMilestoneModalOpen(true);
            }}
            className="bg-primary text-primary-foreground rounded-full px-4 py-3 text-sm font-bold shadow-md transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            编辑配置
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(device);
            }}
            className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-full border px-4 py-3 text-sm font-bold transition-all active:scale-95"
          >
            删除设备
          </button>
        </div>
        {/* Milestone Config Modal */}
        {isMilestoneModalOpen && (
          <MilestoneConfigForm
            device={device}
            onClose={() => setIsMilestoneModalOpen(false)}
            onSuccess={(updated) => {
              setIsMilestoneModalOpen(false);
              onConfigSuccess?.(updated);
            }}
          />
        )}
      </motion.article>
    </AnimatePresence>
  );
}
