import { fetchAndStoreCSRF } from '@/api/csrf';
import request from '@/api/request';
import type { UserInfo } from '@/auth/types';
import { useNotificationStore } from '@/stores/notificationState';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';

const notification = useNotificationStore.getState();

interface ApiResponse<T> {
  data: T;
}

interface LoginResponseData {
  id: number;
  username: string;
  is_admin: boolean;
  name?: string;
  email?: string | null;
  gender?: string | null;
  mobile?: string | null;
  photo?: string | null;
  refresh_token: string;
  has_passkey: boolean;
  github_bound: boolean;
}

export interface LoginResult {
  user: UserInfo | null;
  refreshToken: string;
  raw: LoginResponseData | undefined;
}

export interface PasskeyLoginResult {
  user: UserInfo | null;
  refreshToken: string;
  raw: LoginResponseData | undefined;
}

export interface AuthGateway {
  fetchUser: () => Promise<UserInfo | null>;
  fetchAdminStatus: () => Promise<1 | 0>;
  initCSRF: () => Promise<void>;
  getPasskeyAuthenticationOptions: () => Promise<PublicKeyCredentialRequestOptionsJSON>;
  login: (
    username: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<LoginResult>;
  loginWithPasskey: (assertion: unknown) => Promise<PasskeyLoginResult>;
  loginWithGitHub: () => void;
  logout: () => Promise<void>;
  postHeartbeat: () => Promise<void>;
}

// 辅助方法
const extractData = (res: { data: ApiResponse<unknown> }): unknown => {
  return res.data.data;
};

const buildLoginResult = (data: LoginResponseData): LoginResult => {
  const { refresh_token, ...userFields } = data;
  return {
    user: userFields as UserInfo,
    refreshToken: refresh_token,
    raw: data,
  };
};
const emptyLoginResult = (): LoginResult => {
  return { user: null, refreshToken: '', raw: undefined };
};

export function createAuthGateway(): AuthGateway {
  return {
    async fetchUser(): Promise<UserInfo | null> {
      const res = await request.get<ApiResponse<UserInfo | null>>('v1/auth/me');
      return res.data.data || null;
    },

    async fetchAdminStatus(): Promise<1 | 0> {
      const res = await request.get<ApiResponse<{ admin_online: 1 | 0 }>>(
        'v1/auth/status-of-admin',
      );
      return res.data.data.admin_online;
    },

    async initCSRF(): Promise<void> {
      await fetchAndStoreCSRF();
    },

    async getPasskeyAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
      const res = await request.get<
        ApiResponse<PublicKeyCredentialRequestOptionsJSON>
      >('v1/auth/passkey/authentication-options');
      return res.data.data;
    },

    async login(
      username: string,
      password: string,
      rememberMe: boolean,
    ): Promise<LoginResult> {
      const res = await request.post<ApiResponse<LoginResponseData>>(
        'v1/auth/login',
        {
          username: username,
          password: password,
          remember_me: rememberMe,
        },
      );
      if (!res.data.data) {
        notification.error('登录失败，请检查用户名和密码');
        return emptyLoginResult();
      }

      const data = extractData(res);
      if (!data) {
        notification.error('登录失败，请检查用户名和密码');
        return emptyLoginResult();
      }

      notification.success('登录成功');
      return buildLoginResult(data as LoginResponseData);
    },

    async loginWithPasskey(assertion: unknown): Promise<PasskeyLoginResult> {
      const res = await request.post<ApiResponse<LoginResponseData>>(
        'v1/auth/passkey/authenticate',
        {
          assertion: assertion,
        },
      );

      const data = extractData(res);
      if (!data) {
        notification.error('Passkey 登录失败，请重试');
        return emptyLoginResult();
      }

      notification.success('登录成功');
      return buildLoginResult(data as LoginResponseData);
    },

    async logout(): Promise<void> {
      await request.post('/v1/auth/logout');
      notification.success('已退出登录');
    },

    async postHeartbeat(): Promise<void> {
      await request.post('v1/auth/heartbeat');
    },

    loginWithGitHub(): void {
      window.location.href = '/api/v1/auth/github';
    },
  };
}
