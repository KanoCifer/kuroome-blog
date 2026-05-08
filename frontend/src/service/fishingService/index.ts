import { fishingGateway } from "@/api/fishingGateway";

import type {
  FishingFeedbackPayload,
  FishingFeedbackResponse,
  FishingIndexData,
} from "@/views/general/fishing/types";

export interface FishingService {
  fetchFishingIndex(payload: {
    location: [number, number];
  }): Promise<FishingIndexData>;
  submitFishingFeedback(
    payload: FishingFeedbackPayload,
  ): Promise<FishingFeedbackResponse>;
}

export const fishingService: FishingService = {
  async fetchFishingIndex(payload: {
    location: [number, number];
  }): Promise<FishingIndexData> {
    return fishingGateway.getFishingIndex(payload);
  },

  async submitFishingFeedback(
    payload: FishingFeedbackPayload,
  ): Promise<FishingFeedbackResponse> {
    return fishingGateway.postFishingFeedback(payload);
  },
};
