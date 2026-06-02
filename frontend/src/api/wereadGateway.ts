import request, { type ApiResponse } from '@/api/request';

export interface WereadUserInfo {
  user_id: number;
  api_key: string;
}

export interface WereadGateway {
  /** 保存微信读书 API Key（v2 端点，api_key 作为 query 参数） */
  saveUserInfo(apiKey: string): Promise<ApiResponse<WereadUserInfo | null>>;
}

export const wereadGateway: WereadGateway = {
  async saveUserInfo(
    apiKey: string,
  ): Promise<ApiResponse<WereadUserInfo | null>> {
    const res = await request.post<ApiResponse<WereadUserInfo | null>>(
      'v2/weread/user-info',
      { api_key: apiKey },
    );
    return res.data;
  },
};
