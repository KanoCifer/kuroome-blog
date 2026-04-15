import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNotificationStore } from '@/stores/notificationState';

import { fishingMapService } from '../service';
import type { ForecastDay, LiveWeather } from '../types';
import { weatherIcon } from '../utils';

interface WeatherCardProps {
  location?: [number, number];
  onWeatherUpdate?: (payload: {
    liveWeather: LiveWeather | null;
    forecasts: ForecastDay[];
    locationName: string;
  }) => void;
}

export function WeatherCard({
  location = [113.389549, 23.050067],
  onWeatherUpdate,
}: WeatherCardProps) {
  const notifyError = useNotificationStore((state) => state.error);
  const service = useMemo(() => fishingMapService(), []);

  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [liveWeather, setLiveWeather] = useState<LiveWeather | null>(null);
  const [forecasts, setForecasts] = useState<ForecastDay[]>([]);
  const [locationName, setLocationName] = useState('');

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError('');

    try {
      const weatherData = await service.fetchWeatherAndLocation(location);
      setLiveWeather(weatherData.liveWeather);
      setForecasts(weatherData.forecasts);
      setLocationName(weatherData.locationName);
      onWeatherUpdate?.({
        liveWeather: weatherData.liveWeather,
        forecasts: weatherData.forecasts,
        locationName: weatherData.locationName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取天气失败';
      setWeatherError(message);
      notifyError(message);
    } finally {
      setWeatherLoading(false);
    }
  }, [location, notifyError, onWeatherUpdate, service]);

  useEffect(() => {
    void fetchWeather();
  }, [fetchWeather]);

  // 打开和风天气
  const openQWeather = () => {
    window.open('https://www.qweather.com/', '_blank');
  };

  return (
    <article
      onClick={openQWeather}
      className="cursor-pointer rounded-2xl border border-white/40 bg-linear-to-br from-white/80 to-white/40 p-4 shadow-sm backdrop-blur-sm dark:border-gray-700/60 dark:from-gray-900/80 dark:to-gray-800/60"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            实时天气{' '}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              点击跳转和风天气，查看详细信息
            </span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {locationName || '钓鱼地点'}
          </p>
        </div>
        <span className="text-2xl">
          {liveWeather ? weatherIcon(liveWeather.weather) : '🌤️'}
        </span>
      </div>

      {weatherLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          获取天气数据中...
        </p>
      ) : weatherError ? (
        <p className="text-sm text-red-500">{weatherError}</p>
      ) : liveWeather ? (
        <>
          <div className="mb-3 flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              {liveWeather.temperature}
            </span>
            <span className="pb-1 text-sm text-gray-500 dark:text-gray-400">
              °C · {liveWeather.weather}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-white/60 px-2 py-2 text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              风向
              <div className="mt-1 font-medium">
                {liveWeather.winddirection}
              </div>
            </div>
            <div className="rounded-lg bg-white/60 px-2 py-2 text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              风力
              <div className="mt-1 font-medium">{liveWeather.windpower}级</div>
            </div>
            <div className="rounded-lg bg-white/60 px-2 py-2 text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              湿度
              <div className="mt-1 font-medium">{liveWeather.humidity}%</div>
            </div>
          </div>
          {!!forecasts.length && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {forecasts.slice(0, 2).map((day) => (
                <div
                  key={day.date}
                  className="rounded-lg bg-white/55 px-3 py-2 dark:bg-gray-800/50"
                >
                  <p className="text-gray-500 dark:text-gray-400">{day.date}</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                    {day.daytemp}° / {day.nighttemp}°
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {day.dayweather}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">暂无天气数据</p>
      )}
    </article>
  );
}
