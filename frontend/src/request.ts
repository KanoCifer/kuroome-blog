import axios, { AxiosError } from "axios";
import router from "./router";
import { useAuthStore } from "./stores/auth";
import { isrefreshTokenRequest, refreshAccessToken } from "./utils/refresh";
// keep latest CSRF token so it can be sent in headers
let csrfFetchPromise: Promise<void> | null = null;
// 跳转锁，防止多次重复跳转到登录页
const isRedirectingToLogin = false;

export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  message: string;
  data: T;
  code?: number;
  errors?: Record<string, unknown>;
}

const onUnauthorizedCallback: () => void = () => router.push("/login");
export function setOnUnauthorized() {
  onUnauthorizedCallback();
}

export async function fetchAndStoreCSRF() {
  if (csrfFetchPromise) {
    return csrfFetchPromise;
  }

  csrfFetchPromise = (async () => {
    try {
      await request.get<ApiResponse<{ csrf_token: string }>>(
        "/auth/csrf-token",
      );
    } catch (error) {
      console.error("获取 CSRF Token 失败:", error);
      throw error;
    } finally {
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
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
      // increment retry counter (initialize to 0 if missing)
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
    if (
      error.response?.status === 401 &&
      !isrefreshTokenRequest(_cfg) &&
      !_cfg._retry
    ) {
      // 标记已重试，防止无限循环
      _cfg._retry = true;

      // 检查是否有refreshToken，没有的话直接跳转登录页，不需要刷新
      const authStore = useAuthStore();
      const refreshToken = authStore.getRefreshToken();
      console.log("尝试刷新访问令牌，当前 refreshToken:", refreshToken);
      if (!refreshToken) {
        setTimeout(onUnauthorizedCallback, 1000); // 避免重复跳转
        return Promise.reject(error);
      }

      try {
        await refreshAccessToken();
        return request(_cfg);
      } catch (error) {
        console.error("刷新访问令牌失败:", error);
        setTimeout(onUnauthorizedCallback, 1000); // 避免重复跳转
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default request;
