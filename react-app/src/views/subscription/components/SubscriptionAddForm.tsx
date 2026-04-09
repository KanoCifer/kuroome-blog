import { useState } from 'react';

import type { CreateSubscriptionPayload } from '@/api/subscriptionGateway';
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
}

const cycleOptions = [
  { value: 'monthly', label: '月付' },
  { value: 'quarterly', label: '季付' },
  { value: 'yearly', label: '年付' },
];

const currencySuggestions = ['USD', 'CNY', 'EUR', 'JPY', 'HKD', 'GBP'];

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
  };
}

export function SubscriptionAddForm({
  isOpen,
  onClose,
  isSubmitting,
  onCreate,
}: SubscriptionAddFormProps) {
  const [form, setForm] = useState<SubscriptionFormState>(createInitialState);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    const provider = form.provider.trim();
    if (!name || !provider) {
      setFormError('请填写订阅名称和服务商。');
      return;
    }

    const price = Number.parseFloat(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('请输入大于 0 的价格。');
      return;
    }

    const currency = form.currency.trim();
    if (!currency) {
      setFormError('请输入货币单位。');
      return;
    }

    if (currency.length > 10) {
      setFormError('货币单位长度不能超过 10 个字符。');
      return;
    }

    if (!form.nextBillingDate) {
      setFormError('请选择下次扣费日期。');
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

    const created = await onCreate(payload);
    if (!created) return;

    setForm(createInitialState());
    setFormError(null);
    onClose();
  };

  return (
    <SubscriptionModal
      isOpen={isOpen}
      onClose={onClose}
      title="添加新订阅"
      description="记录价格、周期与扣费时间，自动计入月度估算。"
    >
      <section className="relative overflow-hidden rounded-3xl border border-indigo-200/70 bg-white p-5 shadow-sm dark:border-indigo-500/25 dark:bg-slate-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_45%),radial-gradient(circle_at_10%_20%,rgba(14,165,233,0.14),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.2),transparent_45%),radial-gradient(circle_at_10%_20%,rgba(56,189,248,0.18),transparent_35%)]"
        />

        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-3">
            <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase dark:text-indigo-300">
              Quick Add
            </p>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
              默认激活
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
                  订阅名称
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="例如：Spotify Premium"
                  className="w-full rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/25"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
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
                  className="w-full rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/25"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
                  价格
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, price: event.target.value }))
                  }
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/25"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
                  币种
                </span>
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
                  placeholder="例如：USD / CNY / EUR"
                  className="w-full rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/25"
                />
                <datalist id="subscription-currency-options">
                  {currencySuggestions.map((currency) => (
                    <option key={currency} value={currency} />
                  ))}
                </datalist>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  支持自定义，例如 HK$、元、USD。
                </p>
              </label>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
                计费周期
              </span>
              <div className="grid grid-cols-3 gap-2">
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
                      className={`rounded-xl px-2 py-2 text-xs font-medium transition ${
                        isActive
                          ? 'bg-blue-400 text-white shadow-sm shadow-blue-500/25'
                          : 'bg-white/80 text-gray-600 hover:bg-white dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-slate-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
                  下次扣费日期
                </span>
                <input
                  type="date"
                  value={form.nextBillingDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      nextBillingDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/25"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
                  备注（可选）
                </span>
                <input
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="例如：家庭套餐、可随时取消"
                  className="w-full rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-gray-900 outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/25"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {formError ? (
                <p className="text-xs font-medium text-red-500">{formError}</p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  创建后可在列表中暂停或恢复订阅状态。
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-2xl border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-11 rounded-2xl bg-blue-400 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? '添加中...' : '添加订阅'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </SubscriptionModal>
  );
}
