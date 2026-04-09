import type {
  TestNotificationPayload,
  UpdateSubscriptionPayload,
} from '@/api/subscriptionGateway';
import { formatDate } from '@/utils/formatdate';
import { useState } from 'react';

import type { Subscription, SubscriptionStatus } from '../types';
import { SubscriptionEditForm } from './SubscriptionEditForm';
import { SubscriptionModal } from './SubscriptionModal';
import { SubscriptionNotifyForm } from './SubscriptionNotifyForm';

interface SubscriptionCardProps {
  subscription: Subscription;
  onToggleStatus: (subscription: Subscription) => void;
  pendingId: number | null;
  onUpdateSubscription: (
    subId: number,
    payload: UpdateSubscriptionPayload,
  ) => Promise<boolean>;
  onUpdateReminderConfig: (
    subId: number,
    reminderData: Record<string, unknown>,
  ) => Promise<boolean>;
  onTestNotification: (
    subId: number,
    payload: TestNotificationPayload,
  ) => Promise<Record<string, boolean> | null>;
}

const cycleLabelMap: Record<string, string> = {
  monthly: '月付',
  quarterly: '季付',
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

type ModalTab = 'edit' | 'notify';

export function SubscriptionCard({
  subscription,
  onToggleStatus,
  pendingId,
  onUpdateSubscription,
  onUpdateReminderConfig,
  onTestNotification,
}: SubscriptionCardProps) {
  const normalizedStatus = normalizeStatus(subscription.status);
  const isPending = pendingId === subscription.id;
  const isActive = normalizedStatus === 'active';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('edit');

  const openModal = (tab: ModalTab) => {
    setActiveTab(tab);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <article className="bg-white dark:bg-slate-800/70 dark:backdrop-blur-xl squircle p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:border-white/10 dark:shadow-xl dark:shadow-slate-900/50 border border-slate-100">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Logo placeholder */}
            <div className="w-14 h-14 bg-white dark:bg-slate-700/80 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden border border-slate-100 dark:border-slate-600/50">
              <span className="text-2xl font-bold text-slate-400 dark:text-blue-400">
                {subscription.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {subscription.name}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                {subscription.provider} •{' '}
                {getCycleLabel(subscription.billing_cycle)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-xl text-[#00288e] dark:text-blue-400">
              {formatPrice(subscription.price, subscription.currency)}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider font-bold">
              Per{' '}
              {subscription.billing_cycle === 'monthly'
                ? 'Month'
                : subscription.billing_cycle === 'yearly'
                  ? 'Year'
                  : subscription.billing_cycle === 'quarterly'
                    ? 'Quarter'
                    : 'Period'}
            </p>
          </div>
        </div>

        {/* Next Billing Banner */}
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            下次扣费:{' '}
          </span>
          <span className="text-slate-900 dark:text-slate-200 text-sm font-bold">
            {formatDate(subscription.next_billing_date, 'YYYY-MM-DD')}
          </span>
          <span className="text-slate-400 dark:text-slate-500 text-xs">
            ({getDaysUntil(subscription.next_billing_date)} 天后)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => onToggleStatus(subscription)}
            className="py-3 px-4 rounded-full bg-[#00288e] dark:bg-blue-600 text-white text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? '处理中...' : isActive ? '暂停订阅' : '恢复订阅'}
          </button>
          <button
            type="button"
            onClick={() => openModal('edit')}
            className="py-3 px-4 rounded-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 text-sm font-bold border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95 transition-all"
          >
            编辑与通知
          </button>
        </div>

        {/* Subscription Modal */}
        <SubscriptionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-gray-100 p-1 dark:border-slate-700 dark:bg-slate-800/70">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activeTab === 'edit'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-gray-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                基础信息
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notify')}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activeTab === 'notify'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-gray-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                通知配置
              </button>
            </div>

            {activeTab === 'edit' ? (
              <SubscriptionEditForm
                subscription={subscription}
                onUpdate={onUpdateSubscription}
                onNext={() => setActiveTab('notify')}
              />
            ) : (
              <SubscriptionNotifyForm
                subscription={subscription}
                onUpdateConfig={onUpdateReminderConfig}
                onTest={onTestNotification}
                onPrev={() => setActiveTab('edit')}
              />
            )}
          </div>
        </SubscriptionModal>
      </article>
    </div>
  );
}
