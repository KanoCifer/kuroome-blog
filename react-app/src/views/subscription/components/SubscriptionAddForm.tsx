import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Currency,
  Loader2,
  Mail,
  Settings,
  Tag,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { CreateSubscriptionPayload } from '@/api/subscriptionGateway';
import { subService } from '@/services/subService';
import { SubscriptionModal } from './SubscriptionModal';

interface SubscriptionAddFormProps {
  isOpen: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  onCreate: (payload: CreateSubscriptionPayload) => Promise<boolean>;
}

interface SubscriptionFormState {
  name: string;
  provider: string;
  price: string;
  currency: string;
  billingCycle: string;
  nextBillingDate: string;
  notes: string;
  reminderEnabled: boolean;
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

interface GlobalConfig {
  email?: string;
  feishu_webhook_url?: string;
  bark_device_key?: string;
}

const quickSuggestions = [
  { name: 'Netflix', icon: 'Netflix', color: 'bg-red-500' },
  { name: 'Spotify', icon: 'Spotify', color: 'bg-green-500' },
  { name: 'Apple One', icon: 'Apple', color: 'bg-gray-500' },
  { name: 'Apple Music', icon: 'Apple', color: 'bg-gray-500' },
  { name: 'MiniMax AI', icon: 'MiniMax', color: 'bg-rose-500' },
];

const cycleOptions = [
  { value: 'monthly', label: '月付' },
  { value: 'quarterly', label: '季付' },
  { value: 'yearly', label: '年付' },
];

const currencySuggestions = ['USD', 'CNY', 'EUR', 'JPY', 'HKD', 'GBP'];

const channelOptions = [
  { value: 'email', label: '邮件', icon: Mail },
  { value: 'feishu', label: '飞书', icon: Settings },
  { value: 'bark', label: 'Bark', icon: BellRing },
];

const reminderPointOptions: Array<{
  key: keyof Pick<
    SubscriptionFormState,
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

function getDefaultNextBillingDate(): string {
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  const year = nextMonth.getFullYear();
  const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const day = String(nextMonth.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createInitialState(): SubscriptionFormState {
  return {
    name: '',
    provider: '',
    price: '',
    currency: 'USD',
    billingCycle: 'monthly',
    nextBillingDate: getDefaultNextBillingDate(),
    notes: '',
    reminderEnabled: false,
    channels: [],
    days_30: true,
    days_7: true,
    days_3: true,
    days_1: true,
    day_of: true,
    email: '',
    feishu_webhook_url: '',
    bark_device_key: '',
  };
}

function applyQuickSuggestion(
  suggestion: (typeof quickSuggestions)[0],
  setForm: React.Dispatch<React.SetStateAction<SubscriptionFormState>>,
) {
  setForm((prev) => ({
    ...prev,
    name: suggestion.name,
    provider: suggestion.name.split(' ')[0],
  }));
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function applyGlobalConfig(
  setForm: React.Dispatch<React.SetStateAction<SubscriptionFormState>>,
  globalConfig: GlobalConfig,
) {
  setForm((prev) => ({
    ...prev,
    email: toString(globalConfig.email),
    feishu_webhook_url: toString(globalConfig.feishu_webhook_url),
    bark_device_key: toString(globalConfig.bark_device_key),
  }));
}

function buildReminderConfig(
  form: SubscriptionFormState,
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    channels: form.channels,
    days_30: form.days_30,
    days_7: form.days_7,
    days_3: form.days_3,
    days_1: form.days_1,
    day_of: form.day_of,
  };
  const email = form.email.trim();
  const feishu = form.feishu_webhook_url.trim();
  const bark = form.bark_device_key.trim();
  if (email) config.email = email;
  if (feishu) config.feishu_webhook_url = feishu;
  if (bark) config.bark_device_key = bark;
  return config;
}

export function SubscriptionAddForm({
  isOpen,
  onClose,
  isSubmitting,
  onCreate,
}: SubscriptionAddFormProps) {
  const service = useMemo(() => subService(), []);
  const [form, setForm] = useState<SubscriptionFormState>(createInitialState);
  const [formError, setFormError] = useState<string | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Load global config when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingConfig(true);
    service
      .getUserGlobalConfig()
      .then((config: GlobalConfig) => {
        applyGlobalConfig(setForm, config);
        // Auto-enable reminder if global config has channel credentials
        if (
          config.email ||
          config.feishu_webhook_url ||
          config.bark_device_key
        ) {
          setShowReminder(true);
        }
      })
      .catch(() => {
        // Silently fail, form works without global config
      })
      .finally(() => {
        setIsLoadingConfig(false);
      });
  }, [isOpen, service]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    const provider = form.provider.trim();
    if (!name || !provider) {
      setFormError('请填写订阅名称和服务商');
      return;
    }

    const price = Number.parseFloat(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('请输入大于 0 的价格');
      return;
    }

    const currency = form.currency.trim();
    if (!currency) {
      setFormError('请输入货币单位');
      return;
    }

    if (currency.length > 10) {
      setFormError('货币单位长度不能超过 10 个字符');
      return;
    }

    if (!form.nextBillingDate) {
      setFormError('请选择下次扣费日期');
      return;
    }

    const payload: CreateSubscriptionPayload = {
      name,
      provider,
      price,
      currency,
      billing_cycle: form.billingCycle,
      next_billing_date: form.nextBillingDate,
      status: 'active',
      notes: form.notes.trim() || null,
    };

    // Include reminder config if reminder is enabled and has channels
    if (showReminder && form.channels.length > 0) {
      payload.reminder_config = buildReminderConfig(form);
    }

    const created = await onCreate(payload);
    if (!created) return;

    setForm(createInitialState());
    setFormError(null);
    setShowReminder(false);
    onClose();
  };

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

  const handleReminderChange = <K extends keyof SubscriptionFormState>(
    key: K,
    value: SubscriptionFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SubscriptionModal isOpen={isOpen} onClose={onClose}>
      <section className="relative overflow-hidden p-4 transition-all">
        {/* Decorative background elements */}

        <div className="relative">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-100">
                Add Subscription
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              激活
            </span>
          </div>

          {/* Quick Suggestions */}
          <div className="mb-6">
            <h3 className="mb-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
              快速添加
            </h3>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion.name}
                  type="button"
                  onClick={() => applyQuickSuggestion(suggestion, setForm)}
                  className="flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-3 py-1.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/80 dark:border-slate-700/40 dark:bg-slate-800/60 dark:hover:bg-slate-700/80"
                >
                  <span
                    className={`h-4 w-4 rounded-sm ${suggestion.color} flex items-center justify-center`}
                  >
                    <span className="text-[6px] font-black text-white">
                      {suggestion.icon.charAt(0)}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {suggestion.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name & Provider */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  订阅名称
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="例如：Spotify Premium"
                  className="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:ring-blue-400/30 dark:bg-gray-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-500/30"
                />
              </label>
              <label className="space-y-1.5">
                <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  服务商
                </span>
                <input
                  value={form.provider}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      provider: event.target.value,
                    }))
                  }
                  placeholder="例如：Spotify"
                  className="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:ring-blue-400/30 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-500/30"
                />
              </label>
            </div>

            {/* Currency & Price */}
            <div className="grid grid-cols-[0.4fr_0.6fr] gap-4">
              <label className="space-y-1.5">
                <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  货币
                </span>
                <div className="relative">
                  <input
                    value={form.currency}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        currency: event.target.value,
                      }))
                    }
                    list="subscription-currency-options"
                    maxLength={10}
                    placeholder="USD"
                    className="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 pr-10 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:ring-blue-400/30 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-500/30"
                  />
                  <datalist id="subscription-currency-options">
                    {currencySuggestions.map((currency) => (
                      <option key={currency} value={currency} />
                    ))}
                  </datalist>
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400">
                    <Currency size={16} />
                  </span>
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  价格
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        price: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:ring-blue-400/30 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-500/30"
                  />
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400">
                    <Tag size={16} />
                  </span>
                </div>
              </label>
              <p className="col-span-2 -mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                支持自定义格式，例如 HK$、元、USD
              </p>
            </div>

            {/* Billing Cycle */}
            <div className="space-y-2">
              <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                计费周期
              </span>
              <div className="flex rounded-full bg-slate-100/60 p-1 backdrop-blur-sm dark:bg-slate-800/60">
                {cycleOptions.map((option) => {
                  const isActive = form.billingCycle === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          billingCycle: option.value,
                        }))
                      }
                      className={`flex-1 rounded-full px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Next Billing Date & Notes */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  下次扣费日期
                </span>
                <div className="relative">
                  <input
                    type="date"
                    value={form.nextBillingDate}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        nextBillingDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none focus:ring-blue-400/30 dark:bg-slate-800/70 dark:text-white dark:focus:ring-blue-500/30"
                  />
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  备注（可选）
                </span>
                <input
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="例如：家庭套餐、可随时取消"
                  className="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:ring-blue-400/30 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-500/30"
                />
              </label>
            </div>

            {/* Reminder Config Toggle */}
            <div className="rounded-2xl border border-gray-200/80 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <label className="flex cursor-pointer items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing
                    size={16}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    通知提醒配置
                  </span>
                  {isLoadingConfig && (
                    <Loader2
                      size={14}
                      className="animate-spin text-slate-400"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowReminder((prev) => !prev)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${showReminder ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'} `}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${showReminder ? 'translate-x-5' : 'translate-x-0'} `}
                  />
                </button>
              </label>
              {showReminder && (
                <div className="mt-4 space-y-4">
                  {/* Channels */}
                  <div>
                    <h4 className="mb-2 ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
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
                                ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(0,40,142,0.25)]'
                                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
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
                  <div>
                    <h4 className="mb-2 ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
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
                                ? 'border border-blue-200 bg-blue-100 dark:border-blue-700/50 dark:bg-blue-900/40'
                                : 'border border-gray-200 bg-white hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/50'
                            } `}
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-full transition-all ${checked ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-600'} `}
                            >
                              {checked && <CheckCircle2 size={14} />}
                            </div>
                            <span
                              className={`text-sm font-medium ${checked ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-200'}`}
                            >
                              {option.label}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                handleReminderChange(
                                  option.key,
                                  e.target.checked,
                                )
                              }
                              className="sr-only"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Channel Configs */}
                  {form.channels.includes('email') && (
                    <div>
                      <h4 className="mb-2 ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        邮件地址
                      </h4>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          handleReminderChange('email', event.target.value)
                        }
                        placeholder="your@email.com"
                        className="text-on-surface placeholder:text-outline/50 w-full rounded-xl border-0 bg-white px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800"
                      />
                    </div>
                  )}

                  {form.channels.includes('feishu') && (
                    <div>
                      <h4 className="mb-2 ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        飞书 Webhook
                      </h4>
                      <input
                        type="text"
                        value={form.feishu_webhook_url}
                        onChange={(event) =>
                          handleReminderChange(
                            'feishu_webhook_url',
                            event.target.value,
                          )
                        }
                        placeholder="https://open.feishu.cn/..."
                        className="text-on-surface placeholder:text-outline/50 w-full rounded-xl border-0 bg-white px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800"
                      />
                    </div>
                  )}

                  {form.channels.includes('bark') && (
                    <div>
                      <h4 className="mb-2 ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Bark Device Key
                      </h4>
                      <input
                        type="text"
                        value={form.bark_device_key}
                        onChange={(event) =>
                          handleReminderChange(
                            'bark_device_key',
                            event.target.value,
                          )
                        }
                        placeholder="填写 Bark 设备 Key"
                        className="text-on-surface placeholder:text-outline/50 w-full rounded-xl border-0 bg-white px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error & Submit */}
            {formError ? (
              <p className="py-2 text-center text-xs font-medium text-red-500 dark:text-red-400">
                {formError}
              </p>
            ) : (
              <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
                创建后可暂停或恢复订阅状态
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-700 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>添加中...</span>
                </>
              ) : (
                <>
                  <span>添加订阅</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </SubscriptionModal>
  );
}
