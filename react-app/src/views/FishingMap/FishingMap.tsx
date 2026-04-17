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
          const content = `<div><svg t="1774099170648" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5285" width="36" height="36"><path d="M188.64 913.44a365.416 90.56 0 1 0 730.832 0 365.416 90.56 0 1 0-730.832 0Z" fill="#B8CBCD" p-id="5286"></path><path d="M846.496 376.472c0 176.328-319.28 517.224-319.28 517.224S207.944 551.808 207.944 375.472c0-176.32 142.944-318.272 319.272-318.272s319.28 142.944 319.28 319.272z" fill="#F7BB83" p-id="5287"></path><path d="M527.216 917.696H527.2a24.016 24.016 0 0 1-17.52-7.616c-13.304-14.24-325.736-350.92-325.736-534.608 0-188.728 153.992-342.272 343.272-342.272 189.288 0 343.28 153.992 343.28 343.272 0 183.704-312.464 519.432-325.768 533.632a24 24 0 0 1-17.512 7.592z m0-836.504c-162.816 0-295.272 132.008-295.272 294.272 0 128.448 198.808 375.648 295.208 482.632 65.864-73.488 295.344-339.736 295.344-481.632 0-162.808-132.464-295.272-295.28-295.272z" fill="#6E4123" p-id="5288"></path><path d="M830.296 432.576c0 167.384-303.08 490.976-303.08 490.976S224.144 599.96 224.144 432.576c0-167.376 135.688-303.072 303.072-303.072 167.384 0 303.08 135.696 303.08 303.072z" fill="#F7BB83" p-id="5289"></path><path d="M527.216 939.552a16 16 0 0 1-11.68-5.064c-12.544-13.4-307.392-330.176-307.392-501.912 0-175.936 143.136-319.072 319.072-319.072s319.08 143.136 319.08 319.072c0 171.736-294.848 488.512-307.4 501.912a16 16 0 0 1-11.68 5.064z m0-794.048c-158.288 0-287.072 128.784-287.072 287.072 0 140.912 231.84 406.104 287.072 467.256 55.224-61.16 287.08-326.344 287.08-467.256 0-158.288-128.784-287.072-287.08-287.072z" fill="#6E4123" p-id="5290"></path><path d="M836.984 432.576c0 167.384-309.768 490.976-309.768 490.976S217.072 599.96 217.072 432.576" fill="#F7BB83" p-id="5291"></path><path d="M527.216 947.552c-6.536 0-12.8-2.672-17.328-7.392-12.936-13.504-316.816-332.568-316.816-507.584a24 24 0 1 1 48 0c0 121.232 192.504 354.624 286.136 455.92 93.512-101.312 285.776-334.688 285.776-455.92a24 24 0 1 1 48 0c0 175.008-303.512 494.08-316.432 507.568a24 24 0 0 1-17.336 7.408z" fill="#6E4123" p-id="5292"></path><path d="M528.64 432m-196 0a196 196 0 1 0 392 0 196 196 0 1 0-392 0Z" fill="#FFFFFF" p-id="5293"></path><path d="M528.344 642.12c-118.488 0-214.896-93.032-214.896-207.384 0-56.808 23.336-109.808 65.696-149.248a16.008 16.008 0 0 1 21.816 23.424c-35.8 33.32-55.504 78.008-55.504 125.832 0 96.704 82.048 175.384 182.896 175.384 100.848 0 182.896-78.68 182.896-175.384 0-49.736-22.152-97.32-60.792-130.568a16 16 0 1 1 20.872-24.248c45.704 39.328 71.912 95.76 71.912 154.824 0 114.336-96.408 207.368-214.896 207.368z" fill="#6E4123" p-id="5294"></path><path d="M528.344 570.88c-105.344 0-192.096-76.488-203.624-174.88a194.112 194.112 0 0 0-1.336 22.328c0 108.912 91.768 197.208 204.96 197.208s204.968-88.296 204.968-197.208c0-7.552-0.488-15-1.352-22.328-11.528 98.4-98.272 174.88-203.616 174.88z" fill="#6E4123" p-id="5295"></path><path d="M548.64 476c0 13.2-10.8 24-24 24s-24-10.8-24-24v-96c0-13.2 10.8-24 24-24s24 10.8 24 24v96z" fill="#6E4123" p-id="5296"></path><path d="M476.64 452c-13.2 0-24-10.8-24-24s10.8-24 24-24h96c13.2 0 24 10.8 24 24s-10.8 24-24 24h-96z" fill="#6E4123" p-id="5297"></path></svg></div>`; // 可以根据需要自定义标记点内容

          const marker = new AMap.Marker({
            position: markerData.position,
            content: content,
            offset: new AMap.Pixel(-13, -30),
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
