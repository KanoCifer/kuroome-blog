import { subService } from '@/services/subService';
import { BellRing, CheckCircle2, Mail, Settings } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { SubscriptionModal } from './SubscriptionModal';

interface GlobalConfig {
  email?: string;
  feishu_webhook_url?: string;
  bark_device_key?: string;
}

export function ConfigManageButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#00288e] px-6 py-5 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:opacity-90 active:scale-95 dark:bg-blue-600 dark:shadow-blue-900/40"
      onClick={onOpen}
    >
      <BellRing className="size-5" />
      全局配置
    </button>
  );
}

interface ConfigFormState {
  email: string;
  feishu_webhook_url: string;
  bark_device_key: string;
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export default function ConfigManage() {
  const service = useMemo(() => subService(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfigFormState>({
    email: '',
    feishu_webhook_url: '',
    bark_device_key: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const globalConfig: GlobalConfig =
          (await service.getUserGlobalConfig()) ?? {};
        setConfig({
          email: toString(globalConfig.email),
          feishu_webhook_url: toString(globalConfig.feishu_webhook_url),
          bark_device_key: toString(globalConfig.bark_device_key),
        });
      } catch {
        setError('加载配置失败，请稍后重试。');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      void loadConfig();
    }
  }, [isOpen, service]);

  const handleChange = <K extends keyof ConfigFormState>(
    key: K,
    value: ConfigFormState[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    const payload: Record<string, unknown> = {};
    const email = config.email.trim();
    const feishu = config.feishu_webhook_url.trim();
    const bark = config.bark_device_key.trim();

    if (email) payload.email = email;
    if (feishu) payload.feishu_webhook_url = feishu;
    if (bark) payload.bark_device_key = bark;

    try {
      await service.updateUserGlobalConfig(payload);
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 1500);
    } catch {
      setError('保存配置失败，请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  return (
    <>
      <ConfigManageButton onOpen={onOpen} />

      <SubscriptionModal isOpen={isOpen} onClose={onClose}>
        <div className="relative mx-auto max-w-lg space-y-6 px-4 pt-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/50">
              <BellRing
                size={24}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <h3 className="font-headline text-on-surface text-lg font-bold">
                全局默认通知配置
              </h3>
              <p className="text-on-surface-variant text-xs">
                设置各渠道的默认凭证
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Email Config */}
              <div className="rounded-2xl border border-gray-200/80 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900/60">
                <h4 className="text-on-surface-variant font-label mb-3 ml-1 flex items-center gap-2 text-xs font-semibold">
                  <Mail size={14} />
                  邮件通知
                </h4>
                <input
                  type="email"
                  value={config.email}
                  onChange={(event) =>
                    handleChange('email', event.target.value)
                  }
                  placeholder="your@email.com"
                  className="text-on-surface placeholder:text-outline/50 w-full rounded-xl border-0 bg-white px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800"
                />
              </div>

              {/* Feishu Config */}
              <div className="rounded-2xl border border-gray-200/80 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900/60">
                <h4 className="text-on-surface-variant font-label mb-3 ml-1 flex items-center gap-2 text-xs font-semibold">
                  <Settings size={14} />
                  飞书 Webhook
                </h4>
                <input
                  type="text"
                  value={config.feishu_webhook_url}
                  onChange={(event) =>
                    handleChange('feishu_webhook_url', event.target.value)
                  }
                  placeholder="https://open.feishu.cn/..."
                  className="text-on-surface placeholder:text-outline/50 w-full rounded-xl border-0 bg-white px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800"
                />
              </div>

              {/* Bark Config */}
              <div className="rounded-2xl border border-gray-200/80 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900/60">
                <h4 className="text-on-surface-variant font-label mb-3 ml-1 flex items-center gap-2 text-xs font-semibold">
                  <BellRing size={14} />
                  Bark 通知
                </h4>
                <input
                  type="text"
                  value={config.bark_device_key}
                  onChange={(event) =>
                    handleChange('bark_device_key', event.target.value)
                  }
                  placeholder="填写 Bark 设备 Key"
                  className="text-on-surface placeholder:text-outline/50 w-full rounded-xl border-0 bg-white px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <CheckCircle2 size={16} />
                  配置保存成功
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="font-headline text-on-surface flex-1 rounded-full border border-gray-300 px-4 py-3 text-sm font-semibold transition-all hover:bg-gray-100 active:scale-[0.98] dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="font-headline flex-1 rounded-full bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                >
                  {isSaving ? '保存中...' : '保存配置'}
                </button>
              </div>
            </>
          )}
        </div>
      </SubscriptionModal>
    </>
  );
}
