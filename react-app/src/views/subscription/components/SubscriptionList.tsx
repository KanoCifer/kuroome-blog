import { motion } from 'framer-motion';

import type { Subscription } from '../types';
import { SubscriptionCard } from './SubscriptionCard';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  onToggleStatus: (subscription: Subscription) => void;
  pendingId: number | null;
}

export function SubscriptionList({
  subscriptions,
  onToggleStatus,
  pendingId,
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
          key={subscription.id}
          subscription={subscription}
          onToggleStatus={onToggleStatus}
          pendingId={pendingId}
        />
      ))}
    </motion.div>
  );
}
