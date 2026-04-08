import type { AxiosResponse } from 'axios';

import request from '@/api/request';

export interface Subscription {
  id: number;
  name: string;
  provider: string;
  price: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string;
  reminder_config: Record<string, unknown> | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionPayload {
  name: string;
  provider: string;
  price: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string;
  reminder_config?: Record<string, unknown> | null;
  status: string;
  notes?: string | null;
}

export interface UpdateSubscriptionPayload {
  name?: string;
  provider?: string;
  price?: number;
  currency?: string;
  billing_cycle?: string;
  next_billing_date?: string;
  reminder_config?: Record<string, unknown> | null;
  status?: string;
  notes?: string | null;
}

export interface TestNotificationPayload {
  channels: string[];
  config: Record<string, unknown>;
}

export interface SubscriptionListResponse {
  subscriptions: Subscription[];
}

export interface SubscriptionResponse {
  subscription: Subscription;
}

export interface UpcomingResponse {
  subscriptions: Subscription[];
}

export interface subscriptionGateway {
  getSubscriptions(): Promise<AxiosResponse<SubscriptionListResponse>>;
  getSubscription(subId: number): Promise<AxiosResponse<SubscriptionResponse>>;
  createSubscription(
    payload: CreateSubscriptionPayload,
  ): Promise<AxiosResponse<SubscriptionResponse>>;
  updateSubscription(
    subId: number,
    payload: UpdateSubscriptionPayload,
  ): Promise<AxiosResponse<SubscriptionResponse>>;
  deleteSubscription(
    subId: number,
  ): Promise<AxiosResponse<{ message: string }>>;
  updateStatus(
    subId: number,
    newStatus: string,
  ): Promise<AxiosResponse<SubscriptionResponse>>;
  updateReminders(
    subId: number,
    reminderData: Record<string, unknown>,
  ): Promise<AxiosResponse<SubscriptionResponse>>;
  getUpcomingSubscriptions(): Promise<AxiosResponse<UpcomingResponse>>;
  testNotification(
    subId: number,
    payload: TestNotificationPayload,
  ): Promise<AxiosResponse<{ results: Record<string, boolean> }>>;
}

export const subscriptionGateway = (): subscriptionGateway => {
  return {
    async getSubscriptions() {
      return request.get('v2/subscriptions') as Promise<
        AxiosResponse<SubscriptionListResponse>
      >;
    },

    async getSubscription(subId: number) {
      return request.get(`v2/subscriptions/${subId}`) as Promise<
        AxiosResponse<SubscriptionResponse>
      >;
    },

    async createSubscription(payload: CreateSubscriptionPayload) {
      return request.post('v2/subscriptions', payload) as Promise<
        AxiosResponse<SubscriptionResponse>
      >;
    },

    async updateSubscription(
      subId: number,
      payload: UpdateSubscriptionPayload,
    ) {
      return request.put(`v2/subscriptions/${subId}`, payload) as Promise<
        AxiosResponse<SubscriptionResponse>
      >;
    },

    async deleteSubscription(subId: number) {
      return request.delete(`v2/subscriptions/${subId}`) as Promise<
        AxiosResponse<{ message: string }>
      >;
    },

    async updateStatus(subId: number, newStatus: string) {
      return request.patch(
        `v2/subscriptions/${subId}/status`,
        newStatus,
      ) as Promise<AxiosResponse<SubscriptionResponse>>;
    },

    async updateReminders(
      subId: number,
      reminderData: Record<string, unknown>,
    ) {
      return request.patch(
        `v2/subscriptions/${subId}/reminders`,
        reminderData,
      ) as Promise<AxiosResponse<SubscriptionResponse>>;
    },

    async getUpcomingSubscriptions() {
      return request.get('v2/subscriptions/upcoming') as Promise<
        AxiosResponse<UpcomingResponse>
      >;
    },

    async testNotification(subId: number, payload: TestNotificationPayload) {
      return request.post(
        `v2/subscriptions/${subId}/test-notification`,
        payload,
      ) as Promise<AxiosResponse<{ results: Record<string, boolean> }>>;
    },
  };
};
