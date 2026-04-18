export type FishingIndexLevel = "爆护" | "极好" | "好" | "一般" | "差" | "空军";
export type FishingFeedbackLevel = "爆护" | "好" | "一般" | "差" | "空军";

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
  wind_level: number;
  tide_level: number;
  tide_type: "H" | "L";
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
  wind_level?: number;
  tide_level?: number;
  tide_type?: "H" | "L" | "涨潮" | "退潮";
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
