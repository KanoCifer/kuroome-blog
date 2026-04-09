import type { UpdateSubscriptionPayload } from '@/api/subscriptionGateway';
import { useState } from 'react';
import type { Subscription } from '../types';

interface SubscriptionEditFormProps {
  subscription: Subscription;
  onUpdate: (
    subId: number,
    payload: UpdateSubscriptionPayload,
  ) => Promise<boolean>;
  onNext?: () => void;
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

const currencySuggestions = ['USD', 'CNY', 'EUR', 'JPY', 'HKD', 'GBP'];
const cycleOptions = [
  { value: 'monthly', label: '月付' },
  { value: 'quarterly', label: '季付' },
  { value: 'yearly', label: '年付' },
];
const statusOptions = [
  { value: 'active', label: '进行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'canceled', label: '已取消' },
  { value: 'expired', label: '已过期' },
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

/**
 * Primary Button with gradient soul
 * @see Design System: gradient from primary to primary_container
 */
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
      className={`
        w-full rounded-full bg-blue-600
        px-5 py-4 font-headline text-base font-bold text-white
        shadow-[0_10px_25px_rgba(0,40,142,0.2)]
        transition-all hover:brightness-105 active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100
        ${className}
      `}
    >
      {children}
    </button>
  );
}

/**
 * Secondary Glass Button
 * @see Design System: glass-based secondary with backdrop-blur
 */
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
      className={`
        w-full rounded-full border border-blue-600/60 bg-blue-50/50 px-5 py-4
        font-semibold transition-all hover:bg-white/70 active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100
        dark:border-blue-600/60 dark:bg-blue-800/50 dark:text-blue-100 dark:hover:bg-blue-800/70
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export function SubscriptionEditForm({
  subscription,
  onUpdate,
  onNext,
}: SubscriptionEditFormProps) {
  const [form, setForm] = useState<EditFormState>(() =>
    createEditFormState(subscription),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const datalistId = `subscription-currency-options-${subscription.id}`;

  const handleChange = (field: keyof EditFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError(null);
    const name = form.name.trim();
    const provider = form.provider.trim();
    const notes = form.notes.trim();
    const price = Number.parseFloat(form.price);
    const currency = form.currency.trim();

    if (!name || !provider) {
      setError('请填写订阅名称和服务商。');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('请输入大于 0 的价格。');
      return;
    }
    if (!currency) {
      setError('请输入货币单位。');
      return;
    }
    if (currency.length > 10) {
      setError('货币单位长度不能超过 10 个字符。');
      return;
    }
    if (!form.nextBillingDate) {
      setError('请选择下次扣费日期。');
      return;
    }

    setIsSaving(true);
    const success = await onUpdate(subscription.id, {
      name,
      provider,
      price,
      currency,
      billing_cycle: form.billingCycle,
      next_billing_date: form.nextBillingDate,
      status: form.status,
      notes: notes || null,
    });
    if (!success) {
      setError('订阅编辑保存失败，请稍后重试。');
    }
    setIsSaving(false);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Main Content */}
      <main className="relative max-w-lg mx-auto space-y-6">
        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Subscription Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant ml-1 font-label">
              订阅名称
            </label>
            <input
              value={form.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="例如：Spotify Premium"
              className="w-full bg-gray-100 dark:bg-gray-800 border-0 focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-outline/50 transition-all"
            />
          </div>

          {/* Service Provider */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant ml-1 font-label">
              服务商
            </label>
            <input
              value={form.provider}
              onChange={(event) => handleChange('provider', event.target.value)}
              placeholder="例如：Spotify"
              className="w-full bg-gray-100 dark:bg-gray-800 border-0 focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-outline/50 transition-all"
            />
          </div>

          {/* Price & Currency Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant ml-1 font-label">
                价格
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => handleChange('price', event.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-100 dark:bg-gray-800 border-0 focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-outline/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant ml-1 font-label">
                货币
              </label>
              <div className="relative">
                <input
                  value={form.currency}
                  onChange={(event) =>
                    handleChange('currency', event.target.value)
                  }
                  list={datalistId}
                  maxLength={10}
                  placeholder="USD / CNY"
                  className="w-full bg-gray-100 dark:bg-gray-800 border-0 focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3.5 pr-10 text-sm text-on-surface placeholder:text-outline/50 transition-all appearance-none"
                />
                <datalist id={datalistId}>
                  {currencySuggestions.map((currency) => (
                    <option key={currency} value={currency} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Billing Cycle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant ml-1 font-label">
              计费周期
            </label>
            <div className="flex p-1 bg-surface-container-low rounded-xl gap-1">
              {cycleOptions.map((option) => {
                const isActive = form.billingCycle === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange('billingCycle', option.value)}
                    className={`
                        flex-1 py-2.5 px-2 rounded-lg text-[11px] font-bold transition-all
                        ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-on-surface-variant hover:bg-white/50 font-medium bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700/50'
                        }
                      `}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Billing Date & Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant ml-1 font-label">
                下次扣费日期
              </label>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={form.nextBillingDate}
                  onChange={(event) =>
                    handleChange('nextBillingDate', event.target.value)
                  }
                  className="w-full bg-gray-100 dark:bg-gray-800 border-0 focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3.5 text-sm transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold ml-1 font-label">
                订阅状态
              </label>
              <select
                value={form.status}
                onChange={(event) => handleChange('status', event.target.value)}
                className="w-full bg-blue-50 dark:bg-blue-700 ring-1 ring-blue-700/20 border-0 focus:ring-2 focus:ring-blue-700/20 rounded-xl px-4 py-3.5 text-sm text-on-surface transition-all appearance-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant ml-1 font-label">
              备注
            </label>
            <input
              value={form.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              placeholder="可填写账号、套餐说明等"
              className="w-full bg-gray-100 dark:bg-gray-800 border-0 focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder:text-outline/50 transition-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 space-y-3">
          {error ? (
            <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
              {error}
            </p>
          ) : (
            <p className="px-1 text-xs text-on-surface-variant/70">
              保存后立即生效
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {onNext && (
              <SecondaryButton onClick={onNext}>去通知配置</SecondaryButton>
            )}
            <PrimaryButton
              onClick={handleSave}
              disabled={isSaving}
              className={onNext ? '' : 'sm:col-span-2'}
            >
              {isSaving ? '保存中...' : '保存订阅'}
            </PrimaryButton>
          </div>
        </div>
      </main>
    </div>
  );
}
