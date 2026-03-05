import { initCSRF } from "@/utils/csrf";
import axios, { AxiosError } from "axios";
import router from "./router";

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
      // Track retry count on the config object to ensure it persists across retries
      const _config = config as any;
      _config._retryCount = (_config._retryCount || 0) + 1;

      if (_config._retryCount <= 3) {
        await initCSRF();
        return request(config);
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

// // 在Auth头携带token
// request.interceptors.request.use((config) => {
//   const token = sessionStorage.getItem("access_token");
//   if (token && config.headers) {
//     config.headers["Authorization"] = `Bearer ${token}`;
//   }
//   return config;
// });

export default request;
