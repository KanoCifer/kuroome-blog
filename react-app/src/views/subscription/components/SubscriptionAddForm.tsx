import { ArrowRight, Currency, Loader2, Tag } from 'lucide-react';
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

    const created = await onCreate(payload);
    if (!created) return;

    setForm(createInitialState());
    setFormError(null);
    onClose();
  };

  return (
    <SubscriptionModal isOpen={isOpen} onClose={onClose}>
      <section className="relative overflow-hidden p-4 transition-all">
        {/* Decorative background elements */}

        <div className="relative">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-2xl font-serif text-slate-800 dark:text-slate-100">
                Add Subscription
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              激活
            </span>
          </div>

          {/* Quick Suggestions */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
              快速添加
            </h3>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion.name}
                  type="button"
                  onClick={() => applyQuickSuggestion(suggestion, setForm)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-full border border-white/40 dark:border-slate-700/40 shadow-sm hover:scale-105 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-200"
                >
                  <span
                    className={`w-4 h-4 rounded-sm ${suggestion.color} flex items-center justify-center`}
                  >
                    <span className="text-[6px] text-white font-black">
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
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                  订阅名称
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="例如：Spotify Premium"
                  className="w-full dark:bg-gray-800 bg-gray-100 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none ring-2 ring-transparent focus:ring-blue-400/30 dark:focus:ring-blue-500/30 transition-all"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
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
                  className="w-full bg-gray-100 dark:bg-slate-800/70 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none ring-2 ring-transparent focus:ring-blue-400/30 dark:focus:ring-blue-500/30 transition-all"
                />
              </label>
            </div>

            {/* Currency & Price */}
            <div className="grid gap-4 grid-cols-[0.4fr_0.6fr]">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
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
                    className="w-full bg-gray-100  dark:bg-slate-800/70 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none ring-2 ring-transparent focus:ring-blue-400/30 dark:focus:ring-blue-500/30 transition-all pr-10"
                  />
                  <datalist id="subscription-currency-options">
                    {currencySuggestions.map((currency) => (
                      <option key={currency} value={currency} />
                    ))}
                  </datalist>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Currency size={16} />
                  </span>
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
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
                    className="w-full bg-gray-100  dark:bg-slate-800/70 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none ring-2 ring-transparent focus:ring-blue-400/30 dark:focus:ring-blue-500/30 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Tag size={16} />
                  </span>
                </div>
              </label>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 col-span-2 -mt-2">
                支持自定义格式，例如 HK$、元、USD
              </p>
            </div>

            {/* Billing Cycle */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                计费周期
              </span>
              <div className="flex bg-slate-100/60 dark:bg-slate-800/60 p-1 rounded-full backdrop-blur-sm">
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
                      className={`flex-1 text-xs font-semibold py-2.5 px-3 rounded-full transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
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
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
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
                    className="w-full bg-gray-100  dark:bg-slate-800/70 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-white outline-none ring-2 ring-transparent focus:ring-blue-400/30 dark:focus:ring-blue-500/30 transition-all"
                  />
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                  备注（可选）
                </span>
                <input
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="例如：家庭套餐、可随时取消"
                  className="w-full bg-gray-100  dark:bg-slate-800/70 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none ring-2 ring-transparent focus:ring-blue-400/30 dark:focus:ring-blue-500/30 transition-all"
                />
              </label>
            </div>

            {/* Error & Submit */}
            {formError ? (
              <p className="text-xs font-medium text-red-500 dark:text-red-400 text-center py-2">
                {formError}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                创建后可暂停或恢复订阅状态
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-blue-700 text-white font-extrabold text-sm shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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
