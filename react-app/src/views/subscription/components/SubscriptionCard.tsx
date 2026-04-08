import { formatDate } from '@/utils/formatdate';

import type { Subscription, SubscriptionStatus } from '../types';

interface SubscriptionCardProps {
  subscription: Subscription;
  onToggleStatus: (subscription: Subscription) => void;
  pendingId: number | null;
}

const statusMap: Record<
  SubscriptionStatus,
  { label: string; className: string }
> = {
  active: {
    label: '进行中',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  paused: {
    label: '已暂停',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  canceled: {
    label: '已取消',
    className: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  },
  expired: {
    label: '已过期',
    className:
      'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
  },
};

const cycleLabelMap: Record<string, string> = {
  monthly: '月付',
  yearly: '年付',
  weekly: '周付',
  daily: '日付',
};

function normalizeStatus(status: string): SubscriptionStatus {
  if (status === 'paused' || status === 'canceled' || status === 'expired') {
    return status;
  }
  return 'active';
}

function getCycleLabel(cycle: string): string {
  return cycleLabelMap[cycle] ?? cycle;
}

function formatPrice(price: number, currency: string): string {
  const normalized = currency?.toUpperCase?.() ?? 'USD';
  if (normalized === 'CNY') {
    return `¥${price.toFixed(2)}`;
  }
  return `$${price.toFixed(2)}`;
}

function getDaysUntil(dateValue: string): number {
  const now = new Date();
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return 0;
  const diff = target.getTime() - now.getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

export function SubscriptionCard({
  subscription,
  onToggleStatus,
  pendingId,
}: SubscriptionCardProps) {
  const normalizedStatus = normalizeStatus(subscription.status);
  const statusMeta = statusMap[normalizedStatus];
  const isPending = pendingId === subscription.id;
  const isActive = normalizedStatus === 'active';

  return (
    <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-gray-900 dark:text-white">
            {subscription.name}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {subscription.provider}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-indigo-50 px-3 py-2 dark:bg-indigo-500/10">
        <p className="text-[11px] font-semibold tracking-wide text-indigo-600 uppercase dark:text-indigo-300">
          下次扣费
        </p>
        <p className="mt-1 text-sm font-semibold text-indigo-800 dark:text-indigo-200">
          {formatDate(subscription.next_billing_date)}
        </p>
        <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">
          {getDaysUntil(subscription.next_billing_date)} 天后
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <p>
          <span className="text-gray-500 dark:text-gray-400">价格：</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatPrice(subscription.price, subscription.currency)}
          </span>
        </p>
        <p className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-slate-800">
          {getCycleLabel(subscription.billing_cycle)}
        </p>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onToggleStatus(subscription)}
          className="min-h-11 flex-1 rounded-xl bg-gray-900 px-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {isPending ? '处理中...' : isActive ? '暂停订阅' : '恢复订阅'}
        </button>
      </div>
    </article>
  );
}
