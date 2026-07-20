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

const SHEET_SPRING = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 32,
  mass: 0.8,
};

/**
 * 钓鱼反馈表单 — Apple HIG sheet (mobile bottom) / centered modal (desktop)。
 * 5 选 1 用 Apple SegmentedControl 风格的容器; 提交/取消用主按钮 + secondary。
 */
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
        className="bg-foreground/30 fixed inset-0 z-40 backdrop-blur-sm"
        aria-hidden
      />
      <motion.aside
        key="fb-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SHEET_SPRING}
        className="fm-sheet fixed inset-x-0 bottom-0 z-50 flex h-auto max-h-[90dvh] flex-col rounded-t-3xl sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
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

          {/* Context — Apple HIG inset tile */}
          <div className="fm-tile px-3 py-2.5">
            <p className="text-muted-foreground text-xs">
              地点 · {locationName}
            </p>
            <p className="text-foreground mt-0.5 text-sm tabular-nums">
              当前指数 {fishingData.fishing_index}{' '}
              <span className="text-muted-foreground">
                ({fishingData.level})
              </span>
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="text-foreground mb-2 block text-sm font-medium">
                您的钓鱼体验
              </label>
              <div className="fm-segmented w-full overflow-hidden">
                {FEEDBACK_OPTIONS.map((option) => {
                  const isActive = selectedFeedback === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedFeedback(option.value)}
                      aria-pressed={isActive}
                      className={`min-h-9 flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200 ease-out ${
                        isActive
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="bg-muted text-foreground hover:bg-muted/70 min-h-11 flex-1 rounded-full px-4 text-sm font-medium transition-colors"
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