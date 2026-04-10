/**
 * 订阅服务 - 封装订阅相关的业务逻辑
 * @description 提供订阅的增删改查、状态管理、提醒配置、通知测试等功能
 */

import type { AxiosResponse } from 'axios';

import type { ApiResponse } from '@/api/request';
import { extractData } from '@/api/request';
import type {
  CreateSubscriptionPayload,
  Subscription,
  SubscriptionListResponse,
  SubscriptionResponse,
  TestNotificationPayload,
  UpcomingResponse,
  UpdateSubscriptionPayload,
} from '@/api/subscriptionGateway';
import { subscriptionGateway } from '@/api/subscriptionGateway';

/**
 * 订阅服务接口
 * @description 定义订阅服务暴露的所有方法
 */
export interface SubService {
  /** 获取当前用户的所有订阅列表 */
  getSubscriptions(): Promise<Subscription[]>;

  /** 根据 ID 获取单个订阅详情 */
  getSubscription(subId: number): Promise<Subscription>;

  /** 创建新订阅 */
  createSubscription(payload: CreateSubscriptionPayload): Promise<Subscription>;

  /** 更新订阅信息（部分更新） */
  updateSubscription(
    subId: number,
    payload: UpdateSubscriptionPayload,
  ): Promise<Subscription>;

  /** 删除订阅 */
  deleteSubscription(subId: number): Promise<void>;

  /** 更新订阅状态（active/canceled/paused/expired） */
  updateStatus(subId: number, newStatus: string): Promise<Subscription>;

  /** 更新订阅提醒配置（渠道、提前天数等） */
  updateReminders(
    subId: number,
    reminderData: Record<string, unknown>,
  ): Promise<Subscription>;

  /** 获取即将到期的订阅（下次账单日期在一定范围内） */
  getUpcomingSubscriptions(): Promise<Subscription[]>;

  /**
   * 测试订阅通知
   * @param subId 订阅 ID
   * @param payload 测试配置，包含通知渠道和渠道配置
   * @returns 各渠道发送结果 {channelName: success}
   */
  testNotification(
    subId: number,
    payload: TestNotificationPayload,
  ): Promise<Record<string, boolean>>;

  /** 获取用户的全局默认通知配置 */
  getUserGlobalConfig(): Promise<Record<string, unknown>>;

  /** 更新用户的全局默认通知配置 */
  updateUserGlobalConfig(
    configData: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}

/**
 * 订阅服务实例
 * @description 业务逻辑层，负责调用 gateway 并处理响应数据
 */
export const subService = (): SubService => {
  const gateway = subscriptionGateway();

  return {
    async getSubscriptions(): Promise<Subscription[]> {
      const res: AxiosResponse<SubscriptionListResponse> =
        await gateway.getSubscriptions();
      return (
        extractData(
          res as unknown as { data: ApiResponse<unknown> },
        ) as SubscriptionListResponse
      ).subscriptions;
    },

    async getSubscription(subId: number): Promise<Subscription> {
      const res: AxiosResponse<SubscriptionResponse> =
        await gateway.getSubscription(subId);
      return (
        extractData(
          res as unknown as { data: ApiResponse<unknown> },
        ) as SubscriptionResponse
      ).subscription;
    },

    async createSubscription(
      payload: CreateSubscriptionPayload,
    ): Promise<Subscription> {
      const res: AxiosResponse<SubscriptionResponse> =
        await gateway.createSubscription(payload);
      return (
        extractData(
          res as unknown as { data: ApiResponse<unknown> },
        ) as SubscriptionResponse
      ).subscription;
    },

    async updateSubscription(
      subId: number,
      payload: UpdateSubscriptionPayload,
    ): Promise<Subscription> {
      const res: AxiosResponse<SubscriptionResponse> =
        await gateway.updateSubscription(subId, payload);
      return (
        extractData(
          res as unknown as { data: ApiResponse<unknown> },
        ) as SubscriptionResponse
      ).subscription;
    },

    async deleteSubscription(subId: number): Promise<void> {
      await gateway.deleteSubscription(subId);
    },

    async updateStatus(
      subId: number,
      newStatus: string,
    ): Promise<Subscription> {
      const res: AxiosResponse<SubscriptionResponse> =
        await gateway.updateStatus(subId, newStatus);
      return (
        extractData(
          res as unknown as { data: ApiResponse<unknown> },
        ) as SubscriptionResponse
      ).subscription;
    },

    async updateReminders(
      subId: number,
      reminderData: Record<string, unknown>,
    ): Promise<Subscription> {
      const res: AxiosResponse<SubscriptionResponse> =
        await gateway.updateReminders(subId, reminderData);
      return (
        extractData(
          res as unknown as { data: ApiResponse<unknown> },
        ) as SubscriptionResponse
      ).subscription;
    },

    async getUpcomingSubscriptions(): Promise<Subscription[]> {
      const res: AxiosResponse<UpcomingResponse> =
        await gateway.getUpcomingSubscriptions();
      return (
        extractData(
          res as unknown as { data: ApiResponse<unknown> },
        ) as UpcomingResponse
      ).subscriptions;
    },

    async testNotification(
      subId: number,
      payload: TestNotificationPayload,
    ): Promise<Record<string, boolean>> {
      const res: AxiosResponse<{ results: Record<string, boolean> }> =
        await gateway.testNotification(subId, payload);
      return (
        extractData(res as unknown as { data: ApiResponse<unknown> }) as {
          results: Record<string, boolean>;
        }
      ).results;
    },

    async getUserGlobalConfig(): Promise<Record<string, unknown>> {
      const res: AxiosResponse<{ config: Record<string, unknown> }> =
        await gateway.getUserGlobalConfig();
      return (
        extractData(res as unknown as { data: ApiResponse<unknown> }) as {
          config: Record<string, unknown>;
        }
      ).config;
    },

    async updateUserGlobalConfig(
      configData: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      const res: AxiosResponse<{ config: Record<string, unknown> }> =
        await gateway.updateUserGlobalConfig(configData);
      return (
        extractData(res as unknown as { data: ApiResponse<unknown> }) as {
          config: Record<string, unknown>;
        }
      ).config;
    },
  };
};
