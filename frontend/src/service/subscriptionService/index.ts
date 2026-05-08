/**
 * 订阅服务 - 封装订阅相关的业务逻辑
 * @description 提供订阅的增删改查、状态管理、提醒配置、通知测试等功能
 */

import {
  subscriptionGateway,
  type CreateSubscriptionPayload,
  type Subscription,
  type TestNotificationPayload,
  type UpdateSubscriptionPayload,
} from "@/api/subscriptionGateway";

/**
 * 订阅服务接口
 * @description 定义订阅服务暴露的所有方法
 */
export interface SubscriptionService {
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
}

/**
 * 订阅服务实例
 * @description 业务逻辑层，负责调用 gateway 并处理响应数据
 */
export const subscriptionService: SubscriptionService = {
  async getSubscriptions(): Promise<Subscription[]> {
    return subscriptionGateway.getSubscriptions();
  },

  async getSubscription(subId: number): Promise<Subscription> {
    return subscriptionGateway.getSubscription(subId);
  },

  async createSubscription(
    payload: CreateSubscriptionPayload,
  ): Promise<Subscription> {
    return subscriptionGateway.createSubscription(payload);
  },

  async updateSubscription(
    subId: number,
    payload: UpdateSubscriptionPayload,
  ): Promise<Subscription> {
    return subscriptionGateway.updateSubscription(subId, payload);
  },

  async deleteSubscription(subId: number): Promise<void> {
    return subscriptionGateway.deleteSubscription(subId);
  },

  async updateStatus(subId: number, newStatus: string): Promise<Subscription> {
    return subscriptionGateway.updateStatus(subId, newStatus);
  },

  async updateReminders(
    subId: number,
    reminderData: Record<string, unknown>,
  ): Promise<Subscription> {
    return subscriptionGateway.updateReminders(subId, reminderData);
  },

  async getUpcomingSubscriptions(): Promise<Subscription[]> {
    return subscriptionGateway.getUpcomingSubscriptions();
  },

  async testNotification(
    subId: number,
    payload: TestNotificationPayload,
  ): Promise<Record<string, boolean>> {
    return subscriptionGateway.testNotification(subId, payload);
  },
};
