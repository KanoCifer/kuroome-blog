import axios from 'axios';
import { tokenService } from '../auth/tokenService';

const refreshTokenEndpoint = '/v3/refresh-token';

// 创建独立的axios实例，不使用全局拦截器，避免循环拦截
const refreshRequest = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/',
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

export async function refreshToken(): Promise<void> {
  const res = await refreshRequest.post(refreshTokenEndpoint, undefined, {
    _isRefreshToken: true,
  });
  const accessToken = res.data?.data?.access_token;
  if (accessToken) {
    tokenService.save(accessToken);
  }
}

export function isrefreshTokenRequest(config: {
  _isRefreshToken?: boolean;
}): boolean {
  return !!config._isRefreshToken;
}
