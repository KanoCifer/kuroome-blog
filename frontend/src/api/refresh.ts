import axios from 'axios';

const refreshTokenEndpoint = 'v1/auth/refresh-token';

// 创建独立的axios实例，不使用全局拦截器，避免循环拦截
const refreshRequest = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
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
  // refresh_token 从 cookie 自动发送（带 domain），后端从 cookie 读取
  await refreshRequest.get(refreshTokenEndpoint, {
    _isRefreshToken: true,
  });
}

export function isrefreshTokenRequest(config: {
  _isRefreshToken?: boolean;
}): boolean {
  return !!config._isRefreshToken;
}
