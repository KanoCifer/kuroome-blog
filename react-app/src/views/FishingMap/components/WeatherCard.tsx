import { CloudSun, Droplets, MapPin, Navigation, Wind } from 'lucide-react';
import { useWeatherData } from '../hooks/useWeatherData';
import { SkeletonCard } from './SkeletonCard';

interface WeatherCardProps {
  location?: [number, number];
}

export function WeatherCard({
  location = [113.389549, 23.050067],
}: WeatherCardProps) {
  const { liveWeather, forecasts, locationName, loading, error } =
    useWeatherData(location);

  // 打开和风天气
  const openQWeather = () => {
    window.open('https://www.qweather.com/', '_blank');
  };

  return (
    <article
      onClick={openQWeather}
      className="relative cursor-pointer rounded-2xl border border-white/40 bg-gray-50/80 p-4 shadow-sm backdrop-blur-sm dark:border-gray-700/60 dark:from-gray-900/80 dark:to-gray-800/60"
    >
      {/* 背景 */}
      <div className="shadow-[0_4px_18px_oklch(80.9% 0.105 251.813)] absolute top-10 right-0 overflow-hidden rounded-full bg-blue-200 p-12 blur-2xl"></div>

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            实时天气{' '}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              点击跳转和风天气，查看详细信息
            </span>
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="h-3 w-3" />
            {locationName || '钓鱼地点'}
          </p>
        </div>
        {liveWeather ? (
          <div className="flex items-center">
            <i className={`qi-${liveWeather.icon} text-4xl`} />
          </div>
        ) : (
          <CloudSun className="text-3xl text-yellow-500" />
        )}
      </div>

      {loading ? (
        <div className="min-h-[200px]">
          <SkeletonCard hasBottomRow />
        </div>
      ) : error ? (
        <div className="min-h-[200px]">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : liveWeather ? (
        <div className="min-h-[200px]">
          <div className="mb-3 flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              {liveWeather.temp}
            </span>
            <span className="pb-1 text-sm text-gray-500 dark:text-gray-400">
              °C · {liveWeather.text}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="flex flex-col items-center rounded-lg bg-white/60 px-2 py-2 text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              <Navigation className="h-4 w-4 text-blue-500" />
              <span className="mt-1 text-gray-500 dark:text-gray-400">
                风向
              </span>
              <div className="mt-0.5 font-medium">{liveWeather.windDir}</div>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-white/60 px-2 py-2 text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              <Wind className="h-4 w-4 text-green-500" />
              <span className="mt-1 text-gray-500 dark:text-gray-400">
                风力
              </span>
              <div className="mt-0.5 font-medium">
                {liveWeather.windScale}级
              </div>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-white/60 px-2 py-2 text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              <Droplets className="h-4 w-4 text-cyan-500" />
              <span className="mt-1 text-gray-500 dark:text-gray-400">
                湿度
              </span>
              <div className="mt-0.5 font-medium">{liveWeather.humidity}%</div>
            </div>
          </div>
          {!!forecasts.length && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {forecasts.slice(0, 2).map((day) => (
                <div
                  key={day.fxDate}
                  className="flex items-center gap-2 rounded-lg bg-white/55 px-3 py-2 dark:bg-gray-800/50"
                >
                  <i className={`qi-${day.iconDay} shrink-0 text-xl`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-500 dark:text-gray-400">
                      {day.fxDate}
                    </p>
                    <p className="truncate font-medium text-gray-900 dark:text-white">
                      {day.tempMax}° / {day.tempMin}°
                    </p>
                    <p className="truncate text-gray-500 dark:text-gray-400">
                      {day.textDay}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-[200px]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            暂无天气数据
          </p>
        </div>
      )}
    </article>
  );
}
