import type { TideResponse } from "@/api/weatherGateway";
import { weatherGateway } from "@/api/weatherGateway";
import type {
  TideData,
  WeatherDay,
  WeatherFullResponse,
  WeatherHourly,
  WeatherIndex,
  WeatherNow,
} from "@/views/general/fishing/types";

export interface WeatherFullResult {
  updateTime?: string;
  now?: WeatherNow;
  daily?: WeatherDay[];
  hourly?: WeatherHourly[];
  locationName: string;
  indices: WeatherIndex[];
  tideData: TideData | null;
  fullWeatherData: WeatherFullResponse;
}

export interface WeatherService {
  getTide(payload: { harbor: string; date: string }): Promise<TideResponse>;
  fetchWeatherFull(payload: {
    location: [number, number];
  }): Promise<WeatherFullResult>;
}

const resolveLocationName = (
  fullData: WeatherFullResponse | undefined,
  now: WeatherNow | undefined,
): string => {
  // TODO(human): 可继续优化位置名兜底优先级（例如接入更多后端字段）。
  const directName = fullData?.locationName?.trim();
  const hourlyName = (
    fullData?.hourly as { locationName?: string } | undefined
  )?.locationName?.trim();

  if (directName) return directName;
  if (hourlyName) return hourlyName;
  return now?.text ? "当前位置" : "钓鱼地点";
};

export const weatherService: WeatherService = {
  async getTide(payload: {
    harbor: string;
    date: string;
  }): Promise<TideResponse> {
    return weatherGateway.getTide(payload);
  },

  async fetchWeatherFull(payload: {
    location: [number, number];
  }): Promise<WeatherFullResult> {
    const data = await weatherGateway.getWeatherFull(payload);
    const now = data.current?.now;
    const daily = data.daily?.daily;
    // hourly 是 QWeather HourlyWeather 对象，需要取其中的 hourly 数组
    const hourlyWrapper = data.hourly as
      | { hourly?: WeatherHourly[] }
      | undefined;
    const hourly = hourlyWrapper?.hourly ?? [];
    const updateTime = data.current?.updateTime ?? data.daily?.updateTime;
    const locationName = resolveLocationName(data, now);
    const indices = data.indices?.daily ?? [];
    const tideData = data.tide ?? null;

    return {
      updateTime,
      now,
      daily,
      hourly,
      locationName,
      indices,
      tideData,
      fullWeatherData: data,
    };
  },
};
