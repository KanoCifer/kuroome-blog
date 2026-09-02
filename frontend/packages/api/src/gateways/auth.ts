import { apiClient, extractData } from '../apiClient';
import type { ApiResponse } from '../types';
import type { UserInfo } from '@readinglist/types';
import type { AxiosResponse } from 'axios';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

// ------------------------------------------------------------------ #
// Types
// ------------------------------------------------------------------ #

interface LoginResponseData {
  id: number;
  username: string;
  is_admin: boolean;
  name?: string;
  email?: string | null;
  gender?: string | null;
  mobile?: string | null;
  photo?: string | null;
  access_token: string;
  refresh_token: string;
  has_passkey: boolean;
  github_bound: boolean;
}

export interface LoginResult {
  user: UserInfo | null;
  accessToken: string;
  refreshToken: string;
  raw: LoginResponseData | undefined;
}

export interface PasskeyLoginResult {
  user: UserInfo | null;
  accessToken: string;
  refreshToken: string;
  raw: LoginResponseData | undefined;
}

/** 邮箱魔法登录 — POST /v3/email/magic-login 的请求体
 *
 * mode 决定邮件里链接落到哪个前端 + 后端 Redis 命名空间：
 *   - "blog" → kanocifer.chat 落地页（web 端魔法登录）
 *   - "nomu" → Chrome 扩展（NoonToolv1）的 options.html#/login/magic
 *
 * 落地页这一侧调用方不感知 mode，gateway 默认填 "blog"；扩展自己在 client.ts
 * 里固定传 "nomu"。后端 DTO 用 binding:"required,oneof=blog nomu" 拦截非法值。
 */
export interface MagicLinkRequestPayload {
  email: string;
  mode: 'blog' | 'nomu';
  /**
   * 仅 nomu 接法 B 用：Nomu 扩展申请魔法登录邮件时生成，后端据此建立
   * 轮询槽位（nomulogin:device:<device_id>），回调确认后扩展侧轮询取登录结果。
   */
  device_id?: string;
}

export interface NomuMagicLinkForwardPayload {
  token: string;
  /**
   * 后端按 mode 决定 consume 端点的返回形态：
   *   - "nomu"：Nomu 接法 B，service 内部把登录结果写到 device 槽位，
   *     handler 返 200；扩展侧轮询 pollNomuLogin 取结果。
   *   - "blog"（兜底）：handler 写 refresh cookie + 返 LoginResult。
   *
   * 必传且必须为 "nomu" — 路由 /nomu/magic-login 只为 nomu 用，
   * 后端会用 oneof=blog|nomu 拦截。
   */
  mode: 'nomu';
}

/** Nomu 轮询槽位内容（与后端 service.NomuLoginState 的 JSON 字段对齐）。 */
export interface NomuLoginState {
  status: 'pending' | 'done' | 'error';
  access_token?: string;
  refresh_token?: string;
  user?: UserInfo | null;
  error?: string;
}

function buildLoginResult(data: LoginResponseData): LoginResult {
  const { access_token, refresh_token, ...userFields } = data;
  return {
    user: userFields as UserInfo,
    accessToken: access_token,
    refreshToken: refresh_token,
    raw: data,
  };
}

function emptyLoginResult(): LoginResult {
  return { user: null, accessToken: '', refreshToken: '', raw: undefined };
}

// ------------------------------------------------------------------ //
// Static gateway — registration, profile, passkey management
// ------------------------------------------------------------------ #

export const authGateway = {
  uploadAvatar(formData: FormData): Promise<Record<string, unknown>> {
    return apiClient
      .put<ApiResponse<Record<string, unknown>>>('v3/upload-pic', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(extractData);
  },

  getPasskeyRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return apiClient
      .get<ApiResponse<PublicKeyCredentialCreationOptionsJSON>>(
        'v3/passkey/registration-options',
      )
      .then(extractData);
  },

  registerPasskey(payload: { response: unknown }): Promise<AxiosResponse<unknown>> {
    return apiClient.post('v3/passkey/register', payload);
  },

  deletePasskey(): Promise<AxiosResponse<unknown>> {
    return apiClient.delete('v3/passkey/delete');
  },

  unbindGithub(): Promise<AxiosResponse<unknown>> {
    return apiClient.post('v3/github/unbind');
  },

  updateProfileSettings(payload: {
    name: string;
    username: string;
    gender: string | null;
    email: string | null;
    mobile: string | null;
    password: string | null;
  }): Promise<Record<string, unknown>> {
    return apiClient
      .put<ApiResponse<Record<string, unknown>>>('v1/auth/settings', payload)
      .then(extractData);
  },

  /**
   * 申请注册验证码邮件。mode 决定 HTML 模板 + redis 命名空间：
   *   - 'blog'（默认，省略即走 blog）：kanocifer.chat 落地页注册
   *   - 'nomu'：NoonToolv1 Chrome 扩展注册，邮件带 logo + 副标
   * 缺省 / 非法值后端走 blog 兜底。
   */
  sendRegisterEmailCode(
    payload: { email: string; mode?: 'blog' | 'nomu' },
  ): Promise<AxiosResponse<unknown>> {
    return apiClient.post('v1/auth/email/code', payload);
  },

  register(payload: {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    email_code: string;
    mode?: 'blog' | 'nomu';
  }): Promise<AxiosResponse<unknown>> {
    return apiClient.post('v1/auth/register', payload);
  },

  /**
   * 申请魔法登录邮件。永远返回 200（防 enumeration）；前端不要根据响应判断邮箱是否注册。
   * 仅当邮箱格式非法、mode 字段缺失或非 blog/nomu 时返回 400。
   */
  requestMagicLink(payload: MagicLinkRequestPayload): Promise<ApiResponse<null>> {
    return apiClient
      .post<ApiResponse<null>>('v3/email/magic-login', payload)
      .then((res) => res.data);
  },

  /**
   * 用邮件里的 token 完成登录。
   * 成功返回登录用户字典 + access_token；refresh_token 由后端通过 HttpOnly cookie 写入。
   *
   * mode 决定后端返回形态（路由统一为 POST /v3/magic-login/consume）：
   *   - "blog"（默认）：handler 写 refresh cookie + 返 LoginResult；
   *   - "nomu"：service 内部把结果写到 device 槽位，handler 返 null。
   *
   * 缺省走 blog 兜底；dynamic gateway 同名方法保持同样形态。
   */
  consumeMagicLink(payload: {
    token: string;
    mode?: 'blog' | 'nomu';
  }): Promise<LoginResult | null> {
    return apiClient
      .post<ApiResponse<LoginResponseData | null>>('v3/magic-login/consume', payload)
      .then((res) => {
        const data = extractData(res);
        if (!data) return null;
        return buildLoginResult(data as LoginResponseData);
      });
  },

  /**
   * Nomu 无密码登录回调 — 把邮件回调收到的 token 转发给后端。
   * 后端确认后把登录结果写回 device_id 槽位（nomulogin:device:<device_id>），
   * Nomu 扩展侧轮询 pollNomuLogin 取最终登录结果。
   *
   * 路由 POST /v3/nomu/magic-login（与 /magic-login/consume 同 handler，
   * 按 mode 字段分支）；payload.mode 必须为 "nomu"。
   */
  forwardNomuMagicLink(payload: NomuMagicLinkForwardPayload): Promise<ApiResponse<null>> {
    return apiClient
      .post<ApiResponse<null>>('v3/nomu/magic-login', payload)
      .then((res) => res.data);
  },

  /**
   * Nomu 扩展侧轮询 device_id 取最终登录结果。
   * 槽位缺失 / 尚未确认时后端返回 401（等价 pending），扩展侧应继续轮询。
   */
  pollNomuLogin(device_id: string): Promise<ApiResponse<NomuLoginState>> {
    return apiClient
      .get<ApiResponse<NomuLoginState>>(`v3/nomu/login/${device_id}`)
      .then((res) => res.data);
  },
};

// ------------------------------------------------------------------ //
// Dynamic gateway — login, logout, passkey auth, user fetch
// ------------------------------------------------------------------ #

export interface AuthGateway {
  fetchUser: () => Promise<UserInfo | null>;
  getPasskeyAuthenticationOptions: () => Promise<PublicKeyCredentialRequestOptionsJSON>;
  login: (username: string, password: string) => Promise<LoginResult>;
  loginWithPasskey: (assertion: unknown) => Promise<PasskeyLoginResult>;
  consumeMagicLink: (payload: {
    token: string;
    mode?: 'blog' | 'nomu';
  }) => Promise<LoginResult | null>;
  logout: () => Promise<void>;
  loginWithGitHub: () => void;
}

export function createAuthGateway(): AuthGateway {
  return {
    async fetchUser(): Promise<UserInfo | null> {
      const res = await apiClient.get<ApiResponse<UserInfo | null>>('v3/me');
      return res.data.data || null;
    },

    async getPasskeyAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
      const res = await apiClient.get<ApiResponse<PublicKeyCredentialRequestOptionsJSON>>(
        'v3/passkey/authentication-options',
      );
      return res.data.data;
    },

    async login(username: string, password: string): Promise<LoginResult> {
      const res = await apiClient.post<ApiResponse<LoginResponseData>>('v3/login', {
        username,
        password,
      });
      const data = extractData(res);
      return data ? buildLoginResult(data as LoginResponseData) : emptyLoginResult();
    },

    async loginWithPasskey(assertion: unknown): Promise<PasskeyLoginResult> {
      const res = await apiClient.post<ApiResponse<LoginResponseData>>(
        'v3/passkey/authenticate',
        { assertion },
      );
      const data = extractData(res);
      return data ? buildLoginResult(data as LoginResponseData) : emptyLoginResult();
    },

    async consumeMagicLink(payload: {
      token: string;
      mode?: 'blog' | 'nomu';
    }): Promise<LoginResult | null> {
      const res = await apiClient.post<ApiResponse<LoginResponseData | null>>(
        'v3/magic-login/consume',
        payload,
      );
      const data = extractData(res);
      if (!data) return null;
      return buildLoginResult(data as LoginResponseData);
    },

    async logout(): Promise<void> {
      await apiClient.post('v3/logout');
    },

    loginWithGitHub(): void {
      window.location.href = '/v3/auth/github';
    },
  };
}
