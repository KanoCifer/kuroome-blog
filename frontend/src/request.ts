import axios, { AxiosError } from "axios";
import router from "./router";

// keep latest CSRF token so it can be sent in headers
export let csrfToken: string | null = null;

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
// helper to initialise CSRF token and store the value
export async function fetchAndStoreCSRF() {
  try {
    const res =
      await request.get<ApiResponse<{ csrf_token: string }>>(
        "/auth/csrf-token",
      );
    csrfToken = res.data.data.csrf_token;
  } catch (error) {
    console.error("Failed to initialize CSRF token:", error);
  }
}
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api/v1/",
  timeout: 10000,
  withCredentials: true,
});

// attach CSRF token header automatically when available
request.interceptors.request.use((config) => {
  if (csrfToken && config.headers) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
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
        // first fetch a new token and store it
        await fetchAndStoreCSRF();
        // also attach header directly in case interceptor isn't triggered
        if (_config.headers) {
          _config.headers["X-CSRF-Token"] = csrfToken || "";
        }
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

// // 在Auth头携带token
// request.interceptors.request.use((config) => {
//   const token = sessionStorage.getItem("access_token");
//   if (token && config.headers) {
//     config.headers["Authorization"] = `Bearer ${token}`;
//   }
//   return config;
// });

export default request;
