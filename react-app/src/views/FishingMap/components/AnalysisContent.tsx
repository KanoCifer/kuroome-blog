import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useNotificationStore } from '@/stores/notificationState';

import { useFishingMapStore } from '@/stores/fishingMapStore';
import { useAnalysisContext } from '../contexts/AnalysisContext';
import type { FishingFeedbackData } from '../types';
import { AIAnalysisWidget } from './AIAnalysisWidget';
import { FishingFeedbackForm } from './FishingFeedbackForm';

interface AnalysisContentProps {
  service: ReturnType<typeof import('../service').fishingMapService>;
  feedbackOpen: boolean;
  currentFishingData: FishingFeedbackData | null;
  feedbackLocationId: string;
  feedbackLocationName: string;
  tideData: import('../types').TideData | null;
  tideSpotName: string;
  onFeedbackClose: () => void;
}

export function AnalysisContent({
  service,
  feedbackOpen,
  currentFishingData,
  feedbackLocationId,
  feedbackLocationName,
  tideData,
  tideSpotName,
  onFeedbackClose,
}: AnalysisContentProps) {
  const notifyError = useNotificationStore((state) => state.error);
  const notifyErrorRef = useRef(notifyError);
  const analysisResultRef = useRef('');
  const analysisAbortRef = useRef<AbortController | null>(null);

  const { liveWeather, forecasts, locationName, weatherIndices } =
    useFishingMapStore(
      useShallow((s) => ({
        liveWeather: s.liveWeather,
        forecasts: s.forecasts,
        locationName: s.locationName,
        weatherIndices: s.weatherIndices,
      })),
    );

  const { setAnalysisError, setAnalysisResult, setAnalysisLoading } =
    useAnalysisContext();

  useEffect(() => {
    notifyErrorRef.current = notifyError;
  }, [notifyError]);

  const setAnalysisResultRef = useRef(setAnalysisResult);
  const setAnalysisErrorRef = useRef(setAnalysisError);
  useEffect(() => {
    setAnalysisResultRef.current = setAnalysisResult;
    setAnalysisErrorRef.current = setAnalysisError;
  });

  useEffect(() => {
    return () => {
      analysisAbortRef.current?.abort();
    };
  }, []);

  const analysisPayload = useMemo(
    () => ({
      liveWeather,
      forecasts,
      tideData,
      weatherIndices,
      locationName: locationName || '未知地点',
      tideSpotName: tideSpotName || '黄埔港',
    }),
    [
      forecasts,
      liveWeather,
      locationName,
      tideData,
      tideSpotName,
      weatherIndices,
    ],
  );

  const generateAnalysis = useCallback(async () => {
    if (analysisResultRef.current) return;
    if (analysisAbortRef.current) return;

    const controller = new AbortController();
    analysisAbortRef.current = controller;
    analysisResultRef.current = '';
    setAnalysisResultRef.current('');
    setAnalysisErrorRef.current('');

    try {
      await service.generateAnalysis(
        analysisPayload,
        (content) => {
          analysisResultRef.current += content;
          setAnalysisResultRef.current(analysisResultRef.current);
        },
        controller.signal,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const message = error instanceof Error ? error.message : 'AI 分析失败';
      setAnalysisErrorRef.current(message);
      notifyErrorRef.current(message);
    } finally {
      if (analysisAbortRef.current === controller) {
        analysisAbortRef.current = null;
      }
      setAnalysisLoading(false);
    }
  }, [analysisPayload, service, setAnalysisLoading]);

  return (
    <>
      <AIAnalysisWidget onGenerate={() => void generateAnalysis()} />
      {feedbackOpen && currentFishingData && (
        <FishingFeedbackForm
          fishingData={currentFishingData}
          locationId={feedbackLocationId}
          locationName={feedbackLocationName}
          onSuccess={onFeedbackClose}
          onCancel={onFeedbackClose}
        />
      )}
    </>
  );
}
