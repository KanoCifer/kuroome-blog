import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import router from "./router";

// keep latest CSRF token so it can be sent in headers
let csrfFetchPromise: Promise<void> | null = null;
// 刷新token相关变量
let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  message: string;
  data: T;
  code?: number;
  errors?: Record<string, unknown>;
}

let onUnauthorizedCallback: () => void = () => router.push("/login"); // 默认未授权时跳转到登录页

export function setOnUnauthorized(callback: () => void) {
  onUnauthorizedCallback = callback;
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
    const config = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // 如果是401错误且不是刷新token的请求，且没有重试过
    if (error.response?.status === 401 && config.url !== "/auth/refresh-token" && !config._retry) {
      if (isRefreshing) {
        // 如果正在刷新，将请求加入队列
        return new Promise((resolve) => {
          refreshQueue.push(() => {
            resolve(request(config));
          });
        });
      }

      config._retry = true;
      isRefreshing = true;

      try {
        // 尝试刷新token
        await request.post("/auth/refresh-token");
        // 刷新成功，重试所有队列中的请求
        refreshQueue.forEach((callback) => callback());
        refreshQueue = [];
        // 重试当前请求
        return request(config);
      } catch (refreshError) {
        // 刷新失败，清空队列，跳转到登录页
        refreshQueue = [];
        onUnauthorizedCallback?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 如果是刷新token的请求返回401，或者已经重试过，直接跳转到登录页
    if (error.response?.status === 401 && (config.url === "/auth/refresh-token" || config._retry)) {
      onUnauthorizedCallback?.();
      return Promise.reject(error);
    }

    const message: string =
      error.response?.data?.message || error.message || "请求失败，请稍后重试";
    return Promise.reject(new Error(message));
  },
);

export default request;
