import axios, { type CreateAxiosDefaults, type InternalAxiosRequestConfig } from 'axios';
import { setAccessToken } from '@/auth/tokenService';

const refreshTokenEndpoint = 'v1/auth/refresh-token';

interface RefreshAxiosDefaults extends CreateAxiosDefaults {
  _isRefreshToken?: boolean;
}

interface RefreshRequestConfig extends InternalAxiosRequestConfig {
  _isRefreshToken?: boolean;
}

// 创建独立的axios实例，不使用全局拦截器，避免循环拦截
const refreshRequest = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000,
  withCredentials: true,
} as RefreshAxiosDefaults);

(refreshRequest.defaults as RefreshAxiosDefaults)._isRefreshToken = false;

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
  const res = await refreshRequest.get(refreshTokenEndpoint, {
    _isRefreshToken: true,
  } as RefreshRequestConfig);
  const accessToken = res.data?.data?.access_token;
  if (accessToken) {
    setAccessToken(accessToken);
  }
}

export function isrefreshTokenRequest(config: {
  _isRefreshToken?: boolean;
}): boolean {
  return !!config._isRefreshToken;
}
