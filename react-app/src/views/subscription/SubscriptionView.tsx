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
          notifySuccess(
            `测试通知已发送（成功 ${successCount}/${payload.channels.length}）`,
          );
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
    <div className="min-h-dvh bg-gray-50 dark:bg-slate-900 pb-24">
      <SubscriptionHeader
        totalCount={subscriptions.length}
        activeCount={activeCount}
        monthlyEstimate={monthlyEstimate}
        isRefreshing={isLoading}
        onRefresh={() => {
          void fetchSubscriptions();
        }}
      />

      <main className="px-6 py-8 space-y-10 max-w-md mx-auto">
        {/* Summary Cards Section */}
        <section className="grid grid-cols-2 gap-4">
          {/* Monthly Estimate (Spans 2) */}
          <div className="col-span-2 bg-white dark:bg-slate-800/70 dark:backdrop-blur-xl squircle p-6 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:shadow-xl dark:shadow-slate-900/50 border border-slate-100">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">月度估算</p>
              <p className="font-bold text-3xl text-[#00288e] dark:text-blue-400 tracking-tight mt-1">
                ¥{monthlyEstimate.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center text-[#00288e] dark:text-blue-400">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
          </div>
          {/* Active */}
          <div className="bg-white dark:bg-slate-800/70 dark:backdrop-blur-xl squircle p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:shadow-xl dark:shadow-slate-900/50 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-emerald-500/20 flex items-center justify-center text-green-600 dark:text-emerald-400 mb-3">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">进行中</p>
            <p className="font-bold text-xl mt-1 text-slate-900 dark:text-white">{activeCount}</p>
          </div>
          {/* Total */}
          <div className="bg-white dark:bg-slate-800/70 dark:backdrop-blur-xl squircle p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:shadow-xl dark:shadow-slate-900/50 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">总订阅</p>
            <p className="font-bold text-xl mt-1 text-slate-900 dark:text-white">{subscriptions.length}</p>
          </div>
        </section>

        {/* Main Action Button */}
        <section>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full py-5 px-6 rounded-full bg-[#00288e] dark:bg-blue-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 dark:shadow-blue-900/40 hover:opacity-90 transition-all active:scale-95"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            新增订阅
          </button>
        </section>

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
