import type { ApiResponse } from '@/api/request';
import { wereadGateway } from '@/api/wereadGateway';
import type { WereadUserInfo } from '@/api/wereadGateway';

export interface WereadService {
  /** 保存微信读书 API Key 到后端 */
  saveUserInfo(apiKey: string): Promise<ApiResponse<WereadUserInfo | null>>;
}

export const wereadService: WereadService = {
  async saveUserInfo(apiKey: string): Promise<ApiResponse<WereadUserInfo | null>> {
    return wereadGateway.saveUserInfo(apiKey);
  },
};
