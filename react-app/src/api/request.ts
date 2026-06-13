import axios, { AxiosError } from 'axios';
import { isrefreshTokenRequest, refreshAccessToken } from './refresh';
import { tokenService } from '../auth/tokenService';

export interface ApiResponse<T = unknown> {
  message: string;
  data: T;
  code?: number;
  errors?: Record<string, unknown>;
}

// 辅助方法
export const extractData = (res: { data: ApiResponse<unknown> }): unknown => {
  return res.data.data;
};

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000,
  withCredentials: true,
});

// 动态注入 Authorization header
request.interceptors.request.use((config) => {
  const token = tokenService.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 添加401自动刷新token拦截器
request.interceptors.response.use(
  (response) => response,

  async (error: AxiosError<ApiResponse>) => {
    const cfg = error.config;
    if (!cfg) {
      return Promise.reject(error);
    }
    const _cfg = cfg as typeof cfg & {
      _isRefreshToken?: boolean;
      _retry?: boolean;
    };
    if (
      error.response?.status === 401 &&
      !isrefreshTokenRequest(_cfg) &&
      !_cfg._retry
    ) {
      // 标记已重试，防止无限循环
      _cfg._retry = true;

      try {
        await refreshAccessToken();
        return request(_cfg);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default request;
