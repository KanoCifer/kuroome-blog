import request from "@/api/request";

export interface SocialGateway {
  getLikes(): Promise<{ likescounts: number }>;
  likeOnce(payload: { likescounts: number }): Promise<void>;
}

export const socialGateway: SocialGateway = {
  async getLikes(): Promise<{ likescounts: number }> {
    const res = await request.get<{ data: { likescounts: number } }>("v1/likes");
    return res.data.data;
  },

  async likeOnce(payload: { likescounts: number }): Promise<void> {
    await request.post("v1/like", payload);
  },
};
