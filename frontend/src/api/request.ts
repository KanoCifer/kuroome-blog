import axios, { AxiosError } from 'axios';
import { isrefreshTokenRequest, refreshAccessToken } from '@/auth/api/refresh';
import { getAccessToken } from '@/auth/tokenService';

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message: string;
  data: T;
  code?: number;
  errors?: Record<string, unknown>;
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 动态注入 Authorization header
request.interceptors.request.use((config) => {
  const token = getAccessToken();
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

// 友好错误消息转换 — 在所有其他拦截器之后注册（错误链中优先执行），
// 优先取后端返回的 message，无后端响应时按状态码映射友好文案
request.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    } else if (error.code === 'ERR_NETWORK') {
      error.message = '网络连接失败，请检查网络设置';
    } else {
      const status = error.response?.status;
      if (status === 429) {
        error.message = '请求过于频繁，请稍后再试';
      } else if (status === 502 || status === 503) {
        error.message = '服务暂时不可用，请稍后重试';
      } else if (status === 422) {
        error.message = '请求参数错误，请检查后重试';
      } else if (status === 500) {
        error.message = '服务器内部错误，请稍后重试';
      } else if (status && status >= 400) {
        error.message = `请求出错 (${status})，请稍后重试`;
      }
    }
    return Promise.reject(error);
  },
);

export default request;
