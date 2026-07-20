import { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { motion, useReducedMotion } from 'framer-motion';

import { useFishingMapStore } from '@/stores/fishingMapStore';
import { useRouteMapStore } from '@/stores/routeMapStore';

import './fishingMap.css';

import { FishingAnalysisDrawer } from './components/FishingAnalysisDrawer';
import { FishingFeedbackForm } from './components/FishingFeedbackForm';
import { FishingIndexCard } from './components/FishingIndexCard';
import { FishingIndexDetailSheet } from './components/FishingIndexDetailSheet';
import { FishingMapFullscreen } from './components/FishingMapFullscreen';
import { FishingMapTile } from './components/FishingMapTile';
import { HourlyWeather } from './components/HourlyWeather';
import { QuickFeedbackBanner } from './components/QuickFeedbackBanner';
import { TideCard } from './components/TideCard';
import { WeatherCard } from './components/WeatherCard';
import { WeatherHero } from './components/WeatherHero';
import { MAP_CENTER, fishingSpots } from './constants';
import { AnalysisContextProvider } from './contexts/AnalysisContext';
import { useFishingAnalysis } from './hooks/useFishingAnalysis';
import { useFishingFeedback } from './hooks/useFishingFeedback';
import type { FishingIndexData } from './types';

export default function FishingMap() {
  const prefersReduced = useReducedMotion();

  // —— 状态聚合：三个 hook 接管 view 里所有派生状态 ——
  const analysis = useFishingAnalysis();
  const feedback = useFishingFeedback();

  const { userPosition, isPlanningRoute, routeInfo } = useRouteMapStore(
    useShallow((s) => ({
      userPosition: s.userPosition,
      isPlanningRoute: s.isPlanningRoute,
      routeInfo: s.routeInfo,
    })),
  );

  const fetchWeatherAndFishing = useFishingMapStore(
    (s) => s.fetchWeatherAndFishing,
  );
  const indexData = useFishingMapStore((s) => s.indexData);

  // —— 地图全屏 / 指数详情 sheet 状态 ——
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    data: FishingIndexData | null;
  }>({ open: false, data: null });

  // —— 副作用：用户定位到位后拉数据；初始按地图中心拉 ——
  useEffect(() => {
    if (userPosition) {
      void fetchWeatherAndFishing(userPosition);
    }
  }, [userPosition, fetchWeatherAndFishing]);

  useEffect(() => {
    void fetchWeatherAndFishing(MAP_CENTER);
  }, [fetchWeatherAndFishing]);

  const showFeedbackBanner = !isPlanningRoute && !routeInfo;

  const handleFeedbackClick = useCallback(
    (data: FishingIndexData) => {
      feedback.openFeedback(data, null);
    },
    [feedback],
  );

  const handleQuickFeedback = useCallback(() => {
    if (!indexData) return;
    feedback.openFeedback(indexData, null);
  }, [feedback, indexData]);

  const handleDetailClick = useCallback((data: FishingIndexData) => {
    setDetailSheet({ open: true, data });
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailSheet((prev) => ({ ...prev, open: false }));
  }, []);

  // —— 单次编排的入场（Apple: 内容一次落定，非逐段 fade-on-scroll） ——
  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.06, delayChildren: 0.03 },
    },
  };
  const item = prefersReduced
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 12 },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.42,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          },
        },
      };

  return (
    <AnalysisContextProvider analysisHasData={analysis.hasData}>
      <div className="bg-background min-h-screen">
        <FishingMapTile onFullscreen={() => setMapFullscreen(true)} />

        <motion.main
          variants={container}
          initial="hidden"
          animate="show"
          className="relative mx-auto w-full max-w-xl px-4 pt-3 pb-12"
        >
          {/* Hero — flat, generous breathing room before first data section */}
          <motion.div variants={item}>
            <WeatherHero
              analysisOpen={analysis.open}
              analysisHasData={analysis.hasData}
              onToggleAnalysis={analysis.toggle}
            />
          </motion.div>

          {/* iOS Weather rhythm: hairline-suggested sections, varied gap */}
          <motion.div variants={item} className="mt-2">
            <FishingIndexCard
              location={userPosition ?? MAP_CENTER}
              onFeedbackClick={handleFeedbackClick}
              onDetailClick={handleDetailClick}
            />
          </motion.div>

          {showFeedbackBanner && (
            <motion.div variants={item} className="mt-6">
              <QuickFeedbackBanner
                visible={showFeedbackBanner}
                disabled={!indexData}
                onSubmit={handleQuickFeedback}
              />
            </motion.div>
          )}

          <motion.div variants={item} className="mt-6">
            <WeatherCard location={userPosition ?? MAP_CENTER} />
          </motion.div>

          <motion.div variants={item} className="mt-6">
            <TideCard />
          </motion.div>

          <motion.div variants={item} className="mt-6">
            <HourlyWeather />
          </motion.div>

          {/* Closing line — literary voice stays, smaller + tab-aligned */}
          <p className="text-muted-foreground/60 font-family-averia mt-10 text-center text-xs italic">
            在出钓与阅读之间，留一片安静
          </p>
        </motion.main>

        {feedback.open && feedback.currentFishingData && (
          <FishingFeedbackForm
            fishingData={feedback.currentFishingData}
            locationId={feedback.locationId}
            locationName={feedback.locationName}
            onSuccess={feedback.closeFeedback}
            onCancel={feedback.closeFeedback}
          />
        )}

        <FishingAnalysisDrawer
          open={analysis.open}
          onClose={analysis.close}
          onGenerate={() => {
            // AI service 调用由 AnalysisContent 桥接（见下）；drawer 仅作为 UI 容器。
          }}
        />

        <FishingMapFullscreen
          open={mapFullscreen}
          onClose={() => setMapFullscreen(false)}
        />

        <FishingIndexDetailSheet
          open={detailSheet.open}
          data={detailSheet.data}
          onClose={handleDetailClose}
        />
      </div>
    </AnalysisContextProvider>
  );
}

// 引用 fishingSpots 以保树摇不掉（marker data 由 FishingMapTile 内部 useMap 直接读）
void fishingSpots;
