import request from '@/api/request';
import type { UserInfo } from '@/auth/types';
import type { AxiosResponse } from 'axios';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

// ------------------------------------------------------------------ #
// Types
// ------------------------------------------------------------------ #

/** Backend API response envelope — every endpoint returns { message, data } */
interface ApiResponse<T> {
  message: string;
  data: T | null;
}

interface Envelope<T> {
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
  access_token: string;
  has_passkey: boolean;
  github_bound: boolean;
}

export interface LoginResult {
  user: UserInfo | null;
  raw: LoginResponseData | undefined;
  accessToken: string;
}

export interface PasskeyLoginResult {
  user: UserInfo | null;
  raw: LoginResponseData | undefined;
  accessToken: string;
}

// ------------------------------------------------------------------ #
// Helpers
// ------------------------------------------------------------------ #

function unwrapEnvelope<T>(res: { data: Envelope<T> }): T | undefined {
  return res.data.data;
}

function buildLoginResult(data: LoginResponseData): LoginResult {
  const { ...userFields } = data;
  return {
    user: userFields as UserInfo,
    raw: data,
    accessToken: data.access_token,
  };
}

function emptyLoginResult(): LoginResult {
  return { user: null, raw: undefined, accessToken: '' };
}

// ------------------------------------------------------------------ #
// Static gateway — registration, profile, passkey management
// ------------------------------------------------------------------ #

export const authGateway = {
  uploadAvatar(
    formData: FormData,
  ): Promise<AxiosResponse<ApiResponse<Record<string, unknown>>>> {
    return request.put('v1/auth/upload-pic', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getPasskeyRegistrationOptions(): Promise<
    AxiosResponse<ApiResponse<PublicKeyCredentialCreationOptionsJSON>>
  > {
    return request.get('v1/auth/passkey/registration-options');
  },

  registerPasskey(payload: { response: unknown }): Promise<AxiosResponse<unknown>> {
    return request.post('v1/auth/passkey/register', payload);
  },

  deletePasskey(): Promise<AxiosResponse<unknown>> {
    return request.delete('v1/auth/passkey/delete');
  },

  unbindGithub(): Promise<AxiosResponse<unknown>> {
    return request.post('v1/auth/github/unbind');
  },

  updateProfileSettings(payload: {
    name: string;
    username: string;
    gender: string | null;
    email: string | null;
    mobile: string | null;
    password: string | null;
  }): Promise<AxiosResponse<ApiResponse<Record<string, unknown>>>> {
    return request.put('v1/auth/settings', payload);
  },

  sendRegisterEmailCode(payload: {
    email: string;
  }): Promise<AxiosResponse<unknown>> {
    return request.post('v1/auth/email/code', payload);
  },

  register(payload: {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    email_code: string;
  }): Promise<AxiosResponse<unknown>> {
    return request.post('v1/auth/register', payload);
  },
};

// ------------------------------------------------------------------ #
// Dynamic gateway — login, logout, passkey auth, user fetch
// ------------------------------------------------------------------ #

export interface AuthGateway {
  fetchUser: () => Promise<UserInfo | null>;
  getPasskeyAuthenticationOptions: () => Promise<PublicKeyCredentialRequestOptionsJSON>;
  login: (
    username: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<LoginResult>;
  loginWithPasskey: (assertion: unknown) => Promise<PasskeyLoginResult>;
  logout: () => Promise<void>;
  loginWithGitHub: () => void;
}

export function createAuthGateway(): AuthGateway {
  return {
    async fetchUser(): Promise<UserInfo | null> {
      const res = await request.get<Envelope<UserInfo | null>>('v1/auth/me');
      return res.data.data || null;
    },

    async getPasskeyAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
      const res = await request.get<
        Envelope<PublicKeyCredentialRequestOptionsJSON>
      >('v1/auth/passkey/authentication-options');
      return res.data.data;
    },

    async login(
      username: string,
      password: string,
      rememberMe: boolean,
    ): Promise<LoginResult> {
      const res = await request.post<Envelope<LoginResponseData>>(
        'v1/auth/login',
        { username, password, remember_me: rememberMe },
      );
      const data = unwrapEnvelope(res);
      return data ? buildLoginResult(data) : emptyLoginResult();
    },

    async loginWithPasskey(assertion: unknown): Promise<PasskeyLoginResult> {
      const res = await request.post<Envelope<LoginResponseData>>(
        'v1/auth/passkey/authenticate',
        { assertion },
      );
      const data = unwrapEnvelope(res);
      return data ? buildLoginResult(data) : emptyLoginResult();
    },

    async logout(): Promise<void> {
      await request.post('v1/auth/logout');
    },

    loginWithGitHub(): void {
      window.location.href = '/api/v1/auth/github';
    },
  };
}
