import { useCallback, useMemo, useState } from 'react';

import { useNotificationStore } from '@/stores/notificationState';

import { useFishingMapStore } from '@/stores/fishingMapStore';
import dayjs from 'dayjs';
import { fishingMapService } from '../service';
import type { FishingFeedbackData, FishingLevel } from '../types';

interface FishingFeedbackFormProps {
  /**
   * 由 useFishingFeedback.openFeedback 拼装好的 FishingFeedbackData：
   * 包含 liveWeather 实时值 + 潮汐表派生（涨退 / 潮差 / 距下一潮）。
   * 表单只负责 UI 渲染与提交，不再做派生。
   */
  fishingData: FishingFeedbackData;
  locationId: string;
  locationName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const FEEDBACK_OPTIONS: { value: FishingLevel; label: string }[] = [
  { value: '爆护', label: '爆护' },
  { value: '好', label: '好' },
  { value: '一般', label: '一般' },
  { value: '差', label: '差' },
  { value: '空军', label: '空军' },
];

export function FishingFeedbackForm({
  fishingData,
  locationId,
  locationName,
  onSuccess,
  onCancel,
}: FishingFeedbackFormProps) {
  const notifyError = useNotificationStore((state) => state.error);
  const notifySuccess = useNotificationStore((state) => state.success);
  const liveWeather = useFishingMapStore((s) => s.liveWeather);
  const service = useMemo(() => fishingMapService(), []);

  const [loading, setLoading] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FishingLevel | null>(
    null,
  );

  /**
   * 提交时再覆盖一次实时天气字段 —— 用户打开表单后等 30 秒再提交，
   * 这时 liveWeather 已经更新，覆盖一次能让指数校准用的特征更贴近实际。
   * 潮汐 / 风级（indices）已由 hook 锁定，不在这里再覆盖。
   */
  const feedbackPayload = useMemo(() => {
    return {
      location_id: locationId,
      location_name: locationName,
      fishing_time: dayjs().toISOString(),
      feedback: selectedFeedback!,
      temperature: Number(liveWeather?.temp) || fishingData.temperature,
      humidity: Number(liveWeather?.humidity) || fishingData.humidity,
      pressure: Number(liveWeather?.pressure) || fishingData.pressure,
      wind_speed: Number(liveWeather?.windSpeed) || fishingData.wind_speed,
      precipitation: Number(liveWeather?.precip) || fishingData.precipitation,
      indices: fishingData.indices,
      tide_level: fishingData.tide_level,
      tide_type: fishingData.tide_type,
      tide_range: fishingData.tide_range,
      hours_to_next_tide: fishingData.hours_to_next_tide,
    };
  }, [
    fishingData,
    liveWeather,
    locationId,
    locationName,
    selectedFeedback,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedFeedback) {
        notifyError('请选择钓鱼体验');
        return;
      }

      setLoading(true);

      try {
        await service.submitFishingFeedback(feedbackPayload);
        notifySuccess('反馈已提交，感谢您的分享！');
        onSuccess?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '提交反馈失败，请重试';
        notifyError(message);
      } finally {
        setLoading(false);
      }
    },
    [feedbackPayload, notifyError, notifySuccess, onSuccess, service],
  );

  return (
    <div className="bg-background/50 fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-card mx-4 w-full max-w-md rounded-2xl p-6 shadow-xl">
        <h3 className="text-foreground mb-4 text-lg font-semibold">
          钓鱼反馈
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            你的反馈会帮助我们改进
          </span>
        </h3>

        <div className="bg-secondary mb-4 rounded-lg p-3 text-sm">
          <p className="text-muted-foreground">地点: {locationName}</p>
          <p className="text-muted-foreground">
            当前指数: {fishingData.fishing_index} ({fishingData.level})
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="text-card-foreground mb-2 block text-sm font-medium">
              您的钓鱼体验
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FEEDBACK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedFeedback(option.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    selectedFeedback === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-card-foreground hover:bg-secondary/80'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="border-border text-card-foreground hover:bg-accent flex-1 rounded-lg border px-4 py-2 text-sm font-medium"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!selectedFeedback || loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '提交中...' : '确认提交'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
