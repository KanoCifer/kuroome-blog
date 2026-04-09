import type {
  TestNotificationPayload,
  UpdateSubscriptionPayload,
} from '@/api/subscriptionGateway';
import { formatDate } from '@/utils/formatdate';
import { useState } from 'react';

import type { Subscription, SubscriptionStatus } from '../types';
import { SubscriptionModal } from './SubscriptionModal';

interface SubscriptionCardProps {
  subscription: Subscription;
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

const statusMap: Record<
  SubscriptionStatus,
  { label: string; className: string }
> = {
  active: {
    label: '进行中',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  paused: {
    label: '已暂停',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  canceled: {
    label: '已取消',
    className: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  },
  expired: {
    label: '已过期',
    className:
      'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
  },
};

const cycleLabelMap: Record<string, string> = {
  monthly: '月付',
  quarterly: '季付',
  yearly: '年付',
  weekly: '周付',
  daily: '日付',
};

function normalizeStatus(status: string): SubscriptionStatus {
  if (status === 'paused' || status === 'canceled' || status === 'expired') {
    return status;
  }
  return 'active';
}

function getCycleLabel(cycle: string): string {
  return cycleLabelMap[cycle] ?? cycle;
}

function formatPrice(price: number, currency: string): string {
  const normalized = currency?.toUpperCase?.() ?? 'USD';
  if (normalized === 'CNY') {
    return `¥${price.toFixed(2)}`;
  }
  return `$${price.toFixed(2)}`;
}

function getDaysUntil(dateValue: string): number {
  const now = new Date();
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return 0;
  const diff = target.getTime() - now.getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

interface EditFormState {
  name: string;
  provider: string;
  price: string;
  currency: string;
  billingCycle: string;
  nextBillingDate: string;
  status: string;
  notes: string;
}

interface ReminderFormState {
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

type ModalTab = 'edit' | 'notify';

const channelOptions = [
  { value: 'email', label: '邮件' },
  { value: 'feishu', label: '飞书' },
  { value: 'bark', label: 'Bark' },
];
const currencySuggestions = ['USD', 'CNY', 'EUR', 'JPY', 'HKD', 'GBP'];

const reminderPointOptions: Array<{
  key: keyof Pick<
    ReminderFormState,
    'days_30' | 'days_7' | 'days_3' | 'days_1' | 'day_of'
  >;
  label: string;
}> = [
  { key: 'days_30', label: '提前 30 天' },
  { key: 'days_7', label: '提前 7 天' },
  { key: 'days_3', label: '提前 3 天' },
  { key: 'days_1', label: '提前 1 天' },
  { key: 'day_of', label: '当天提醒' },
];

function toDateInputValue(value: string): string {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
  if (match) return match[0];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEditFormState(subscription: Subscription): EditFormState {
  return {
    name: subscription.name,
    provider: subscription.provider,
    price: String(subscription.price),
    currency: subscription.currency,
    billingCycle: subscription.billing_cycle,
    nextBillingDate: toDateInputValue(subscription.next_billing_date),
    status: subscription.status,
    notes: subscription.notes ?? '',
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function createReminderFormState(
  reminderConfig: Record<string, unknown> | null,
): ReminderFormState {
  const config = reminderConfig ?? {};
  return {
    channels: toStringArray(config.channels),
    days_30: Boolean(config.days_30),
    days_7: Boolean(config.days_7),
    days_3: Boolean(config.days_3),
    days_1: Boolean(config.days_1),
    day_of: config.day_of === undefined ? true : Boolean(config.day_of),
    email: typeof config.email === 'string' ? config.email : '',
    feishu_webhook_url:
      typeof config.feishu_webhook_url === 'string'
        ? config.feishu_webhook_url
        : '',
    bark_device_key:
      typeof config.bark_device_key === 'string' ? config.bark_device_key : '',
  };
}

function createReminderPayload(
  form: ReminderFormState,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    channels: form.channels,
    days_30: form.days_30,
    days_7: form.days_7,
    days_3: form.days_3,
    days_1: form.days_1,
    day_of: form.day_of,
  };
  const email = form.email.trim();
  const feishuWebhookUrl = form.feishu_webhook_url.trim();
  const barkDeviceKey = form.bark_device_key.trim();

  if (email) payload.email = email;
  if (feishuWebhookUrl) payload.feishu_webhook_url = feishuWebhookUrl;
  if (barkDeviceKey) payload.bark_device_key = barkDeviceKey;

  return payload;
}

function hasEnabledReminderPoint(form: ReminderFormState): boolean {
  return (
    form.days_30 || form.days_7 || form.days_3 || form.days_1 || form.day_of
  );
}

export function SubscriptionCard({
  subscription,
  onToggleStatus,
  pendingId,
  onUpdateSubscription,
  onUpdateReminderConfig,
  onTestNotification,
}: SubscriptionCardProps) {
  const normalizedStatus = normalizeStatus(subscription.status);
  const statusMeta = statusMap[normalizedStatus];
  const isPending = pendingId === subscription.id;
  const isActive = normalizedStatus === 'active';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('edit');
  const [editForm, setEditForm] = useState<EditFormState>(() =>
    createEditFormState(subscription),
  );
  const [reminderForm, setReminderForm] = useState<ReminderFormState>(() =>
    createReminderFormState(subscription.reminder_config),
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, boolean> | null>(
    null,
  );
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [isTestingReminder, setIsTestingReminder] = useState(false);
  const currencyDatalistId = `subscription-currency-options-${subscription.id}`;

  const openModal = (tab: ModalTab) => {
    setActiveTab(tab);
    setIsModalOpen(true);
  };

  const handleSaveSubscription = async () => {
    setEditError(null);
    const name = editForm.name.trim();
    const provider = editForm.provider.trim();
    const notes = editForm.notes.trim();
    const price = Number.parseFloat(editForm.price);
    const currency = editForm.currency.trim();

    if (!name || !provider) {
      setEditError('请填写订阅名称和服务商。');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setEditError('请输入大于 0 的价格。');
      return;
    }
    if (!currency) {
      setEditError('请输入货币单位。');
      return;
    }
    if (currency.length > 10) {
      setEditError('货币单位长度不能超过 10 个字符。');
      return;
    }
    if (!editForm.nextBillingDate) {
      setEditError('请选择下次扣费日期。');
      return;
    }

    setIsSavingEdit(true);
    const success = await onUpdateSubscription(subscription.id, {
      name,
      provider,
      price,
      currency,
      billing_cycle: editForm.billingCycle,
      next_billing_date: editForm.nextBillingDate,
      status: editForm.status,
      notes: notes || null,
    });
    if (!success) {
      setEditError('订阅编辑保存失败，请稍后重试。');
    }
    setIsSavingEdit(false);
  };

  const toggleReminderChannel = (channel: string) => {
    setReminderForm((prev) => {
      const hasChannel = prev.channels.includes(channel);
      return {
        ...prev,
        channels: hasChannel
          ? prev.channels.filter((item) => item !== channel)
          : [...prev.channels, channel],
      };
    });
  };

  const handleSaveReminderConfig = async () => {
    setReminderError(null);
    setTestResult(null);

    if (reminderForm.channels.length === 0) {
      setReminderError('请至少选择一个通知渠道。');
      return;
    }
    if (!hasEnabledReminderPoint(reminderForm)) {
      setReminderError('请至少开启一个提醒时间点。');
      return;
    }

    setIsSavingReminder(true);
    const success = await onUpdateReminderConfig(
      subscription.id,
      createReminderPayload(reminderForm),
    );
    if (!success) {
      setReminderError('通知配置保存失败，请稍后重试。');
    }
    setIsSavingReminder(false);
  };

  const handleTestReminder = async () => {
    setReminderError(null);
    setTestResult(null);

    if (reminderForm.channels.length === 0) {
      setReminderError('测试前请先选择至少一个通知渠道。');
      return;
    }

    setIsTestingReminder(true);
    const result = await onTestNotification(subscription.id, {
      channels: reminderForm.channels,
      config: createReminderPayload(reminderForm),
    });
    if (result) {
      setTestResult(result);
    }
    setIsTestingReminder(false);
  };

  return (
    <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-gray-900 dark:text-white">
            {subscription.name}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {subscription.provider}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-indigo-50 px-3 py-2 dark:bg-indigo-500/10">
        <p className="text-[11px] font-semibold tracking-wide text-indigo-600 uppercase dark:text-indigo-300">
          下次扣费
        </p>
        <p className="mt-1 text-sm font-semibold text-indigo-800 dark:text-indigo-200">
          {formatDate(subscription.next_billing_date, 'YYYY-MM-DD')}
        </p>
        <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">
          {getDaysUntil(subscription.next_billing_date)} 天后
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <p>
          <span className="text-gray-500 dark:text-gray-400">价格：</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatPrice(subscription.price, subscription.currency)}
          </span>
        </p>
        <p className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-slate-800">
          {getCycleLabel(subscription.billing_cycle)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onToggleStatus(subscription)}
          className="min-h-11 flex-1 rounded-xl bg-gray-900 px-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {isPending ? '处理中...' : isActive ? '暂停订阅' : '恢复订阅'}
        </button>
        <button
          type="button"
          onClick={() => openModal('edit')}
          className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          编辑与通知
        </button>
      </div>

      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`编辑与通知 · ${subscription.name}`}
        description="编辑单个订阅信息并配置通知渠道。"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-gray-100 p-1 dark:border-slate-700 dark:bg-slate-800/70">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeTab === 'edit'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-gray-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              基础信息
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notify')}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeTab === 'notify'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-gray-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              通知配置
            </button>
          </div>

          {activeTab === 'edit' ? (
            <section className="rounded-2xl border border-gray-200/80 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                订阅信息编辑
              </h4>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    订阅名称
                  </span>
                  <input
                    value={editForm.name}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    服务商
                  </span>
                  <input
                    value={editForm.provider}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        provider: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    价格
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        price: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    币种
                  </span>
                  <input
                    value={editForm.currency}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        currency: event.target.value,
                      }))
                    }
                    list={currencyDatalistId}
                    maxLength={10}
                    placeholder="例如：USD / CNY / EUR"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  />
                  <datalist id={currencyDatalistId}>
                    {currencySuggestions.map((currency) => (
                      <option key={currency} value={currency} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    支持自定义，例如 HK$、元、AUD。
                  </p>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    计费周期
                  </span>
                  <select
                    value={editForm.billingCycle}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        billingCycle: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  >
                    <option value="monthly">月付</option>
                    <option value="quarterly">季付</option>
                    <option value="yearly">年付</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    订阅状态
                  </span>
                  <select
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  >
                    <option value="active">进行中</option>
                    <option value="paused">已暂停</option>
                    <option value="canceled">已取消</option>
                    <option value="expired">已过期</option>
                  </select>
                </label>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1.3fr]">
                <label className="space-y-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    下次扣费
                  </span>
                  <input
                    type="date"
                    value={editForm.nextBillingDate}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        nextBillingDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    备注
                  </span>
                  <input
                    value={editForm.notes}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                {editError ? (
                  <p className="text-xs text-red-500">{editError}</p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    支持修改单个订阅的核心字段。
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('notify')}
                    className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    去通知配置
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleSaveSubscription();
                    }}
                    disabled={isSavingEdit}
                    className="min-h-10 rounded-xl bg-gray-900 px-3 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                  >
                    {isSavingEdit ? '保存中...' : '保存订阅'}
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-gray-200/80 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                通知渠道与提醒配置
              </h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                选择渠道、提醒时间点，并可直接发送测试通知。
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {channelOptions.map((option) => {
                  const checked = reminderForm.channels.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleReminderChannel(option.value)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                        checked
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {reminderPointOptions.map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  >
                    <input
                      type="checkbox"
                      checked={reminderForm[option.key]}
                      onChange={(event) =>
                        setReminderForm((prev) => ({
                          ...prev,
                          [option.key]: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
                    />
                    <span className="text-gray-700 dark:text-slate-200">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-3 grid gap-2">
                <label className="space-y-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    邮件地址（可选）
                  </span>
                  <input
                    type="email"
                    value={reminderForm.email}
                    onChange={(event) =>
                      setReminderForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    placeholder="your@email.com"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    飞书 Webhook（可选）
                  </span>
                  <input
                    value={reminderForm.feishu_webhook_url}
                    onChange={(event) =>
                      setReminderForm((prev) => ({
                        ...prev,
                        feishu_webhook_url: event.target.value,
                      }))
                    }
                    placeholder="https://open.feishu.cn/..."
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    Bark Device Key（可选）
                  </span>
                  <input
                    value={reminderForm.bark_device_key}
                    onChange={(event) =>
                      setReminderForm((prev) => ({
                        ...prev,
                        bark_device_key: event.target.value,
                      }))
                    }
                    placeholder="填写 Bark 设备 Key"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  返回基础信息
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveReminderConfig();
                  }}
                  disabled={isSavingReminder}
                  className="min-h-10 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingReminder ? '保存中...' : '保存通知配置'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleTestReminder();
                  }}
                  disabled={isTestingReminder}
                  className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {isTestingReminder ? '测试中...' : '发送测试通知'}
                </button>
              </div>

              {reminderError ? (
                <p className="mt-2 text-xs text-red-500">{reminderError}</p>
              ) : null}

              {testResult ? (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {Object.entries(testResult).map(([channel, success]) => (
                    <span
                      key={channel}
                      className={`rounded-full px-2 py-1 font-medium ${
                        success
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                      }`}
                    >
                      {channel}: {success ? '成功' : '失败'}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
          )}
        </div>
      </SubscriptionModal>
    </article>
  );
}
