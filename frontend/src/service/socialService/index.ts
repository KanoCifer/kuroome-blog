import { socialGateway } from "@/api/socialGateway";

export interface SocialService {
  getLikes(): Promise<{ likescounts: number }>;
  likeOnce(payload: { likescounts: number }): Promise<void>;
}

export const socialService: SocialService = {
  async getLikes() {
    return socialGateway.getLikes();
  },

  async likeOnce(payload) {
    await socialGateway.likeOnce(payload);
  },
};
