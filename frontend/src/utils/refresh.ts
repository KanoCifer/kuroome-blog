import { useAuthStore } from "@/stores/auth";
import axios from "axios";

const refreshTokenEndpoint = "/auth/refresh-token";

// 创建独立的axios实例，不使用全局拦截器，避免循环拦截
const refreshRequest = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api/v1/",
  timeout: 10000,
  withCredentials: true,
  _isRefreshToken: false, // 标记这是刷新token的请求
});

let promise: Promise<void> | null = null;
export async function refreshAccessToken() {
  if (promise) {
    return promise;
  }
  promise = (async () => {
    try {
      await refreshToken();
    } finally {
      promise = null;
    }
  })();
  return promise;
}

export async function refreshToken() {
  const refreshToken = useAuthStore().getRefreshToken();

  // 如果没有refreshToken，直接抛出错误，不需要请求
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const res = await refreshRequest.get(refreshTokenEndpoint, {
    headers: {
      refresh_token: refreshToken,
    },
    _isRefreshToken: true,
  });

  const newRefreshToken = res.data.data.refresh_token;
  useAuthStore().saveRefreshToken(newRefreshToken);
}

export function isrefreshTokenRequest(config: {
  _isRefreshToken?: boolean;
}): boolean {
  return !!config._isRefreshToken;
}
