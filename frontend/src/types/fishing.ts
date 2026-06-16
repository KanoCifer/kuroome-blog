/**
 * 钓鱼指数 / 反馈相关类型。
 *
 * - FishingIndex*：后端 fishing_index 接口返回 (专家分 + 残差校准)
 * - FishingFeedback*：用户提交的体验反馈
 * - WeatherAnalysisPayload：喂给 <WeatherAnalysis> AI 分析的聚合 view-model
 */
import type { TideData, WeatherDay, WeatherNow } from '@/types/weather';

export type FishingLevel = '爆护' | '好' | '一般' | '差' | '空军';
export type FishingIndexLevel = FishingLevel | '极好';
export type FishingFeedbackLevel = FishingLevel;

export interface FishingIndexData {
  fishing_index: number;
  expert_score: number;
  residual: number;
  level: FishingIndexLevel;
  feature_breakdown: Record<string, number>;
}

export interface FishingFeedbackData {
  fishing_index: number;
  level: FishingIndexLevel;
  temperature: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  precipitation: number;
  indices: number;
  tide_level: number;
  tide_type?: '涨潮' | '退潮';
  tide_range: number;
  hours_to_next_tide: number;
}

export interface FishingFeedbackPayload {
  location_id: string;
  location_name: string;
  fishing_time: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  precipitation?: number;
  indices?: number;
  tide_level?: number;
  tide_type?: '涨潮' | '退潮';
  tide_range?: number;
  hours_to_next_tide?: number;
  feedback: FishingFeedbackLevel;
}

export interface FishingFeedbackResponse {
  success: boolean;
  record_id: string;
  expert_score: number;
  residual: number;
}

export interface FishingStats {
  total_records: number;
  latest_record_time: string | null;
}

/**
 * 喂给 <WeatherAnalysis> 组件的聚合数据。
 * 在 useFishingAnalysis 中拼装,在 AnalysisDrawer / WeatherAnalysis 中消费。
 * 字段都是 optional —— Live / forecast / tide 任一为空,WeatherAnalysis 内部按需处理。
 */
export interface WeatherAnalysisPayload {
  liveWeather?: WeatherNow | null;
  forecasts?: WeatherDay[];
  tideData?: TideData | null;
  weatherIndices?: Array<Record<string, unknown>>;
  fishingIndex?: FishingIndexData;
  locationName?: string;
  tideSpotName?: string;
}
