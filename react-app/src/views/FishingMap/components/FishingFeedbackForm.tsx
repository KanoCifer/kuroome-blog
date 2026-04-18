import { useCallback, useMemo, useState } from 'react';

import { useNotificationStore } from '@/stores/notificationState';

import { useFishingMapStore } from '@/stores/fishingMapStore';
import dayjs from 'dayjs';
import { fishingMapService } from '../service';
import type { FishingFeedbackData, FishingLevel, TideData } from '../types';

interface FishingFeedbackFormProps {
  fishingData: FishingFeedbackData;
  locationId: string;
  locationName: string;
  tideData?: TideData | null;
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
  tideData,
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

  const feedbackPayload = useMemo(() => {
    // 优先使用 context 中的实时数据，不再依赖父组件拼装
    let tideLevel = 1.5;
    let tideType: '涨潮' | '退潮' = '涨潮';
    let tideRange = 1.5;
    let hoursToNextTide = 3.0;

    if (tideData?.tideTable?.length) {
      const currentTide = tideData.tideTable[0];
      const nextTide = tideData.tideTable[1];
      tideType = currentTide.type === 'H' ? '涨潮' : '退潮';
      tideLevel = Number(currentTide.height) || 1.5;
      if (nextTide) {
        const nextLevel = Number(nextTide.height) || 1.5;
        tideRange = Math.abs(nextLevel - tideLevel);
        hoursToNextTide =
          (new Date(nextTide.fxTime).getTime() -
            new Date(currentTide.fxTime).getTime()) /
          (1000 * 60 * 60);
      }
    }

    const windLevel = 2;

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
      indices: windLevel,
      tide_level: tideLevel,
      tide_type: tideType,
      tide_range: tideRange,
      hours_to_next_tide: hoursToNextTide,
    };
  }, [
    fishingData,
    liveWeather,
    locationId,
    locationName,
    selectedFeedback,
    tideData,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          钓鱼反馈
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            你的反馈会帮助我们改进
          </span>
        </h3>

        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-400">
            地点: {locationName}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            当前指数: {fishingData.fishing_index} ({fishingData.level})
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
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
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!selectedFeedback || loading}
              className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '提交中...' : '确认提交'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
