import { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { motion } from 'framer-motion';

import { useFishingMapStore } from '@/stores/fishingMapStore';
import { useRouteMapStore } from '@/stores/routeMapStore';

import { FishingAnalysisDrawer } from './components/FishingAnalysisDrawer';
import { FishingDashboardHeader } from './components/FishingDashboardHeader';
import { FishingFeedbackForm } from './components/FishingFeedbackForm';
import { FishingIndexCard } from './components/FishingIndexCard';
import { FishingIndexDetailSheet } from './components/FishingIndexDetailSheet';
import { FishingMapFullscreen } from './components/FishingMapFullscreen';
import { FishingMapTile } from './components/FishingMapTile';
import { HourlyWeather } from './components/HourlyWeather';
import { QuickFeedbackBanner } from './components/QuickFeedbackBanner';
import { TideCard } from './components/TideCard';
import { WeatherCard } from './components/WeatherCard';
import { MAP_CENTER, fishingSpots } from './constants';
import { AnalysisContextProvider } from './contexts/AnalysisContext';
import { useFishingAnalysis } from './hooks/useFishingAnalysis';
import { useFishingFeedback } from './hooks/useFishingFeedback';
import type { FishingIndexData } from './types';

export default function FishingMap() {
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

  // —— 新增：地图全屏 / 指数详情 sheet 状态 ——
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

  // —— Quick feedback banner 可见性：没有路线规划时显示 ——
  const showFeedbackBanner = !isPlanningRoute && !routeInfo;

  // —— feedback 表单数据切到 hook 注入（不再在 view 拼装） ——
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

  return (
    <AnalysisContextProvider analysisHasData={analysis.hasData}>
      <div className="bg-card/95">
        <FishingDashboardHeader
          analysisOpen={analysis.open}
          analysisHasData={analysis.hasData}
          onToggleAnalysis={analysis.toggle}
        />

        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-xl space-y-3 px-4 pt-3"
        >
          <FishingMapTile onFullscreen={() => setMapFullscreen(true)} />

          <QuickFeedbackBanner
            visible={showFeedbackBanner}
            disabled={!indexData}
            onSubmit={handleQuickFeedback}
          />

          <FishingIndexCard
            location={userPosition ?? MAP_CENTER}
            onFeedbackClick={handleFeedbackClick}
            onDetailClick={handleDetailClick}
          />
          <WeatherCard location={userPosition ?? MAP_CENTER} />
          <TideCard />
          <HourlyWeather />

          <p className="text-muted-foreground/70 font-family-averia pt-2 text-center text-sm italic">
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
