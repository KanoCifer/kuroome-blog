import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { motion } from 'framer-motion';

import { useFishingMapStore } from '@/stores/fishingMapStore';

import { AnalysisContent } from './components/AnalysisContent';
import { FishingIndexCard } from './components/FishingIndexCard';
import { FishingMapHeader } from './components/FishingMapHeader';
import { HourlyWeather } from './components/HourlyWeather';
import { MapPanel } from './components/MapPanel';
import { RouteStatusCard } from './components/RouteStatusCard';
import { TideCard } from './components/TideCard';
import { WeatherCard } from './components/WeatherCard';
import { MAP_CENTER, fishingSpots } from './constants';
import { AnalysisContextProvider } from './contexts/AnalysisContext';
import { useMap } from './hooks/useMap';
import { fishingMapService } from './service';
import type { FishingFeedbackData, FishingIndexData } from './types';

export default function FishingMap() {
  const service = useMemo(() => fishingMapService(), []);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [currentFishingData, setCurrentFishingData] =
    useState<FishingFeedbackData | null>(null);

  const getSecurityJsCode = useCallback(
    () => service.getSecurityJsCode(),
    [service],
  );

  const handleMarkerClick = useCallback(
    async (index: number, userPosition: [number, number]) => {
      const selectedSpot = fishingSpots[index];
      if (!selectedSpot || !userPosition) return;
      try {
        await planRouteRef.current(userPosition, selectedSpot.position);
      } catch {
        // error handled in planRoute
      }
    },
    [],
  );

  const { userPosition, planRoute } = useMap(
    mapContainerRef,
    getSecurityJsCode,
    handleMarkerClick,
  );
  const planRouteRef = useRef(planRoute);

  // Initial data fetch when user position is known
  useEffect(() => {
    if (userPosition) {
      void useFishingMapStore.getState().fetchWeatherAndFishing(userPosition);
    }
  }, [userPosition]);

  const liveWeather = useFishingMapStore((s) => s.liveWeather);
  const tideData = useFishingMapStore((s) => s.tideData);

  const analysisHasData = liveWeather !== null && tideData !== null;

  const handleFeedbackClick = useCallback(
    (data: FishingIndexData) => {
      setCurrentFishingData({
        fishing_index: data.fishing_index,
        level: data.level,
        temperature: liveWeather ? Number(liveWeather.temp) : 20,
        humidity: liveWeather ? Number(liveWeather.humidity) : 50,
        pressure: liveWeather ? Number(liveWeather.pressure) : 1013,
        wind_speed: liveWeather ? Number(liveWeather.windSpeed) : 0,
        precipitation: liveWeather ? Number(liveWeather.precip) : 0,
        indices: 2,
        tide_level:
          tideData &&
          'tideHourly' in tideData &&
          tideData.tideHourly?.[0]?.height
            ? Number(tideData.tideHourly[0].height)
            : 1.5,
        tide_type: undefined,
        tide_range: 1.5,
        hours_to_next_tide: 3.0,
      });
      setFeedbackOpen(true);
    },
    [liveWeather, tideData],
  );

  return (
    <AnalysisContextProvider analysisHasData={analysisHasData}>
      <div className="fixed inset-0 w-screen bg-gray-50/90 dark:bg-gray-900/90" />
      <FishingMapHeader />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto mb-24 min-h-dvh w-full max-w-xl px-4 pt-4"
      >
        <section className="space-y-4">
          <RouteStatusCard />
          <MapPanel mapContainerRef={mapContainerRef} />
          <div className="grid grid-cols-1 gap-4">
            <FishingIndexCard
              location={userPosition ?? MAP_CENTER}
              onFeedbackClick={handleFeedbackClick}
            />
            <WeatherCard location={userPosition ?? MAP_CENTER} />
            <TideCard />
            <HourlyWeather />
          </div>
        </section>

        <AnalysisContent
          service={service}
          feedbackOpen={feedbackOpen}
          currentFishingData={currentFishingData}
          feedbackLocationId="default"
          feedbackLocationName="钓鱼地点"
          tideData={tideData}
          tideSpotName="黄埔港"
          onFeedbackClose={() => setFeedbackOpen(false)}
        />
      </motion.div>
    </AnalysisContextProvider>
  );
}
