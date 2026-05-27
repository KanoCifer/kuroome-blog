import request from "@/api/request";

import type {
  FishingFeedbackPayload,
  FishingFeedbackResponse,
  FishingIndexData,
  FishingStats,
} from "@/views/fishing/types";

export interface FishingGateway {
  getFishingIndex(payload: {
    location: [number, number];
  }): Promise<FishingIndexData>;
  postFishingFeedback(
    payload: FishingFeedbackPayload,
  ): Promise<FishingFeedbackResponse>;
  getFishingStats(): Promise<FishingStats>;
}

export const fishingGateway: FishingGateway = {
  async getFishingIndex(payload: {
    location: [number, number];
  }): Promise<FishingIndexData> {
    const [lng, lat] = payload.location;
    const res = await request.get<{ data: FishingIndexData }>(
      "v2/fishing/index",
      {
        params: { location: `${lng.toFixed(2)},${lat.toFixed(2)}` },
      },
    );
    return res.data.data;
  },

  async postFishingFeedback(
    payload: FishingFeedbackPayload,
  ): Promise<FishingFeedbackResponse> {
    const res = await request.post<{ data: FishingFeedbackResponse }>(
      "v2/fishing/feedback",
      payload,
    );
    return res.data.data;
  },

  async getFishingStats(): Promise<FishingStats> {
    const res = await request.get<{ data: FishingStats }>("v2/fishing/stats");
    return res.data.data;
  },
};
