import axios, { AxiosError } from "axios";
import router from "./router";

// keep latest CSRF token so it can be sent in headers
let csrfFetchPromise: Promise<void> | null = null;

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

request.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      onUnauthorizedCallback?.();
      return Promise.reject();
    }

    const message: string =
      error.response?.data?.message || error.message || "请求失败，请稍后重试";
    return Promise.reject(new Error(message));
  },
);

export default request;
