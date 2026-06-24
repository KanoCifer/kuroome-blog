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
      <article className="squircle border-border bg-background border p-6 shadow-lg">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Logo placeholder */}
            <div className="border-border bg-background flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border shadow-inner">
              <span className="text-muted-foreground text-2xl font-bold">
                {subscription.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-foreground text-lg font-bold">
                {subscription.name}
              </h3>
              <p className="text-muted-foreground text-xs">
                {subscription.provider} •{' '}
                {getCycleLabel(subscription.billing_cycle)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-primary text-xl font-bold">
              {formatPrice(subscription.price, subscription.currency)}
            </p>
            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-muted-foreground text-sm font-medium">
            下次扣费:{' '}
          </span>
          <span className="text-foreground text-sm font-bold">
            {formatDate(subscription.next_billing_date, 'YYYY-MM-DD')}
          </span>
          <span className="text-muted-foreground text-xs">
            ({getDaysUntil(subscription.next_billing_date)} 天后)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => onToggleStatus(subscription)}
            className="bg-primary text-primary-foreground rounded-full px-4 py-3 text-sm font-bold shadow-md transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? '处理中...' : isActive ? '暂停订阅' : '恢复订阅'}
          </button>
          <button
            type="button"
            onClick={() => openModal('edit')}
            className="border-border bg-background text-foreground hover:bg-muted rounded-full border px-4 py-3 text-sm font-bold transition-all active:scale-95"
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
            <div className="border-border bg-muted grid grid-cols-2 gap-2 rounded-2xl border p-1">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activeTab === 'edit'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/70'
                }`}
              >
                基础信息
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notify')}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activeTab === 'notify'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/70'
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
