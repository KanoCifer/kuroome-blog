import { motion } from 'framer-motion';
import {
  Bell,
  BellOff,
  Calendar,
  ChevronRight,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Radio,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Device } from '@/api/deviceGateway';
import { deviceGateway } from '@/api/deviceGateway';
import type { ApiResponse } from '@/api/request';
import { useNotificationStore } from '@/stores/notificationState';

interface MilestoneConfigFormProps {
  device: Device;
  onClose: () => void;
  onSuccess?: (device: Device) => void;
}

type MilestonePreset = { label: string; days: number };
type Channel = 'email' | 'feishu' | 'bark';

interface MilestoneFormState {
  enabled: boolean;
  milestones: number[];
  channels: Channel[];
  email: string;
  feishu_webhook_url: string;
  bark_device_key: string;
}

interface GlobalConfig {
  email?: string;
  feishu_webhook_url?: string;
  bark_device_key?: string;
}

const milestonePresets: MilestonePreset[] = [
  { label: '100天', days: 100 },
  { label: '1年', days: 365 },
  { label: '2年', days: 730 },
];

const channelOptions: Array<{
  value: Channel;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: 'email', label: '邮件', icon: <Mail size={14} /> },
  { value: 'feishu', label: '飞书', icon: <MessageSquare size={14} /> },
  { value: 'bark', label: 'Bark', icon: <Bell size={14} /> },
];

function createInitialState(
  device: Device,
  globalConfig?: GlobalConfig | null,
): MilestoneFormState {
  const cfg = device.reminder_config as Record<string, unknown> | undefined;
  return {
    enabled: (cfg?.enabled as boolean) ?? true,
    milestones: Array.isArray(cfg?.milestones)
      ? (cfg.milestones as number[])
      : [100, 365, 730],
    channels: Array.isArray(cfg?.channels)
      ? (cfg.channels as Channel[])
      : ['email'],
    email: (cfg?.email as string) || globalConfig?.email || '',
    feishu_webhook_url:
      (cfg?.feishu_webhook_url as string) ||
      globalConfig?.feishu_webhook_url ||
      '',
    bark_device_key:
      (cfg?.bark_device_key as string) || globalConfig?.bark_device_key || '',
  };
}

function formatMilestone(days: number): string {
  if (days < 365) return `${days}天`;
  const years = Math.floor(days / 365);
  const remaining = days % 365;
  if (remaining === 0) return `${years}年`;
  if (remaining === 182) return `${years}年零半年`;
  return `${years}年${remaining}天`;
}

export function MilestoneConfigForm({
  device,
  onClose,
  onSuccess,
}: MilestoneConfigFormProps) {
  const gateway = useMemo(() => deviceGateway(), []);
  const notifySuccess = useNotificationStore((s) => s.success);
  const notifyError = useNotificationStore((s) => s.error);
  const [form, setForm] = useState<MilestoneFormState>(
    createInitialState(device, null),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [customMilestone, setCustomMilestone] = useState('');

  const fetchGlobalConfig = useCallback(async () => {
    try {
      const res = await gateway.getUserGlobalConfig();
      const wrapped = res.data as unknown as ApiResponse<{
        config: GlobalConfig;
      }>;
      const cfg = wrapped.data?.config;
      // globalConfig 返回后，补全空字段
      setForm((prev) => ({
        ...prev,
        email: prev.email || cfg?.email || '',
        feishu_webhook_url:
          prev.feishu_webhook_url || cfg?.feishu_webhook_url || '',
        bark_device_key: prev.bark_device_key || cfg?.bark_device_key || '',
      }));
    } catch {
      notifyError('获取全局配置失败');
    }
  }, [gateway, notifyError]);

  useEffect(() => {
    void fetchGlobalConfig();
  }, [fetchGlobalConfig]);

  const set = useCallback(
    <K extends keyof MilestoneFormState>(
      key: K,
      value: MilestoneFormState[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleMilestone = useCallback((days: number) => {
    setForm((prev) => ({
      ...prev,
      milestones: prev.milestones.includes(days)
        ? prev.milestones.filter((d) => d !== days)
        : [...prev.milestones, days].sort((a, b) => a - b),
    }));
  }, []);

  const addCustomMilestone = useCallback(() => {
    const val = Number.parseInt(customMilestone, 10);
    if (!Number.isFinite(val) || val <= 0) return;
    if (form.milestones.includes(val)) {
      setCustomMilestone('');
      return;
    }
    setForm((prev) => ({
      ...prev,
      milestones: [...prev.milestones, val].sort((a, b) => a - b),
    }));
    setCustomMilestone('');
  }, [customMilestone, form.milestones]);

  const toggleChannel = useCallback((ch: Channel) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter((c) => c !== ch)
        : [...prev.channels, ch],
    }));
  }, []);

  const handleTestNotification = useCallback(async () => {
    if (testLoading) return;
    setTestLoading(true);
    try {
      await gateway.testNotification(device.id);
      notifySuccess('测试通知已发送，请检查您的通知渠道');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : '测试通知发送失败，请检查配置';
      notifyError(msg);
    } finally {
      setTestLoading(false);
    }
  }, [device.id, gateway, notifyError, notifySuccess, testLoading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (form.channels.length === 0 && form.enabled) {
      setFormError('请至少选择一个通知渠道');
      return;
    }
    if (form.milestones.length === 0 && form.enabled) {
      setFormError('请至少选择一个里程碑');
      return;
    }

    // Validate channel-specific fields
    if (form.channels.includes('email') && !form.email.trim()) {
      setFormError('请填写邮件地址');
      return;
    }
    if (form.channels.includes('feishu') && !form.feishu_webhook_url.trim()) {
      setFormError('请填写飞书 Webhook 地址');
      return;
    }
    if (form.channels.includes('bark') && !form.bark_device_key.trim()) {
      setFormError('请填写 Bark Device Key');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      enabled: form.enabled,
      milestones: form.milestones,
      channels: form.channels,
      ...(form.email && { email: form.email.trim() }),
      ...(form.feishu_webhook_url && {
        feishu_webhook_url: form.feishu_webhook_url.trim(),
      }),
      ...(form.bark_device_key && {
        bark_device_key: form.bark_device_key.trim(),
      }),
    };

    try {
      const res = await gateway.updateDeviceReminderConfig(device.id, payload);
      notifySuccess('里程碑配置已保存');
      onSuccess?.(res.data as Device);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败，请稍后重试';
      setFormError(msg);
      notifyError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />,
        document.body,
      )}

      {createPortal(
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="fixed inset-x-4 inset-y-24 z-50 flex items-center justify-center sm:inset-x-auto sm:inset-y-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-slate-100 shadow-2xl dark:bg-[#1a2133] dark:shadow-xl dark:shadow-slate-900/60">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-slate-100 px-6 pt-6 pb-4 dark:border-white/10 dark:bg-[#1a2133]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 shadow-lg shadow-blue-500/30 dark:shadow-blue-900/50">
                    <Calendar size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-100">
                      里程碑提醒
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      {device.name}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  提醒配置
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 bg-slate-50 p-6 dark:bg-[#111827]"
            >
              {/* Enable Toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
                <div className="flex items-center gap-3">
                  {form.enabled ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 shadow-md">
                      <Bell size={16} className="text-white" />
                    </div>
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700">
                      <BellOff size={16} className="text-slate-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      启用里程碑提醒
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      在设备到达里程碑天数时发送通知
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.enabled}
                  onClick={() => set('enabled', !form.enabled)}
                  className={`relative flex h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
                    form.enabled
                      ? 'bg-blue-700'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                      form.enabled ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Milestones */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
                  <span className="shrink-0 text-xs font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                    里程碑节点
                  </span>
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {milestonePresets.map((preset) => {
                    const active = form.milestones.includes(preset.days);
                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => toggleMilestone(preset.days)}
                        className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-xs font-semibold transition-all duration-200 ${
                          active
                            ? 'bg-blue-700 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-900/40'
                            : 'bg-white text-slate-500 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:bg-white/5'
                        }`}
                      >
                        <span className="text-base">
                          {formatMilestone(preset.days)}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${
                            active
                              ? 'text-blue-100'
                              : 'text-slate-400 dark:text-slate-600'
                          }`}
                        >
                          Day {preset.days}
                        </span>
                        {active && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow">
                            <ChevronRight size={8} className="text-blue-700" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom milestone */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      value={customMilestone}
                      onChange={(e) => setCustomMilestone(e.target.value)}
                      placeholder="自定义天数..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-16 pl-4 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-slate-400">
                      天
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomMilestone}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 active:scale-95 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:border-blue-500/30 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Selected milestones tags */}
                {form.milestones.length > 0 && (
                  <div className="flex min-w-0 flex-wrap gap-1.5 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-3 dark:border-blue-500/30 dark:bg-blue-900/20">
                    {form.milestones.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 py-0.5 pr-1.5 pl-2.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      >
                        {formatMilestone(d)}
                        <button
                          type="button"
                          onClick={() => toggleMilestone(d)}
                          className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Channels */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
                  <span className="shrink-0 text-xs font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                    通知渠道
                  </span>
                  <button
                    type="button"
                    disabled={testLoading}
                    onClick={() => {
                      void handleTestNotification();
                    }}
                    className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                  >
                    {testLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Radio size={12} />
                    )}
                    测试通知
                  </button>
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
                </div>

                <div className="flex gap-2">
                  {channelOptions.map((opt) => {
                    const active = form.channels.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleChannel(opt.value)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 ${
                          active
                            ? 'bg-blue-700 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-900/40'
                            : 'bg-white text-slate-500 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:bg-white/5'
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Channel-specific fields */}
                {form.channels.includes('email') && (
                  <label className="block space-y-1">
                    <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      邮件地址
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="example@domain.com"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                    />
                  </label>
                )}

                {form.channels.includes('feishu') && (
                  <label className="block space-y-1">
                    <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      飞书 Webhook URL
                    </span>
                    <input
                      type="url"
                      value={form.feishu_webhook_url}
                      onChange={(e) =>
                        set('feishu_webhook_url', e.target.value)
                      }
                      placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                    />
                  </label>
                )}

                {form.channels.includes('bark') && (
                  <label className="block space-y-1">
                    <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Bark Device Key
                    </span>
                    <input
                      type="text"
                      value={form.bark_device_key}
                      onChange={(e) => set('bark_device_key', e.target.value)}
                      placeholder="设备Key或完整推送URL"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                    />
                  </label>
                )}
              </div>

              {/* Error */}
              {formError ? (
                <p className="py-2 text-center text-xs font-medium text-red-500 dark:text-red-400">
                  {formError}
                </p>
              ) : null}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-700 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <span>保存配置</span>
                    <ChevronRight size={18} />
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
