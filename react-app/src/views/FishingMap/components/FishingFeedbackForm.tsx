import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNotificationStore } from '@/stores/notificationState';

import { useFishingMapStore } from '@/stores/fishingMapStore';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { fishingMapService } from '../service';
import type { FishingFeedbackData, FishingLevel } from '../types';

interface FishingFeedbackFormProps {
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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
  }, [fishingData, liveWeather, locationId, locationName, selectedFeedback]);

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
    [
      feedbackPayload,
      notifyError,
      notifySuccess,
      onSuccess,
      service,
      selectedFeedback,
    ],
  );

  return (
    <AnimatePresence>
      <motion.div
        key="fb-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={onCancel}
        className="bg-foreground/30 fixed inset-0 z-40 backdrop-blur-[2px]"
        aria-hidden
      />
      <motion.aside
        key="fb-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="bg-background border-border fixed inset-x-0 bottom-0 z-50 flex h-auto max-h-[90dvh] flex-col rounded-t-2xl border-t shadow-2xl sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
        role="dialog"
        aria-label="钓鱼反馈"
      >
        <div className="bg-muted-foreground/40 mx-auto mt-2 h-1 w-9 rounded-full sm:hidden" />
        <div className="flex items-center justify-between px-5 py-3 sm:py-4">
          <h3 className="text-foreground text-lg font-semibold">钓鱼反馈</h3>
          <button
            type="button"
            aria-label="关闭"
            onClick={onCancel}
            className="hover:bg-muted text-muted-foreground inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-6">
          <p className="text-muted-foreground -mt-2 text-xs">
            你的反馈会帮助我们改进
          </p>

          <div className="bg-secondary rounded-lg p-3 text-sm">
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
              <div className="grid grid-cols-5 gap-1.5">
                {FEEDBACK_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedFeedback(option.value)}
                    className={`min-h-11 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
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

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="border-border text-card-foreground hover:bg-muted min-h-11 flex-1 rounded-full border px-4 text-sm font-medium transition-colors"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!selectedFeedback || loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 flex-1 rounded-full px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? '提交中...' : '确认提交'}
              </button>
            </div>
          </form>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
