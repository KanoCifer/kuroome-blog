import type {
  CreateSubscriptionPayload,
  TestNotificationPayload,
  UpdateSubscriptionPayload,
} from '@/api/subscriptionGateway';
import { subService } from '@/services/subService';
import { useNotificationStore } from '@/stores/notificationState';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  SubscriptionAddForm,
  SubscriptionEmptyState,
  SubscriptionErrorState,
  SubscriptionHeader,
  SubscriptionList,
  SubscriptionLoadingSkeleton,
} from './components';
import ConfigManage from './components/ConfigManage';
import { PriceAnalytics } from './components/PriceAnalytics';
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
  const navigate = useNavigate();
  const service = useMemo(() => subService(), []);
  const notifyError = useNotificationStore((state) => state.error);
  const notifySuccess = useNotificationStore((state) => state.success);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <motion.div className="bg-secondary/95 min-h-dvh pb-24">
      <SubscriptionHeader
        onClick={() => {
          navigate('/device-tracker');
        }}
      />

      <motion.main
        className="mx-auto max-w-md space-y-10 px-6 py-8"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Summary Cards Section */}
        <section className="grid grid-cols-2 gap-4">
          {/* Monthly Estimate (Spans 2) */}
          <div
            onClick={() => setIsAnalyticsOpen(true)}
            className="squircle border-border bg-card col-span-2 flex items-center justify-between border p-6 shadow-lg"
          >
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                月度估算
              </p>
              <p className="text-primary mt-1 text-3xl font-bold tracking-tight">
                ¥{monthlyEstimate.toFixed(2)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">点击查看分析</p>
            </div>
            <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
              <svg
                className="h-6 w-6"
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
          {/* 分析图表 */}
          <PriceAnalytics
            data={subscriptions}
            isOpen={isAnalyticsOpen}
            onClose={() => setIsAnalyticsOpen(false)}
          />

          {/* Active */}
          <div className="squircle border-border bg-card border p-5 shadow-lg">
            <div className="bg-success/10 text-success mb-3 flex h-10 w-10 items-center justify-center rounded-full">
              <svg
                className="h-5 w-5"
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
            <p className="text-muted-foreground text-xs font-medium">进行中</p>
            <p className="text-foreground mt-1 text-xl font-bold">
              {activeCount}
            </p>
          </div>
          {/* Total */}
          <div className="squircle border-border bg-card border p-5 shadow-lg">
            <div className="bg-warning/10 text-warning mb-3 flex h-10 w-10 items-center justify-center rounded-full">
              <svg
                className="h-5 w-5"
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
            <p className="text-muted-foreground text-xs font-medium">总订阅</p>
            <p className="text-foreground mt-1 text-xl font-bold">
              {subscriptions.length}
            </p>
          </div>
        </section>

        {/* Main Action Button */}
        <section className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary text-primary-foreground shadow-primary/20 flex w-full items-center justify-center gap-2 rounded-full px-6 py-5 font-bold shadow-lg transition-all hover:opacity-90 active:scale-95"
          >
            <svg
              className="h-6 w-6"
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
          <ConfigManage />
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
      </motion.main>

      <section className="mx-auto max-w-md px-6 py-8"></section>
    </motion.div>
  );
}
