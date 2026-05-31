import axios from 'axios';

interface CSRFTokenResponse {
  data?: {
    csrf_token?: string;
  };
}

const csrfRequest = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000,
  withCredentials: true,
});

let csrfFetchPromise: Promise<void> | null = null;

export async function fetchAndStoreCSRF(): Promise<void> {
  if (csrfFetchPromise) {
    return csrfFetchPromise;
  }

  csrfFetchPromise = (async () => {
    try {
      await csrfRequest.get<CSRFTokenResponse>('v1/auth/csrf-token');
    } catch (error) {
      console.error('获取 CSRF Token 失败:', error);
      throw error;
    } finally {
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
}
