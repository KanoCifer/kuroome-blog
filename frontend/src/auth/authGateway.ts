import { fetchAndStoreCSRF } from "@/api/csrf";
import request from "@/api/request";
import type { UserInfo } from "@/auth/types";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

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
  initCSRF: () => Promise<void>;
  getPasskeyAuthenticationOptions: () => Promise<PublicKeyCredentialRequestOptionsJSON>;
  login: (username: string, password: string, rememberMe: boolean) => Promise<LoginResult>;
  loginWithPasskey: (assertion: unknown) => Promise<PasskeyLoginResult>;
  logout: () => Promise<void>;
  loginWithGitHub: () => void;
}

function unwrapEnvelope<T>(res: { data: ApiResponse<T> }): T | undefined {
  return res.data.data;
}

function buildLoginResult(data: LoginResponseData): LoginResult {
  const { refresh_token, ...userFields } = data;
  return {
    user: userFields as UserInfo,
    refreshToken: refresh_token,
    raw: data,
  };
}

function emptyLoginResult(): LoginResult {
  return { user: null, refreshToken: "", raw: undefined };
}

export function createAuthGateway(): AuthGateway {
  return {
    async fetchUser(): Promise<UserInfo | null> {
      const res = await request.get<ApiResponse<UserInfo | null>>("v1/auth/me");
      return res.data.data || null;
    },

    async initCSRF(): Promise<void> {
      await fetchAndStoreCSRF();
    },

    async getPasskeyAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
      const res = await request.get<ApiResponse<PublicKeyCredentialRequestOptionsJSON>>(
        "v1/auth/passkey/authentication-options",
      );
      return res.data.data;
    },

    async login(username: string, password: string, rememberMe: boolean): Promise<LoginResult> {
      const res = await request.post<ApiResponse<LoginResponseData>>("v1/auth/login", {
        username: username,
        password: password,
        remember_me: rememberMe,
      });

      const data = unwrapEnvelope(res);
      return data ? buildLoginResult(data) : emptyLoginResult();
    },

    async loginWithPasskey(assertion: unknown): Promise<PasskeyLoginResult> {
      const res = await request.post<ApiResponse<LoginResponseData>>("v1/auth/passkey/authenticate", {
        assertion: assertion,
      });

      const data = unwrapEnvelope(res);
      return data ? buildLoginResult(data) : emptyLoginResult();
    },

    async logout(): Promise<void> {
      await request.post("v1/auth/logout");
    },

    loginWithGitHub(): void {
      window.location.href = "/api/v1/auth/github";
    },
  };
}
