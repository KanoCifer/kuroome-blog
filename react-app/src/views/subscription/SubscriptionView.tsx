import type {
  CreateSubscriptionPayload,
  TestNotificationPayload,
  UpdateSubscriptionPayload,
} from '@/api/subscriptionGateway';
import { subService } from '@/services/subService';
import { useNotificationStore } from '@/stores/notificationState';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  SubscriptionAddForm,
  SubscriptionEmptyState,
  SubscriptionErrorState,
  SubscriptionHeader,
  SubscriptionList,
  SubscriptionLoadingSkeleton,
} from './components';
import type { Subscription } from './types';

function getMonthlyEstimate(subscription: Subscription): number {
  const price = Number(subscription.price) || 0;
  switch (subscription.billing_cycle) {
    case 'yearly':
      return price / 12;
    case 'quarterly':
      return price / 3;
    case 'weekly':
      return (price * 52) / 12;
    case 'daily':
      return price * 30;
    default:
      return price;
  }
}

export default function SubscriptionView() {
  const service = useMemo(() => subService(), []);
  const notifyError = useNotificationStore((state) => state.error);
  const notifySuccess = useNotificationStore((state) => state.success);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await service.getSubscriptions();
      setSubscriptions(data);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : '订阅列表加载失败，请稍后重试。';
      setError(message);
      notifyError(message);
    } finally {
      setIsLoading(false);
    }
  }, [notifyError, service]);

  useEffect(() => {
    void fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleToggleStatus = useCallback(
    async (subscription: Subscription) => {
      const nextStatus = subscription.status === 'active' ? 'paused' : 'active';
      setPendingId(subscription.id);
      try {
        const updated = await service.updateStatus(subscription.id, nextStatus);
        setSubscriptions((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        notifySuccess(nextStatus === 'paused' ? '订阅已暂停' : '订阅已恢复');
      } catch (updateError) {
        notifyError(
          updateError instanceof Error
            ? updateError.message
            : '状态更新失败，请重试。',
        );
      } finally {
        setPendingId(null);
      }
    },
    [notifyError, notifySuccess, service],
  );

  const handleCreateSubscription = useCallback(
    async (payload: CreateSubscriptionPayload) => {
      setIsCreating(true);
      try {
        const created = await service.createSubscription(payload);
        setSubscriptions((prev) => [created, ...prev]);
        setError(null);
        notifySuccess('订阅添加成功');
        return true;
      } catch (createError) {
        notifyError(
          createError instanceof Error
            ? createError.message
            : '添加订阅失败，请稍后重试。',
        );
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [notifyError, notifySuccess, service],
  );

  const handleUpdateSubscription = useCallback(
    async (subId: number, payload: UpdateSubscriptionPayload) => {
      try {
        const updated = await service.updateSubscription(subId, payload);
        setSubscriptions((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        notifySuccess('订阅信息已更新');
        return true;
      } catch (updateError) {
        notifyError(
          updateError instanceof Error
            ? updateError.message
            : '更新订阅失败，请稍后重试。',
        );
        return false;
      }
    },
    [notifyError, notifySuccess, service],
  );

  const handleUpdateReminderConfig = useCallback(
    async (subId: number, reminderData: Record<string, unknown>) => {
      try {
        const updated = await service.updateReminders(subId, reminderData);
        setSubscriptions((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        notifySuccess('通知配置已保存');
        return true;
      } catch (updateError) {
        notifyError(
          updateError instanceof Error
            ? updateError.message
            : '保存通知配置失败，请稍后重试。',
        );
        return false;
      }
    },
    [notifyError, notifySuccess, service],
  );

  const handleTestNotification = useCallback(
    async (subId: number, payload: TestNotificationPayload) => {
      try {
        const result = await service.testNotification(subId, payload);
        const successCount = Object.values(result).filter(Boolean).length;
        if (successCount > 0) {
          notifySuccess(`测试通知已发送（成功 ${successCount}/${payload.channels.length}）`);
        } else {
          notifyError('测试通知全部失败，请检查渠道配置。');
        }
        return result;
      } catch (testError) {
        notifyError(
          testError instanceof Error
            ? testError.message
            : '测试通知失败，请稍后重试。',
        );
        return null;
      }
    },
    [notifyError, notifySuccess, service],
  );

  const activeCount = subscriptions.filter(
    (item) => item.status === 'active',
  ).length;
  const monthlyEstimate = subscriptions
    .filter((item) => item.status === 'active')
    .reduce((total, item) => total + getMonthlyEstimate(item), 0);

  return (
    <div className="min-h-dvh bg-gray-50 pb-24 dark:bg-slate-950">
      <SubscriptionHeader
        totalCount={subscriptions.length}
        activeCount={activeCount}
        monthlyEstimate={monthlyEstimate}
        isRefreshing={isLoading}
        onRefresh={() => {
          void fetchSubscriptions();
        }}
      />

      <main className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="min-h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-blue-400"
          >
            新增订阅
          </button>
        </div>

        <SubscriptionAddForm
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          isSubmitting={isCreating}
          onCreate={handleCreateSubscription}
        />

        {isLoading ? (
          <SubscriptionLoadingSkeleton />
        ) : error ? (
          <SubscriptionErrorState
            message={error}
            onRetry={() => {
              void fetchSubscriptions();
            }}
          />
        ) : subscriptions.length === 0 ? (
          <SubscriptionEmptyState />
        ) : (
          <SubscriptionList
            subscriptions={subscriptions}
            onToggleStatus={handleToggleStatus}
            pendingId={pendingId}
            onUpdateSubscription={handleUpdateSubscription}
            onUpdateReminderConfig={handleUpdateReminderConfig}
            onTestNotification={handleTestNotification}
          />
        )}
      </main>
    </div>
  );
}
