/**
 * 订阅页面表单状态
 */
export interface SubscriptionFormState {
  name: string;
  provider: string;
  price: string;
  currency: string;
  billing_cycle: string;
  next_billing_date: string;
  status: string;
  notes: string;
}

/**
 * 订阅提醒表单状态
 */
export interface ReminderFormState {
  channels: string[];
  days_30: boolean;
  days_7: boolean;
  days_3: boolean;
  days_1: boolean;
  day_of: boolean;
  email: string;
  feishu_webhook_url: string;
  bark_device_key: string;
}

/** 计费周期选项 */
export interface CycleOption {
  value: string;
  label: string;
}

/** 订阅状态选项 */
export interface StatusOption {
  value: string;
  label: string;
}

/** 通知渠道选项 */
export interface ChannelOption {
  value: string;
  label: string;
}

/** 提醒时间点选项 */
export interface ReminderPointOption {
  key: keyof Pick<
    ReminderFormState,
    'days_30' | 'days_7' | 'days_3' | 'days_1' | 'day_of'
  >;
  label: string;
}

/** 订阅状态显示元信息 */
export interface SubscriptionStatusMeta {
  label: string;
  dotClass: string;
  badgeClass: string;
}
