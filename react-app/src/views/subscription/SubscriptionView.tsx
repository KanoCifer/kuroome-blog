import { subService } from '@/services/subService';
import { useNotificationStore } from '@/stores/notificationState';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
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

      <main className="mx-auto w-full max-w-2xl px-4 pt-6">
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
          />
        )}
      </main>
    </div>
  );
}
