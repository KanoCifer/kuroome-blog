import dayjs from 'dayjs';
import {
  CloudSun,
  Droplets,
  Eye,
  Gauge,
  MapPin,
  Navigation,
  Thermometer,
} from 'lucide-react';
import { useWeatherData } from '../hooks/useWeatherData';
import { SkeletonCard } from './SkeletonCard';

interface WeatherCardProps {
  location?: [number, number];
}

// 气压等级映射
const getPressureLevel = (
  pressure: number,
): { label: string; color: string } => {
  if (pressure < 1000)
    return { label: '偏低', color: 'text-blue-500 dark:text-blue-400' };
  if (pressure < 1010)
    return { label: '正常', color: 'text-green-500 dark:text-green-400' };
  if (pressure < 1020)
    return { label: '正常', color: 'text-green-500 dark:text-green-400' };
  if (pressure < 1030)
    return { label: '偏高', color: 'text-amber-500 dark:text-amber-400' };
  return { label: '很高', color: 'text-red-500 dark:text-red-400' };
};

const getLiveWeatherBg = (temp: number) => {
  if (temp <= 0) return 'from-blue-500/40 to-blue-600/20';
  if (temp <= 15) return 'from-cyan-500/40 to-blue-600/20';
  if (temp <= 25) return 'from-green-500/40 to-blue-600/20';
  if (temp <= 35) return 'from-yellow-500/40 to-red-600/20';
  return 'from-red-500/40 to-red-600/20';
};

export function WeatherCard({
  location = [113.389549, 23.050067],
}: WeatherCardProps) {
  const { liveWeather, forecasts, locationName, loading, error } =
    useWeatherData(location);

  const openQWeather = () => {
    window.open('https://www.qweather.com/', '_blank');
  };

  const pressureLevel = liveWeather
    ? getPressureLevel(Number(liveWeather.pressure))
    : null;

  return (
    <article
      onClick={openQWeather}
      className="cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-gray-400 dark:text-gray-500" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {locationName || '钓鱼地点'}
          </span>
        </div>
        {liveWeather ? (
          <div
            className={`flex items-center gap-1.5 rounded-xl bg-linear-to-r ${getLiveWeatherBg(Number(liveWeather.temp))} px-3 py-1.5`}
          >
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {liveWeather.temp}°
            </span>
            <div className="flex items-center gap-1 rounded-lg px-2 py-1">
              <i className={`qi-${liveWeather.icon} text-xl`} />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {liveWeather.text}
              </span>
            </div>
          </div>
        ) : (
          <CloudSun className="h-5 w-5 text-yellow-500" />
        )}
      </div>

      {loading ? (
        <SkeletonCard hasBottomRow />
      ) : error ? (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      ) : liveWeather ? (
        <div>
          {/* 主数据行 */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            {/* 体感温度 */}
            <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-2.5 dark:bg-gray-800/80">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20">
                <Thermometer className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  体感温度
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {liveWeather.feelsLike}°C
                </p>
              </div>
            </div>

            {/* 能见度 */}
            <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-2.5 dark:bg-gray-800/80">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20">
                <Eye className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  能见度
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {liveWeather.vis} km
                </p>
              </div>
            </div>
          </div>

          {/* 气象指标条 */}
          <div className="mb-3 flex gap-1.5 overflow-hidden rounded-xl bg-gray-100 p-2 dark:bg-gray-800/60">
            <div className="flex flex-1 flex-col items-center">
              <Navigation
                className="h-4 w-4"
                style={{
                  transform: `rotate(${Number(liveWeather.wind360)}deg)`,
                }}
              />
              <span className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                {liveWeather.windDir}
              </span>
              <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                {(Number(liveWeather.windSpeed) / 3.6).toFixed(1)}m/s
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center border-x border-gray-200 dark:border-gray-700">
              <Droplets className="h-4 w-4" />
              <span className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                湿度
              </span>
              <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                {liveWeather.humidity}%
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center border-r border-gray-200 dark:border-gray-700">
              <Gauge className="h-4 w-4" />
              <span className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                气压
              </span>
              <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                {liveWeather.pressure}
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center">
              <div className="flex h-4 w-4 items-center justify-center">
                <div
                  className={`h-2 w-2 rounded-full ${
                    pressureLevel?.color.includes('blue-500')
                      ? 'bg-blue-500'
                      : pressureLevel?.color.includes('green-500')
                        ? 'bg-green-500'
                        : pressureLevel?.color.includes('amber-500')
                          ? 'bg-amber-500'
                          : pressureLevel?.color.includes('red-500')
                            ? 'bg-red-500'
                            : 'bg-gray-400'
                  }`}
                />
              </div>
              <span className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                状态
              </span>
              <span
                className={`text-[11px] font-bold ${pressureLevel?.color || 'text-gray-400'}`}
              >
                {pressureLevel?.label || '--'}
              </span>
            </div>
          </div>

          {/* 预报 */}
          {!!forecasts.length && (
            <div className="flex gap-1.5">
              {forecasts.slice(0, 3).map((day, i) => (
                <div
                  key={day.fxDate}
                  className="flex-1 rounded-xl bg-gray-100 p-2 dark:bg-gray-800/60"
                >
                  <p className="text-center text-[10px] text-gray-500 dark:text-gray-400">
                    {i === 0 ? '今天' : dayjs(day.fxDate).format('MM/DD')}
                  </p>
                  <div className="mt-1 flex justify-center">
                    <i className={`qi-${day.iconDay} text-2xl`} />
                  </div>
                  <p className="text-center text-[11px] font-bold text-gray-900 dark:text-white">
                    {day.tempMax}°/{day.tempMin}°
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500">暂无天气数据</p>
      )}
    </article>
  );
}
