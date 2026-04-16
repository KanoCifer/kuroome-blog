import { useNotificationStore } from '@/stores/notificationState';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { motion } from 'framer-motion';
import { AIAnalysisWidget } from './components/AIAnalysisWidget';
import { FishingMapHeader } from './components/FishingMapHeader';
import { MapPanel } from './components/MapPanel';
import { RouteStatusCard } from './components/RouteStatusCard';
import { TideCard } from './components/TideCard';
import { WeatherCard } from './components/WeatherCard';
import {
  AMAP_SCRIPT_ID,
  MAP_CENTER,
  MAP_PLUGIN_LIST,
  MAP_ZOOM,
  fishingSpots,
} from './constants';
import { fishingMapService } from './service';
import type {
  AMapDriving,
  AMapDrivingResult,
  AMapMapInstance,
  AMapMarkerInstance,
  AMapNamespace,
  AMapPolyline,
  AMapSecurityConfig,
  AnalysisPayload,
  ForecastDay,
  GeolocationResult,
  LiveWeather,
  RouteInfo,
} from './types';

declare global {
  interface Window {
    _AMapSecurityConfig?: AMapSecurityConfig;
    AMap?: AMapNamespace;
  }
}

async function loadAMapScript(key: string): Promise<AMapNamespace> {
  if (window.AMap) {
    return window.AMap;
  }

  const script = document.getElementById(
    AMAP_SCRIPT_ID,
  ) as HTMLScriptElement | null;
  if (script) {
    await new Promise<void>((resolve, reject) => {
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener(
        'error',
        () => reject(new Error('高德地图脚本加载失败')),
        { once: true },
      );
    });

    if (!window.AMap) {
      throw new Error('高德地图脚本已加载但 AMap 不可用');
    }
    return window.AMap;
  }

  const scriptElement = document.createElement('script');
  scriptElement.id = AMAP_SCRIPT_ID;
  scriptElement.async = true;
  scriptElement.defer = true;
  scriptElement.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=${encodeURIComponent(MAP_PLUGIN_LIST.join(','))}`;

  await new Promise<void>((resolve, reject) => {
    scriptElement.onload = () => resolve();
    scriptElement.onerror = () => reject(new Error('高德地图脚本加载失败'));
    document.head.appendChild(scriptElement);
  });

  if (!window.AMap) {
    throw new Error('高德地图脚本初始化失败');
  }

  return window.AMap;
}

export default function FishingMap() {
  const notifyError = useNotificationStore((state) => state.error);
  const notifyErrorRef = useRef(notifyError);

  const service = useMemo(() => fishingMapService(), []);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<AMapMapInstance | null>(null);
  const markerInstancesRef = useRef<AMapMarkerInstance[]>([]);
  const drivingRef = useRef<AMapDriving | null>(null);
  const currentRouteRef = useRef<AMapPolyline | null>(null);
  const handleMarkerClickRef = useRef<(index: number) => Promise<void>>(
    async () => undefined,
  );
  const autoAnalysisAttemptRef = useRef('');
  const analysisAbortRef = useRef<AbortController | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [isPlanningRoute, setIsPlanningRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [selectedSpotIndex, setSelectedSpotIndex] = useState<number | null>(
    null,
  );

  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');

  const [liveWeather, setLiveWeather] = useState<LiveWeather | null>(null);
  const [forecasts, setForecasts] = useState<ForecastDay[]>([]);
  const [locationName, setLocationName] = useState('');

  const analysisPayload = useMemo<AnalysisPayload | null>(() => {
    if (!liveWeather && forecasts.length === 0) {
      return null;
    }

    return {
      liveWeather,
      forecasts,
      tideData: null,
      locationName: locationName || liveWeather?.city || '钓鱼地点',
      tideSpotName: '',
    };
  }, [forecasts, liveWeather, locationName]);

  const analysisHasData = useMemo(() => {
    return Boolean(liveWeather) || forecasts.length > 0;
  }, [forecasts.length, liveWeather]);

  const clearRoute = useCallback(() => {
    if (currentRouteRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.remove(currentRouteRef.current);
      currentRouteRef.current = null;
    }
    setRouteInfo(null);
    setSelectedSpotIndex(null);
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<
    [number, number]
  > => {
    if (!window.AMap || !mapInstanceRef.current) {
      throw new Error('地图未初始化');
    }

    return await new Promise<[number, number]>((resolve, reject) => {
      const geolocation = new window.AMap!.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      geolocation.getCurrentPosition((status: string, result: unknown) => {
        if (status === 'complete') {
          const position = (result as GeolocationResult).position;
          if (!position) {
            reject(new Error('未获取到定位结果'));
            return;
          }
          resolve([position.lng, position.lat]);
          return;
        }

        const message =
          (result as GeolocationResult)?.info || '定位失败，请检查定位权限';
        reject(new Error(message));
      });
    });
  }, []);

  const planRoute = useCallback(
    async (start: [number, number], end: [number, number]) => {
      if (!window.AMap || !mapInstanceRef.current) {
        throw new Error('地图未初始化');
      }

      if (!drivingRef.current) {
        drivingRef.current = new window.AMap.Driving({
          map: mapInstanceRef.current,
          showTraffic: true,
        });
      }

      clearRoute();

      return await new Promise<RouteInfo>((resolve, reject) => {
        drivingRef.current?.search(
          start,
          end,
          (status: string, result: AMapDrivingResult | string) => {
            if (
              status !== 'complete' ||
              typeof result === 'string' ||
              !result.routes.length
            ) {
              reject(new Error('未找到可用路线'));
              return;
            }

            const route = result.routes[0];
            const path: [number, number][] = [];
            route.steps.forEach((step) => {
              path.push(...step.path);
            });

            const polyline = new window.AMap!.Polyline({
              path,
              strokeColor: '#1890ff',
              strokeWeight: 6,
              strokeOpacity: 0.9,
              lineJoin: 'round',
              lineCap: 'round',
            });

            mapInstanceRef.current!.add(polyline);
            mapInstanceRef.current!.setFitView();
            currentRouteRef.current = polyline;

            resolve({
              distance: route.distance,
              time: route.time,
            });
          },
        );
      });
    },
    [clearRoute],
  );

  const handleMarkerClick = useCallback(
    async (index: number) => {
      const selectedSpot = fishingSpots[index];
      if (!selectedSpot) {
        notifyErrorRef.current('钓点不存在');
        return;
      }

      setSelectedSpotIndex(index);
      setIsPlanningRoute(true);

      try {
        const userPosition = await getCurrentPosition();
        const route = await planRoute(userPosition, selectedSpot.position);
        setRouteInfo(route);
      } catch (error) {
        const message = error instanceof Error ? error.message : '路线规划失败';
        notifyErrorRef.current(`路线规划失败：${message}`);
      } finally {
        setIsPlanningRoute(false);
      }
    },
    [getCurrentPosition, planRoute],
  );

  const handleWeatherUpdate = useCallback(
    (payload: {
      liveWeather: LiveWeather | null;
      forecasts: ForecastDay[];
      locationName: string;
    }) => {
      setLiveWeather(payload.liveWeather);
      setForecasts(payload.forecasts);
      setLocationName(payload.locationName);
    },
    [],
  );

  const generateAnalysis = useCallback(async () => {
    if (!analysisPayload || analysisLoading) {
      return;
    }

    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;
    setAnalysisLoading(true);
    setAnalysisError('');
    setAnalysisResult('');

    try {
      await service.generateAnalysis(
        analysisPayload,
        (content) => {
          setAnalysisResult((prev) => prev + content);
        },
        controller.signal,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      const message = error instanceof Error ? error.message : 'AI 分析失败';
      setAnalysisError(message);
      notifyErrorRef.current(message);
    } finally {
      if (analysisAbortRef.current === controller) {
        analysisAbortRef.current = null;
      }
      setAnalysisLoading(false);
    }
  }, [analysisLoading, analysisPayload, service]);

  useEffect(() => {
    return () => {
      analysisAbortRef.current?.abort();
      analysisAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    notifyErrorRef.current = notifyError;
  }, [notifyError]);

  useEffect(() => {
    handleMarkerClickRef.current = handleMarkerClick;
  }, [handleMarkerClick]);

  useEffect(() => {
    let unmounted = false;
    let clickHandler: ((event: unknown) => void) | null = null;
    const containerElement = mapContainerRef.current;

    const initializeMap = async () => {
      if (!containerElement || unmounted) {
        return;
      }

      try {
        const securityJsCode = await service.getSecurityJsCode();
        window._AMapSecurityConfig = {
          securityJsCode,
        };

        const mapApiKey = import.meta.env.VITE_JS_API;
        if (!mapApiKey) {
          throw new Error('缺少 VITE_JS_API 配置');
        }

        const AMap = await loadAMapScript(mapApiKey);
        if (!containerElement || unmounted) {
          return;
        }

        const map = new AMap.Map(containerElement, {
          viewMode: '2D',
          zoom: MAP_ZOOM,
          center: MAP_CENTER,
        });

        mapInstanceRef.current = map;

        map.addControl(new AMap.ToolBar({ position: 'RT' }));
        map.addControl(new AMap.Scale());
        map.addControl(
          new AMap.Geolocation({
            enableHighAccuracy: true,
            timeout: 10000,
            buttonPosition: 'RB',
            buttonOffset: new AMap.Pixel(10, 18),
          }),
        );

        const mapDriving = new AMap.Driving({
          map,
          showTraffic: true,
        });
        drivingRef.current = mapDriving;

        markerInstancesRef.current = fishingSpots.map((markerData, index) => {
          const marker = new AMap.Marker({
            position: markerData.position,
            content:
              '<div style="width:18px;height:18px;border-radius:9999px;background:linear-gradient(135deg,#0ea5e9,#1d4ed8);box-shadow:0 4px 14px rgba(30,64,175,.45);border:2px solid rgba(255,255,255,.95);"></div>',
            offset: new AMap.Pixel(-9, -9),
          });

          marker.on('click', () => {
            void handleMarkerClickRef.current(index);
          });

          marker.setMap(map);
          return marker;
        });

        clickHandler = () => undefined;
        map.on('click', clickHandler);

        setIsMapReady(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '地图初始化失败';
        notifyErrorRef.current(message);
      }
    };

    void initializeMap();

    return () => {
      unmounted = true;

      markerInstancesRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      markerInstancesRef.current = [];

      drivingRef.current?.clear();
      drivingRef.current = null;

      currentRouteRef.current = null;

      if (mapInstanceRef.current && clickHandler) {
        mapInstanceRef.current.off('click', clickHandler);
      }

      mapInstanceRef.current?.destroy();
      mapInstanceRef.current = null;

      if (containerElement) {
        containerElement.innerHTML = '';
      }
    };
  }, [service]);

  useEffect(() => {
    if (!analysisOpen) {
      autoAnalysisAttemptRef.current = '';
    }
  }, [analysisOpen]);

  useEffect(() => {
    if (
      analysisOpen &&
      analysisHasData &&
      !analysisResult &&
      !analysisLoading &&
      !analysisError
    ) {
      const fingerprint = JSON.stringify(analysisPayload);
      if (autoAnalysisAttemptRef.current === fingerprint) {
        return;
      }
      autoAnalysisAttemptRef.current = fingerprint;
      void generateAnalysis();
    }
  }, [
    analysisError,
    analysisHasData,
    analysisLoading,
    analysisOpen,
    analysisPayload,
    analysisResult,
    generateAnalysis,
  ]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-50/90 dark:bg-gray-900/90"></div>

      {/* Header */}
      <FishingMapHeader />

      {/* 主内容区域 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto mb-24 min-h-dvh w-full max-w-xl px-4 pt-4"
      >
        <section className="space-y-4">
          <RouteStatusCard
            isPlanningRoute={isPlanningRoute}
            routeInfo={routeInfo}
            selectedSpotIndex={selectedSpotIndex}
            onClearRoute={clearRoute}
          />

          <MapPanel isMapReady={isMapReady} mapContainerRef={mapContainerRef} />

          <div className="grid grid-cols-1 gap-4">
            <WeatherCard
              location={MAP_CENTER}
              onWeatherUpdate={handleWeatherUpdate}
            />
            <TideCard />
          </div>
        </section>

        <AIAnalysisWidget
          analysisOpen={analysisOpen}
          analysisLoading={analysisLoading}
          analysisError={analysisError}
          analysisResult={analysisResult}
          analysisHasData={analysisHasData}
          onToggle={() => setAnalysisOpen((prev) => !prev)}
          onClose={() => setAnalysisOpen(false)}
          onGenerate={() => {
            void generateAnalysis();
          }}
        />
      </motion.div>
    </>
  );
}
