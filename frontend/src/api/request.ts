import axios, { AxiosError } from "axios";
import { fetchAndStoreCSRF } from "./csrf";
import { isrefreshTokenRequest, refreshAccessToken } from "./refresh";
import { getRefreshTokenFromStorage } from "./refreshToken";
// keep latest CSRF token so it can be sent in headers

export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  message: string;
  data: T;
  code?: number;
  errors?: Record<string, unknown>;
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api/v1/",
  timeout: 10000,
  withCredentials: true,
});

request.interceptors.response.use(
  (response) => response,

  async (error: AxiosError<ApiResponse>) => {
    const config = error.config;
    const errorMessage = error.response?.data?.message;
    if (errorMessage && errorMessage.includes("CSRF") && config) {
      const _config = config as typeof config & { _retryCount?: number };
      _config._retryCount = (_config._retryCount || 0) + 1;

      if (_config._retryCount <= 3) {
        await fetchAndStoreCSRF();
        return request(_config);
      }
    }
    return Promise.reject(error);
  },
);

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
    if (error.response?.status === 401 && !isrefreshTokenRequest(_cfg) && !_cfg._retry) {
      // 标记已重试，防止无限循环
      _cfg._retry = true;

      const refreshToken = getRefreshTokenFromStorage();
      if (!refreshToken) {
        return Promise.reject(error);
      }

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
