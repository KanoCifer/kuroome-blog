import request from '@/api/request';

export interface SocialGateway {
  getLikes(): Promise<{ likes_count: number }>;
  likeOnce(payload: { likes_count: number }): Promise<void>;
}

export const socialGateway: SocialGateway = {
  async getLikes(): Promise<{ likes_count: number }> {
    const res = await request.get<{ data: { likes_count: number } }>(
      'v1/likes',
    );
    // console.log(res);
    return res.data.data;
  },

  async likeOnce(payload: { likes_count: number }): Promise<void> {
    await request.post('v1/like', payload);
  },
};
