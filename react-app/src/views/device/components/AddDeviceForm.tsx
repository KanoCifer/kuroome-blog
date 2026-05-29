import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Tag } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { deviceService, type DeviceInput } from '@/services/deviceService';
import { useNotificationStore } from '@/stores/notificationState';

interface AddDeviceFormProps {
  onClose: () => void;
  onSuccess?: (device: DeviceInput) => void;
}

interface DeviceFormState {
  name: string;
  purchase_date: string;
  price: string;
  currency: string;
  notes: string;
  status: 'active' | 'retired';
}

const currencyOptions = ['CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP'];

const statusOptions: Array<{ value: 'active' | 'retired'; label: string }> = [
  { value: 'active', label: '使用中' },
  { value: 'retired', label: '已退役' },
];

function createInitialState(): DeviceFormState {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return {
    name: '',
    purchase_date: `${year}-${month}-${day}`,
    price: '',
    currency: 'CNY',
    notes: '',
    status: 'active',
  };
}

export function AddDeviceForm({ onClose, onSuccess }: AddDeviceFormProps) {
  const service = useMemo(() => deviceService(), []);
  const notifySuccess = useNotificationStore((state) => state.success);
  const notifyError = useNotificationStore((state) => state.error);

  const [form, setForm] = useState<DeviceFormState>(createInitialState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    <K extends keyof DeviceFormState>(key: K, value: DeviceFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError('请填写设备名称');
      return;
    }

    if (name.length > 100) {
      setFormError('设备名称不能超过 100 个字符');
      return;
    }

    if (!form.purchase_date) {
      setFormError('请选择购买日期');
      return;
    }

    const price = Number.parseFloat(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setFormError('请输入有效的价格');
      return;
    }

    const currency = form.currency.trim();
    if (!currency) {
      setFormError('请选择货币单位');
      return;
    }

    if (currency.length > 10) {
      setFormError('货币单位不能超过 10 个字符');
      return;
    }

    setIsSubmitting(true);

    const payload: DeviceInput = {
      name,
      purchase_date: form.purchase_date,
      price,
      currency,
      notes: form.notes.trim() || undefined,
      status: form.status,
      reminder_config: {},
    };

    try {
      await service.createDevice(payload);
      notifySuccess('设备添加成功');
      onSuccess?.(payload);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '添加失败，请稍后重试';
      setFormError(message);
      notifyError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-background/50 fixed inset-0 z-50 backdrop-blur-sm"
          onClick={onClose}
        />,
        document.body,
      )}

      {/* Form Container */}
      {createPortal(
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="fixed inset-x-8 inset-y-24 z-50 flex items-center justify-center"
        >
          <div className="bg-card max-h-full w-full max-w-md overflow-y-auto rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="border-border bg-card sticky top-0 z-10 border-b px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-foreground font-serif text-2xl font-bold">
                    添加设备
                  </h2>
                  <p className="text-muted-foreground mt-1 text-xs">
                    记录你的电子设备资产
                  </p>
                </div>
                <span className="bg-primary/10 text-primary shrink-0 rounded-full px-3 py-1 text-xs font-semibold">
                  新建设备
                </span>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="bg-background space-y-5 p-6"
            >
              {/* Name */}
              <label className="block space-y-1.5">
                <span className="text-muted-foreground ml-1 text-xs font-semibold">
                  设备名称 *
                </span>
                <input
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  placeholder="例如：iPhone 15 Pro Max"
                  maxLength={100}
                  className="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-xl border px-4 py-3 text-sm font-medium ring-2 ring-transparent transition-all outline-none"
                />
              </label>

              {/* Purchase Date */}
              <label className="block space-y-1.5">
                <span className="text-muted-foreground ml-1 text-xs font-semibold">
                  购买日期 *
                </span>
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={(event) =>
                    handleChange('purchase_date', event.target.value)
                  }
                  className="border-input bg-card text-foreground focus:border-primary focus:ring-ring w-full rounded-xl border px-4 py-3 text-sm font-medium ring-2 ring-transparent transition-all outline-none"
                />
              </label>

              {/* Currency & Price */}
              <div className="grid grid-cols-[0.4fr_0.6fr] gap-4">
                <label className="block space-y-1.5">
                  <span className="text-muted-foreground ml-1 text-xs font-semibold">
                    货币
                  </span>
                  <div className="relative">
                    <select
                      value={form.currency}
                      onChange={(event) =>
                        handleChange('currency', event.target.value)
                      }
                      className="border-input bg-card text-foreground focus:border-primary focus:ring-ring w-full cursor-pointer appearance-none rounded-xl border px-4 py-3 text-sm font-medium ring-2 ring-transparent transition-all outline-none"
                    >
                      {currencyOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                      <Tag size={16} />
                    </span>
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-muted-foreground ml-1 text-xs font-semibold">
                    价格
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(event) =>
                        handleChange('price', event.target.value)
                      }
                      placeholder="0.00"
                      className="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-xl border px-4 py-3 text-sm font-medium ring-2 ring-transparent transition-all outline-none"
                    />
                  </div>
                </label>
              </div>

              {/* Notes */}
              <label className="block space-y-1.5">
                <span className="text-muted-foreground ml-1 text-xs font-semibold">
                  备注（可选）
                </span>
                <input
                  value={form.notes}
                  onChange={(event) =>
                    handleChange('notes', event.target.value)
                  }
                  placeholder="例如：256GB 银色、国行版本"
                  className="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-xl border px-4 py-3 text-sm font-medium ring-2 ring-transparent transition-all outline-none"
                />
              </label>

              {/* Status Toggle */}
              <div className="space-y-2">
                <span className="text-muted-foreground ml-1 text-xs font-semibold">
                  设备状态
                </span>
                <div className="bg-secondary/80 flex rounded-full p-1 backdrop-blur-sm">
                  {statusOptions.map((option) => {
                    const isActive = form.status === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleChange('status', option.value)}
                        className={`flex-1 rounded-full px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-primary/25 shadow-lg'
                            : 'text-muted-foreground hover:bg-secondary/60'
                        } `}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error */}
              {formError ? (
                <p className="text-destructive py-2 text-center text-xs font-medium">
                  {formError}
                </p>
              ) : (
                <p className="text-muted-foreground text-center text-[10px]">
                  * 为必填项
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/40 flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-extrabold shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>添加中...</span>
                  </>
                ) : (
                  <>
                    <span>添加设备</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>,
        document.body,
      )}
    </>
  );
}
