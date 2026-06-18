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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          className="bg-background/50 fixed inset-0 z-50 backdrop-blur-sm"
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
          <div className="bg-card max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="border-border bg-card sticky top-0 z-10 border-b px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary shadow-primary/30 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg">
                    <Calendar size={20} className="text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-foreground font-serif text-2xl font-bold">
                      里程碑提醒
                    </h2>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {device.name}
                    </p>
                  </div>
                </div>
                <span className="bg-warning/10 text-warning shrink-0 rounded-full px-3 py-1 text-xs font-semibold">
                  提醒配置
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-background space-y-6 p-6"
            >
              {/* Enable Toggle */}
              <div className="border-border bg-card flex items-center justify-between rounded-2xl border px-5 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {form.enabled ? (
                    <div className="bg-primary flex h-9 w-9 items-center justify-center rounded-xl shadow-md">
                      <Bell size={16} className="text-primary-foreground" />
                    </div>
                  ) : (
                    <div className="bg-secondary flex h-9 w-9 items-center justify-center rounded-xl">
                      <BellOff size={16} className="text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      启用里程碑提醒
                    </p>
                    <p className="text-muted-foreground text-xs">
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
                    form.enabled ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <span
                    className={`bg-card absolute top-0.5 h-5 w-5 rounded-full shadow-md transition-transform duration-300 ${
                      form.enabled ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Milestones */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="via-border h-px flex-1 bg-linear-to-r from-transparent to-transparent" />
                  <span className="text-muted-foreground shrink-0 text-xs font-semibold tracking-widest uppercase">
                    里程碑节点
                  </span>
                  <div className="via-border h-px flex-1 bg-linear-to-r from-transparent to-transparent" />
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
                            ? 'bg-primary text-primary-foreground shadow-primary/25 shadow-lg'
                            : 'bg-card text-muted-foreground hover:bg-muted shadow-sm'
                        }`}
                      >
                        <span className="text-base">
                          {formatMilestone(preset.days)}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${
                            active
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          Day {preset.days}
                        </span>
                        {active && (
                          <span className="bg-card absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full shadow">
                            <ChevronRight size={8} className="text-primary" />
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
                      className="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-xl border py-2.5 pr-16 pl-4 text-sm font-medium ring-2 ring-transparent transition-all outline-none"
                    />
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs">
                      天
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomMilestone}
                    className="border-input bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Selected milestones tags */}
                {form.milestones.length > 0 && (
                  <div className="border-primary/30 bg-primary/10 flex min-w-0 flex-wrap gap-1.5 rounded-xl border border-dashed p-3">
                    {form.milestones.map((d) => (
                      <span
                        key={d}
                        className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full py-0.5 pr-1.5 pl-2.5 text-xs font-semibold"
                      >
                        {formatMilestone(d)}
                        <button
                          type="button"
                          onClick={() => toggleMilestone(d)}
                          className="hover:bg-primary/20 flex h-4 w-4 items-center justify-center rounded-full"
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
                  <div className="via-border h-px flex-1 bg-linear-to-r from-transparent to-transparent" />
                  <span className="text-muted-foreground shrink-0 text-xs font-semibold tracking-widest uppercase">
                    通知渠道
                  </span>
                  <button
                    type="button"
                    disabled={testLoading}
                    onClick={() => {
                      void handleTestNotification();
                    }}
                    className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 ml-auto flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {testLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Radio size={12} />
                    )}
                    测试通知
                  </button>
                  <div className="via-border h-px flex-1 bg-linear-to-r from-transparent to-transparent" />
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
                            ? 'bg-primary text-primary-foreground shadow-primary/25 shadow-lg'
                            : 'bg-card text-muted-foreground hover:bg-muted shadow-sm'
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
                    <span className="text-muted-foreground ml-1 text-xs font-semibold">
                      邮件地址
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="example@domain.com"
                      className="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-xl border px-4 py-2.5 text-sm font-medium ring-2 ring-transparent transition-all outline-none"
                    />
                  </label>
                )}

                {form.channels.includes('feishu') && (
                  <label className="block space-y-1">
                    <span className="text-muted-foreground ml-1 text-xs font-semibold">
                      飞书 Webhook URL
                    </span>
                    <input
                      type="url"
                      value={form.feishu_webhook_url}
                      onChange={(e) =>
                        set('feishu_webhook_url', e.target.value)
                      }
                      placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                      className="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-xl border px-4 py-2.5 text-sm font-medium ring-2 ring-transparent transition-all outline-none"
                    />
                  </label>
                )}

                {form.channels.includes('bark') && (
                  <label className="block space-y-1">
                    <span className="text-muted-foreground ml-1 text-xs font-semibold">
                      Bark Device Key
                    </span>
                    <input
                      type="text"
                      value={form.bark_device_key}
                      onChange={(e) => set('bark_device_key', e.target.value)}
                      placeholder="设备Key或完整推送URL"
                      className="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-xl border px-4 py-2.5 text-sm font-medium ring-2 ring-transparent transition-all outline-none"
                    />
                  </label>
                )}
              </div>

              {/* Error */}
              {formError ? (
                <p className="text-destructive py-2 text-center text-xs font-medium">
                  {formError}
                </p>
              ) : null}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/40 flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-extrabold shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
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
