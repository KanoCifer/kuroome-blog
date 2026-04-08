import type { Subscription as SubscriptionEntity } from '@/api/subscriptionGateway';

export type SubscriptionStatus = 'active' | 'paused' | 'canceled' | 'expired';

export type Subscription = SubscriptionEntity;
