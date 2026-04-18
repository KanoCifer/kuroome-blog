import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { motion } from 'framer-motion';

import { useFishingMapStore } from '@/stores/fishingMapStore';
import { useNotificationStore } from '@/stores/notificationState';

import { AIAnalysisWidget } from './components/AIAnalysisWidget';
import { FishingFeedbackForm } from './components/FishingFeedbackForm';
import { FishingIndexCard } from './components/FishingIndexCard';
import { FishingMapHeader } from './components/FishingMapHeader';
import { MapPanel } from './components/MapPanel';
import { RouteStatusCard } from './components/RouteStatusCard';
import { TideCard } from './components/TideCard';
import { WeatherCard } from './components/WeatherCard';
import {
  AnalysisContextProvider,
  useAnalysisContext,
} from './contexts/AnalysisContext';
import { MAP_CENTER } from './constants';
import { useMap } from './hooks/useMap';
import { fishingMapService } from './service';
import type { FishingFeedbackData, FishingIndexData } from './types';

export default function FishingMap() {
  const service = useMemo(() => fishingMapService(), []);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLocationId] = useState('default');
  const [feedbackLocationName] = useState('钓鱼地点');
  const [currentFishingData, setCurrentFishingData] =
    useState<FishingFeedbackData | null>(null);

  const getSecurityJsCode = useCallback(
    () => service.getSecurityJsCode(),
    [service],
  );

  const handleMarkerClick = useCallback(
    async (_index: number, _userPosition: [number, number]) => {
      // Route planning is handled by useMap internally via store actions
    },
    [],
  );

  const { isMapReady, userPosition } = useMap(
    mapContainerRef,
    getSecurityJsCode,
    handleMarkerClick,
  );

  // Initial data fetch when user position is known
  useEffect(() => {
    if (userPosition) {
      const { fetchWeatherAndFishing, fetchTide } =
        useFishingMapStore.getState();
      void fetchWeatherAndFishing(userPosition);
      void fetchTide();
    }
  }, [userPosition]);

  const { liveWeather, tideData } = useFishingMapStore((s) => ({
    liveWeather: s.liveWeather,
    tideData: s.tideData,
  }));
  const analysisHasData = liveWeather !== null && tideData !== null;

  return (
    <AnalysisContextProvider analysisHasData={analysisHasData}>
      <FishingMapContent
        service={service}
        userPosition={userPosition}
        isMapReady={isMapReady}
        mapContainerRef={mapContainerRef}
        feedbackOpen={feedbackOpen}
        currentFishingData={currentFishingData}
        feedbackLocationId={feedbackLocationId}
        feedbackLocationName={feedbackLocationName}
        onFeedbackOpen={() => setFeedbackOpen(true)}
        onFeedbackClose={() => setFeedbackOpen(false)}
        onFeedbackDataChange={setCurrentFishingData}
      />
    </AnalysisContextProvider>
  );
}

interface FishingMapContentProps {
  service: ReturnType<typeof fishingMapService>;
  userPosition: [number, number] | null;
  isMapReady: boolean;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  feedbackOpen: boolean;
  currentFishingData: FishingFeedbackData | null;
  feedbackLocationId: string;
  feedbackLocationName: string;
  onFeedbackOpen: () => void;
  onFeedbackClose: () => void;
  onFeedbackDataChange: (data: FishingFeedbackData) => void;
}

function FishingMapContent({
  service,
  userPosition,
  isMapReady,
  mapContainerRef,
  feedbackOpen,
  currentFishingData,
  feedbackLocationId,
  feedbackLocationName,
  onFeedbackOpen,
  onFeedbackClose,
  onFeedbackDataChange,
}: FishingMapContentProps) {
  const { liveWeather, tideData } = useFishingMapStore((s) => ({
    liveWeather: s.liveWeather,
    tideData: s.tideData,
  }));

  const handleFeedbackClick = useCallback(
    (data: FishingIndexData) => {
      onFeedbackDataChange({
        fishing_index: data.fishing_index,
        level: data.level,
        temperature: liveWeather ? Number(liveWeather.temp) : 20,
        humidity: liveWeather ? Number(liveWeather.humidity) : 50,
        pressure: liveWeather ? Number(liveWeather.pressure) : 1013,
        wind_speed: liveWeather ? Number(liveWeather.windSpeed) : 0,
        precipitation: liveWeather ? Number(liveWeather.precip) : 0,
        indicate: 2,
        tide_level: tideData?.tideHourly?.[0]?.height
          ? Number(tideData.tideHourly[0].height)
          : 1.5,
        tide_type: undefined,
        tide_range: 1.5,
        hours_to_next_tide: 3.0,
      });
      onFeedbackOpen();
    },
    [liveWeather, tideData, onFeedbackDataChange, onFeedbackOpen],
  );

  return (
    <>
      <div className="fixed inset-0 bg-gray-50/90 dark:bg-gray-900/90" />
      <FishingMapHeader />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto mb-24 min-h-dvh w-full max-w-xl px-4 pt-4"
      >
        <section className="space-y-4">
          <RouteStatusCard />
          <MapPanel isMapReady={isMapReady} mapContainerRef={mapContainerRef} />
          <div className="grid grid-cols-1 gap-4">
            <FishingIndexCard
              location={userPosition ?? MAP_CENTER}
              onFeedbackClick={handleFeedbackClick}
            />
            <WeatherCard location={userPosition ?? MAP_CENTER} />
            <TideCard />
          </div>
        </section>

        <AnalysisContent
          service={service}
          feedbackOpen={feedbackOpen}
          currentFishingData={currentFishingData}
          feedbackLocationId={feedbackLocationId}
          feedbackLocationName={feedbackLocationName}
          onFeedbackClose={onFeedbackClose}
        />
      </motion.div>
    </>
  );
}

// AI 分析内容（放在 Provider 树内，可访问 store）
interface AnalysisContentProps {
  service: ReturnType<typeof fishingMapService>;
  feedbackOpen: boolean;
  currentFishingData: FishingFeedbackData | null;
  feedbackLocationId: string;
  feedbackLocationName: string;
  onFeedbackClose: () => void;
}

function AnalysisContent({
  service,
  feedbackOpen,
  currentFishingData,
  feedbackLocationId,
  feedbackLocationName,
  onFeedbackClose,
}: AnalysisContentProps) {
  const notifyError = useNotificationStore((state) => state.error);
  const notifyErrorRef = useRef(notifyError);
  const analysisResultRef = useRef('');
  const analysisAbortRef = useRef<AbortController | null>(null);

  const { liveWeather, forecasts, tideData, locationName, tideSpotName } =
    useFishingMapStore((s) => ({
      liveWeather: s.liveWeather,
      forecasts: s.forecasts,
      tideData: s.tideData,
      locationName: s.locationName,
      tideSpotName: s.tideSpotName,
    }));

  const { setAnalysisError, setAnalysisResult } = useAnalysisContext();

  // Keep refs in sync without triggering the effect
  useEffect(() => {
    notifyErrorRef.current = notifyError;
  }, [notifyError]);

  // Keep analysis setters in refs so generateAnalysis doesn't re-create on every render
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
      locationName: locationName || '钓鱼地点',
      tideSpotName: tideSpotName || '黄埔港',
    }),
    [forecasts, liveWeather, locationName, tideData, tideSpotName],
  );

  const generateAnalysis = useCallback(async () => {
    if (analysisResultRef.current) return; // already has result, guard against stale closures
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
    }
  }, [analysisPayload, service]);

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
