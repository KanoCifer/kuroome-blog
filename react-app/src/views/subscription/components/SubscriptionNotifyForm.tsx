import type { TestNotificationPayload } from '@/api/subscriptionGateway';
import { BellRing, CheckCircle2, Mail, Settings } from 'lucide-react';
import { useState } from 'react';
import type { Subscription } from '../types';

interface SubscriptionNotifyFormProps {
  subscription: Subscription;
  onUpdateConfig: (
    subId: number,
    reminderData: Record<string, unknown>,
  ) => Promise<boolean>;
  onTest: (
    subId: number,
    payload: TestNotificationPayload,
  ) => Promise<Record<string, boolean> | null>;
  onPrev?: () => void;
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

const channelOptions = [
  { value: 'email', label: '邮件', icon: Mail },
  { value: 'feishu', label: '飞书', icon: Settings },
  { value: 'bark', label: 'Bark', icon: BellRing },
];

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

function PrimaryButton({
  children,
  onClick,
  disabled = false,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-headline flex-1 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(0,40,142,0.2)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${className} `}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled = false,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-headline text-on-surface flex-1 rounded-full border border-primary/60 bg-primary/5 px-4 py-2 text-sm font-semibold backdrop-blur-md transition-all hover:bg-card/70 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${className} `}
    >
      {children}
    </button>
  );
}

export function SubscriptionNotifyForm({
  subscription,
  onUpdateConfig,
  onTest,
  onPrev,
}: SubscriptionNotifyFormProps) {
  const [form, setForm] = useState<ReminderFormState>(() =>
    createReminderFormState(subscription.reminder_config),
  );
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, boolean> | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const toggleChannel = (channel: string) => {
    setForm((prev) => {
      const hasChannel = prev.channels.includes(channel);
      return {
        ...prev,
        channels: hasChannel
          ? prev.channels.filter((item) => item !== channel)
          : [...prev.channels, channel],
      };
    });
  };

  const handleChange = <K extends keyof ReminderFormState>(
    key: K,
    value: ReminderFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setError(null);
    setTestResult(null);

    if (form.channels.length === 0) {
      setError('请至少选择一个通知渠道。');
      return;
    }
    if (!hasEnabledReminderPoint(form)) {
      setError('请至少开启一个提醒时间点。');
      return;
    }

    setIsSaving(true);
    const success = await onUpdateConfig(
      subscription.id,
      createReminderPayload(form),
    );
    if (!success) {
      setError('通知配置保存失败，请稍后重试。');
    }
    setIsSaving(false);
  };

  const handleTest = async () => {
    setError(null);
    setTestResult(null);

    if (form.channels.length === 0) {
      setError('测试前请先选择至少一个通知渠道。');
      return;
    }

    setIsTesting(true);
    const result = await onTest(subscription.id, {
      channels: form.channels,
      config: createReminderPayload(form),
    });
    if (result) {
      setTestResult(result);
    }
    setIsTesting(false);
  };

  return (
    <div className="relative overflow-hidden">
      <main className="relative mx-auto max-w-lg space-y-6 px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <BellRing size={24} className="text-primary" />
          </div>
          <div>
            <h3 className="font-headline text-on-surface text-lg font-bold">
              通知配置
            </h3>
            <p className="text-on-surface-variant text-xs">
              选择渠道与提醒时间点
            </p>
          </div>
        </div>

        {/* Channel Selection */}
        <div className="rounded-2xl border border-border bg-secondary p-5">
          <h4 className="text-on-surface-variant font-label mb-3 ml-1 text-xs font-semibold">
            通知渠道
          </h4>
          <div className="flex flex-wrap gap-2">
            {channelOptions.map((option) => {
              const checked = form.channels.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleChannel(option.value)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    checked
                      ? 'bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(0,40,142,0.25)]'
                      : 'border border-border bg-card text-card-foreground hover:bg-accent'
                  } `}
                >
                  <option.icon size={16} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reminder Points */}
        <div className="rounded-2xl border border-border bg-secondary p-5">
          <h4 className="text-on-surface-variant font-label mb-3 ml-1 text-xs font-semibold">
            提醒时间点
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {reminderPointOptions.map((option) => {
              const checked = form[option.key];
              return (
                <label
                  key={option.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                    checked
                      ? 'border border-primary/20 bg-primary/10'
                      : 'border border-border bg-card hover:bg-accent'
                  } `}
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full transition-all ${checked ? 'bg-primary text-primary-foreground' : 'bg-muted'} `}
                  >
                    {checked && <CheckCircle2 size={14} />}
                  </div>
                  <span
                    className={`text-sm font-medium ${checked ? 'text-primary' : 'text-card-foreground'}`}
                  >
                    {option.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleChange(option.key, e.target.checked)}
                    className="sr-only"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Channel Config */}
        {form.channels.includes('email') && (
          <div className="rounded-2xl border border-border bg-secondary p-5">
            <h4 className="text-on-surface-variant font-label mb-3 ml-1 text-xs font-semibold">
              邮件配置
            </h4>
            <input
              type="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              placeholder="your@email.com"
              className="text-on-surface placeholder:text-outline/50 w-full rounded-xl border-0 bg-card px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-ring/20"
            />
          </div>
        )}

        {form.channels.includes('feishu') && (
          <div className="rounded-2xl border border-border bg-secondary p-5">
            <h4 className="text-on-surface-variant font-label mb-3 ml-1 text-xs font-semibold">
              飞书 Webhook
            </h4>
            <input
              value={form.feishu_webhook_url}
              onChange={(event) =>
                handleChange('feishu_webhook_url', event.target.value)
              }
              placeholder="https://open.feishu.cn/..."
              className="text-on-surface placeholder:text-outline/50 w-full rounded-xl border-0 bg-card px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-ring/20"
            />
          </div>
        )}

        {form.channels.includes('bark') && (
          <div className="rounded-2xl border border-border bg-secondary p-5">
            <h4 className="text-on-surface-variant font-label mb-3 ml-1 text-xs font-semibold">
              Bark Device Key
            </h4>
            <input
              value={form.bark_device_key}
              onChange={(event) =>
                handleChange('bark_device_key', event.target.value)
              }
              placeholder="填写 Bark 设备 Key"
              className="text-on-surface placeholder:text-outline/50 w-full rounded-xl border-0 bg-card px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-ring/20"
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(testResult).map(([channel, success]) => (
              <span
                key={channel}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                  success
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'
                } `}
              >
                <CheckCircle2 size={12} />
                {channel}: {success ? '成功' : '失败'}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onPrev && (
            <SecondaryButton onClick={onPrev}>返回基础信息</SecondaryButton>
          )}
          <SecondaryButton onClick={handleTest} disabled={isTesting}>
            {isTesting ? '测试中...' : '发送测试'}
          </SecondaryButton>
          <PrimaryButton onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存配置'}
          </PrimaryButton>
        </div>
      </main>
    </div>
  );
}
