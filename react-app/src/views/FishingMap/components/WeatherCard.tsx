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
  if (pressure < 1000) return { label: '偏低', color: 'text-primary' };
  if (pressure < 1010) return { label: '正常', color: 'text-success' };
  if (pressure < 1020) return { label: '正常', color: 'text-success' };
  if (pressure < 1030) return { label: '偏高', color: 'text-warning' };
  return { label: '很高', color: 'text-destructive' };
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
      className="cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {locationName || '钓鱼地点'}
          </span>
        </div>
        {liveWeather ? (
          <div
            className={`flex items-center gap-1.5 rounded-xl bg-linear-to-r ${getLiveWeatherBg(Number(liveWeather.temp))} px-3 py-1.5`}
          >
            <span className="text-lg font-bold text-foreground">
              {liveWeather.temp}°
            </span>
            <div className="flex items-center gap-1 rounded-lg px-2 py-1">
              <i className={`qi-${liveWeather.icon} text-xl`} />
              <span className="text-xs text-muted-foreground">
                {liveWeather.text}
              </span>
            </div>
          </div>
        ) : (
          <CloudSun className="h-5 w-5 text-warning" />
        )}
      </div>

      {loading ? (
        <SkeletonCard hasBottomRow />
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : liveWeather ? (
        <div>
          {/* 主数据行 */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            {/* 体感温度 */}
            <div className="flex items-center gap-2 rounded-xl bg-secondary p-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/20">
                <Thermometer className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  体感温度
                </p>
                <p className="text-sm font-bold text-foreground">
                  {liveWeather.feelsLike}°C
                </p>
              </div>
            </div>

            {/* 能见度 */}
            <div className="flex items-center gap-2 rounded-xl bg-secondary p-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/20">
                <Eye className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  能见度
                </p>
                <p className="text-sm font-bold text-foreground">
                  {liveWeather.vis} km
                </p>
              </div>
            </div>
          </div>

          {/* 气象指标条 */}
          <div className="mb-3 flex gap-1.5 overflow-hidden rounded-xl bg-secondary p-2">
            <div className="flex flex-1 flex-col items-center">
              <Navigation
                className="h-4 w-4"
                style={{
                  transform: `rotate(${Number(liveWeather.wind360)}deg)`,
                }}
              />
              <span className="mt-1 text-[10px] text-muted-foreground">
                {liveWeather.windDir}
              </span>
              <span className="text-[11px] font-bold text-foreground">
                {(Number(liveWeather.windSpeed) / 3.6).toFixed(1)}m/s
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center border-x border-border">
              <Droplets className="h-4 w-4" />
              <span className="mt-1 text-[10px] text-muted-foreground">
                湿度
              </span>
              <span className="text-[11px] font-bold text-foreground">
                {liveWeather.humidity}%
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center border-r border-border">
              <Gauge className="h-4 w-4" />
              <span className="mt-1 text-[10px] text-muted-foreground">
                气压
              </span>
              <span className="text-[11px] font-bold text-foreground">
                {liveWeather.pressure}
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center">
              <div className="flex h-4 w-4 items-center justify-center">
                <div
                  className={`h-2 w-2 rounded-full ${
                    pressureLevel?.color.includes('primary')
                      ? 'bg-primary'
                      : pressureLevel?.color.includes('success')
                        ? 'bg-success'
                        : pressureLevel?.color.includes('warning')
                          ? 'bg-warning'
                          : pressureLevel?.color.includes('destructive')
                            ? 'bg-destructive'
                            : 'bg-muted-foreground'
                  }`}
                />
              </div>
              <span className="mt-1 text-[10px] text-muted-foreground">
                状态
              </span>
              <span
                className={`text-[11px] font-bold ${pressureLevel?.color || 'text-muted-foreground'}`}
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
                  className="flex-1 rounded-xl bg-secondary p-2"
                >
                  <p className="text-center text-[10px] text-muted-foreground">
                    {i === 0 ? '今天' : dayjs(day.fxDate).format('MM/DD')}
                  </p>
                  <div className="mt-1 flex justify-center">
                    <i className={`qi-${day.iconDay} text-2xl`} />
                  </div>
                  <p className="text-center text-[11px] font-bold text-foreground">
                    {day.tempMax}°/{day.tempMin}°
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">暂无天气数据</p>
      )}
    </article>
  );
}
