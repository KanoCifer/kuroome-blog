import { motion } from 'framer-motion';
import type {
  TestNotificationPayload,
  UpdateSubscriptionPayload,
} from '@/api/subscriptionGateway';

import type { Subscription } from '../types';
import { SubscriptionCard } from './SubscriptionCard';

interface SubscriptionListProps {
  subscriptions: Subscription[];
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

export function SubscriptionList({
  subscriptions,
  onToggleStatus,
  pendingId,
  onUpdateSubscription,
  onUpdateReminderConfig,
  onTestNotification,
}: SubscriptionListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="space-y-3"
    >
      {subscriptions.map((subscription) => (
        <SubscriptionCard
          key={`${subscription.id}-${subscription.updated_at}`}
          subscription={subscription}
          onToggleStatus={onToggleStatus}
          pendingId={pendingId}
          onUpdateSubscription={onUpdateSubscription}
          onUpdateReminderConfig={onUpdateReminderConfig}
          onTestNotification={onTestNotification}
        />
      ))}
    </motion.div>
  );
}
