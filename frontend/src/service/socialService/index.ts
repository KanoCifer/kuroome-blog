import { socialGateway } from "@/api/socialGateway";

export interface SocialService {
  getLikes(): Promise<{ likes_count: number }>;
  likeOnce(payload: { likes_count: number }): Promise<void>;
}

export const socialService: SocialService = {
  async getLikes() {
    return socialGateway.getLikes();
  },

  async likeOnce(payload) {
    await socialGateway.likeOnce(payload);
  },
};
