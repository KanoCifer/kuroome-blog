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
): { label: string; color: string; dot: string } => {
  if (pressure < 1000)
    return {
      label: '偏低',
      color: 'text-warning',
      dot: 'bg-warning',
    };
  if (pressure < 1010)
    return {
      label: '正常',
      color: 'text-success',
      dot: 'bg-success',
    };
  if (pressure < 1020)
    return {
      label: '正常',
      color: 'text-success',
      dot: 'bg-success',
    };
  if (pressure < 1030)
    return {
      label: '偏高',
      color: 'text-warning',
      dot: 'bg-warning',
    };
  return {
    label: '很高',
    color: 'text-destructive',
    dot: 'bg-destructive',
  };
};

// 头部温度 chip 的渐变 — 暖色基调，不随温度分色，保持视觉一致
const TEMP_CHIP_GRADIENT = 'from-warning/40 via-warning/30 to-destructive/30';

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
      className="border-border bg-card cursor-pointer overflow-hidden rounded-2xl border p-3 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground text-xs font-medium">
            {locationName || '钓鱼地点'}
          </span>
        </div>
        {liveWeather ? (
          <div
            className={`flex items-center gap-1.5 rounded-xl bg-linear-to-r ${TEMP_CHIP_GRADIENT} px-3 py-1.5`}
          >
            <span className="text-foreground text-lg font-bold tabular-nums">
              {liveWeather.temp}°
            </span>
            <div className="bg-card/30 flex items-center gap-1 rounded-lg px-1.5 py-1 backdrop-blur-sm">
              <i className={`qi-${liveWeather.icon} text-base`} />
              <span className="text-foreground/80 text-xs">
                {liveWeather.text}
              </span>
            </div>
          </div>
        ) : (
          <CloudSun className="text-warning h-5 w-5" />
        )}
      </div>

      {loading ? (
        <SkeletonCard hasBottomRow />
      ) : error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : liveWeather ? (
        <div>
          {/* 主数据行 — 2x3 网格 */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            {/* 体感温度 */}
            <div className="border-border/40 bg-secondary/60 flex items-center gap-2 rounded-xl border p-2.5">
              <div className="bg-warning/20 flex h-10 w-10 items-center justify-center rounded-lg">
                <Thermometer className="text-warning h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px]">体感温度</p>
                <p className="text-foreground text-sm font-bold tabular-nums">
                  {liveWeather.feelsLike}°C
                </p>
              </div>
            </div>

            {/* 能见度 */}
            <div className="border-border/40 bg-secondary/60 flex items-center gap-2 rounded-xl border p-2.5">
              <div className="bg-success/20 flex h-10 w-10 items-center justify-center rounded-lg">
                <Eye className="text-success h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px]">能见度</p>
                <p className="text-foreground text-sm font-bold tabular-nums">
                  {liveWeather.vis} km
                </p>
              </div>
            </div>

            {/* 风力 */}
            <div className="border-border/40 bg-secondary/60 flex items-center gap-2 rounded-xl border p-2.5">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                <Navigation
                  className="text-muted-foreground h-4 w-4"
                  style={{
                    transform: `rotate(${Number(liveWeather.wind360)}deg)`,
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px]">
                  {liveWeather.windDir}
                </p>
                <p className="text-foreground text-sm font-bold tabular-nums">
                  {(Number(liveWeather.windSpeed) / 3.6).toFixed(1)}m/s
                </p>
              </div>
            </div>

            {/* 湿度 */}
            <div className="border-border/40 bg-secondary/60 flex items-center gap-2 rounded-xl border p-2.5">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                <Droplets className="text-muted-foreground h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px]">湿度</p>
                <p className="text-foreground text-sm font-bold tabular-nums">
                  {liveWeather.humidity}%
                </p>
              </div>
            </div>

            {/* 气压 */}
            <div className="border-border/40 bg-secondary/60 flex items-center gap-2 rounded-xl border p-2.5">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                <Gauge className="text-muted-foreground h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px]">气压</p>
                <p className="text-foreground text-sm font-bold tabular-nums">
                  {liveWeather.pressure} hPa
                </p>
              </div>
            </div>

            {/* 状态 */}
            <div className="border-border/40 bg-secondary/60 flex items-center gap-2 rounded-xl border p-2.5">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${pressureLevel?.dot ?? 'bg-muted-foreground'}`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px]">状态</p>
                <p
                  className={`text-sm font-bold ${pressureLevel?.color ?? 'text-muted-foreground'}`}
                >
                  {pressureLevel?.label ?? '--'}
                </p>
              </div>
            </div>
          </div>

          {/* 预报 — 3 个固定 chip：今天 / 明天 / 后天 */}
          {!!forecasts.length && (
            <div className="grid grid-cols-3 gap-2">
              {forecasts.slice(0, 3).map((day, i) => (
                <div
                  key={day.fxDate}
                  className="border-border/40 bg-secondary/60 flex h-[88px] flex-col items-center justify-between rounded-xl border py-2"
                >
                  <p className="text-muted-foreground text-center text-[10px] font-medium">
                    {i === 0 ? '今天' : dayjs(day.fxDate).format('MM/DD')}
                  </p>
                  <i className={`qi-${day.iconDay} text-2xl`} />
                  <p className="text-foreground text-center text-[11px] font-bold tabular-nums">
                    {day.tempMax}°/{day.tempMin}°
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">暂无天气数据</p>
      )}
    </article>
  );
}
