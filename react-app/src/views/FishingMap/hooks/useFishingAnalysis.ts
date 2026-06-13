/**
 * AI 天气分析抽屉的状态聚合。
 *
 * 职责：
 * - 维护 drawer 开关
 * - 从 store 拼装 WeatherAnalysisPayload（live / forecasts / tide / index / location）
 * - 判定是否有可分析的数据（用于 header 按钮上的红点）
 *
 * 抽出原因：原本散落在 FishingMap.tsx 的 useState 与派生 payload，view 里业务状态太多。
 */
import { useCallback, useMemo, useState } from 'react';

import { useFishingMapStore } from '@/stores/fishingMapStore';

import type { WeatherAnalysisPayload } from '../types';

export interface UseFishingAnalysisResult {
  open: boolean;
  payload: WeatherAnalysisPayload | null;
  hasData: boolean;
  toggle: () => void;
  close: () => void;
}

export function useFishingAnalysis(): UseFishingAnalysisResult {
  const liveWeather = useFishingMapStore((s) => s.liveWeather);
  const forecasts = useFishingMapStore((s) => s.forecasts);
  const tideData = useFishingMapStore((s) => s.tideData);
  const weatherIndices = useFishingMapStore((s) => s.weatherIndices);
  const indexData = useFishingMapStore((s) => s.indexData);
  const locationName = useFishingMapStore((s) => s.locationName);
  const panelTideSpotName = useFishingMapStore((s) => s.panelTideSpotName);

  const [open, setOpen] = useState(false);

  const payload = useMemo<WeatherAnalysisPayload | null>(() => {
    if (!liveWeather && forecasts.length === 0 && !tideData) {
      return null;
    }
    return {
      liveWeather,
      forecasts,
      tideData,
      weatherIndices,
      fishingIndex: indexData ?? undefined,
      locationName,
      tideSpotName: panelTideSpotName,
    };
  }, [
    liveWeather,
    forecasts,
    tideData,
    weatherIndices,
    indexData,
    locationName,
    panelTideSpotName,
  ]);

  const hasData =
    liveWeather !== null || forecasts.length > 0 || tideData !== null;

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  return { open, payload, hasData, toggle, close };
}
